import { execSync } from "child_process";
import * as http from "http";
import * as https from "https";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { visualizer } from "rollup-plugin-visualizer";
import { ConfigEnv, defineConfig, loadEnv, PluginOption, UserConfig } from "vite";
import viteCompression from "vite-plugin-compression";
import eslintPlugin from "vite-plugin-eslint";
import { createHtmlPlugin } from "vite-plugin-html";
import { createStyleImportPlugin } from "vite-plugin-style-import";
import { createSvgIconsPlugin } from "vite-plugin-svg-icons";

import { wrapperEnv } from "./src/utils/getEnv";

const DEFAULT_BACKEND_ORIGIN = "http://127.0.0.1:8080";
const BACKEND_PROBE_PATHS = ["/api/admin/probe", "/api/admin/isLogined"];
const BACKEND_PROBE_SIGNATURE = "paicoding-port-for-admin";
const BACKEND_PROBE_TIMEOUT = 1200;
const WELL_KNOWN_BACKEND_PORTS = [8080, 9201, 8081, 8082, 8083, 8084, 8090, 8888, 9999];

function normalizeLocalOrigin(value?: string) {
	if (!value) return "";

	try {
		const url = new URL(value);
		if (!["127.0.0.1", "localhost", "0.0.0.0"].includes(url.hostname)) return "";

		const hostname = url.hostname === "0.0.0.0" ? "127.0.0.1" : url.hostname;
		return `${url.protocol}//${hostname}${url.port ? `:${url.port}` : ""}`;
	} catch {
		return "";
	}
}

function getListeningPorts() {
	try {
		const output = execSync("lsof -nP -iTCP -sTCP:LISTEN", {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"]
		});
		const javaPorts: number[] = [];
		const otherPorts: number[] = [];

		output
			.split("\n")
			.slice(1)
			.forEach(line => {
				const trimmedLine = line.trim();
				if (!trimmedLine) return;

				const matchedPort = trimmedLine.match(/:(\d+)\s+\(LISTEN\)$/);
				if (!matchedPort) return;

				const port = Number(matchedPort[1]);
				if (!Number.isInteger(port)) return;

				const command = trimmedLine.split(/\s+/)[0]?.toLowerCase();
				if (command === "java") {
					javaPorts.push(port);
					return;
				}

				otherPorts.push(port);
			});

		return [...new Set([...javaPorts, ...otherPorts])];
	} catch {
		return [];
	}
}

function parseProbeResponse(body: string, fallbackOrigin: string) {
	try {
		const payload = JSON.parse(body);
		if (
			payload?.status?.code === 0 &&
			payload?.result?.signature === BACKEND_PROBE_SIGNATURE &&
			payload?.result?.app === "paicoding" &&
			payload?.result?.module === "admin"
		) {
			return normalizeLocalOrigin(payload?.result?.host) || fallbackOrigin;
		}

		if (payload?.status?.code === 0 && typeof payload?.result === "boolean") {
			return fallbackOrigin;
		}
	} catch {
		return "";
	}

	return "";
}

function requestProbe(url: URL, fallbackOrigin: string): Promise<string> {
	const requestClient = url.protocol === "https:" ? https : http;

	return new Promise(resolve => {
		let settled = false;
		const finish = (matchedOrigin: string) => {
			if (settled) return;
			settled = true;
			resolve(matchedOrigin);
		};

		const req = requestClient.request(
			url,
			{
				method: "GET",
				timeout: BACKEND_PROBE_TIMEOUT,
				headers: {
					Accept: "application/json"
				}
			},
			res => {
				let body = "";

				res.setEncoding("utf8");
				res.on("data", chunk => {
					if (body.length < 4096) {
						body += chunk;
					}
				});
				res.on("end", () => {
					finish(parseProbeResponse(body, fallbackOrigin));
				});
			}
		);

		req.on("timeout", () => {
			req.destroy();
			finish("");
		});
		req.on("error", () => finish(""));
		req.end();
	});
}

async function probeBackendOrigin(origin: string) {
	for (const probePath of BACKEND_PROBE_PATHS) {
		const matchedOrigin = await requestProbe(new URL(probePath, origin), origin);
		if (matchedOrigin) {
			return matchedOrigin;
		}
	}

	return "";
}

async function resolveBackendOrigin(configuredDomain: string) {
	const configuredOrigin = normalizeLocalOrigin(configuredDomain);
	const candidateOrigins = new Set<string>();

	if (configuredOrigin) {
		candidateOrigins.add(configuredOrigin);
	}

	getListeningPorts().forEach(port => {
		candidateOrigins.add(`http://127.0.0.1:${port}`);
	});
	WELL_KNOWN_BACKEND_PORTS.forEach(port => {
		candidateOrigins.add(`http://127.0.0.1:${port}`);
	});
	candidateOrigins.add(DEFAULT_BACKEND_ORIGIN);

	for (const origin of candidateOrigins) {
		const matchedOrigin = await probeBackendOrigin(origin);
		if (matchedOrigin) {
			return matchedOrigin;
		}
	}

	return configuredOrigin || DEFAULT_BACKEND_ORIGIN;
}

// @see: https://vitejs.dev/config/
/** @type {import('vite').UserConfig} */
export default defineConfig(async (mode: ConfigEnv): Promise<UserConfig> => {
	const env = loadEnv(mode.mode, process.cwd());
	const viteEnv = wrapperEnv(env);
	const shouldAutoDiscoverBackend = ["development", "test"].includes(mode.mode) && viteEnv.VITE_API_URL.startsWith("/");
	const configuredDomain = viteEnv.VITE_DOMAIN;
	const backendOrigin = shouldAutoDiscoverBackend ? await resolveBackendOrigin(configuredDomain) : configuredDomain;

	if (shouldAutoDiscoverBackend) {
		viteEnv.VITE_DOMAIN = backendOrigin;
		console.info(`[vite] PaiCoding backend target: ${backendOrigin}`);
	}
	const plugins: PluginOption[] = [
		react(),
		createHtmlPlugin({
			inject: {
				data: {
					title: viteEnv.VITE_GLOB_APP_TITLE
				}
			}
		}),
		createSvgIconsPlugin({
			iconDirs: [resolve(process.cwd(), "src/assets/icons")],
			symbolId: "icon-[dir]-[name]"
		}),
		createStyleImportPlugin({
			libs: [
				{
					libraryName: "antd",
					esModule: true,
					resolveStyle: (name: any) => {
						return `antd/es/${name}/style/index`;
					}
				}
			]
		}),
		eslintPlugin()
	];

	if (viteEnv.VITE_REPORT) {
		plugins.push(visualizer() as unknown as PluginOption);
	}

	if (viteEnv.VITE_BUILD_GZIP) {
		plugins.push(
			viteCompression({
				verbose: true,
				disable: false,
				threshold: 10240,
				algorithm: "gzip",
				ext: ".gz"
			}) as unknown as PluginOption
		);
	}

	return {
		define: shouldAutoDiscoverBackend
			? {
					"import.meta.env.VITE_DOMAIN": JSON.stringify(backendOrigin)
			  }
			: undefined,
		// base: "/",
		// alias config
		resolve: {
			alias: {
				"@": resolve(__dirname, "./src")
			}
		},
		// global css
		css: {
			preprocessorOptions: {
				less: {
					javascriptEnabled: true,
					additionalData: `@import "@/styles/var.less";`
				}
			}
		},
		// server config
		server: {
			host: "127.0.0.1", // 服务器主机名，如果允许外部访问，可设置为"0.0.0.0"
			port: viteEnv.VITE_PORT,
			open: viteEnv.VITE_OPEN,
			cors: true,
			// https: false,
			// 代理跨域（mock 不需要配置，这里只是个示例）
			proxy: {
				"/admin": {
					target: backendOrigin,
					changeOrigin: true,
					rewrite: path => path.replace(/^\/api/, "")
				},
				"/api/admin": {
					target: backendOrigin,
					changeOrigin: true
				}
			}
		},
		plugins,
		esbuild: {
			pure: viteEnv.VITE_DROP_CONSOLE ? ["console.log", "debugger"] : []
		},
		base: "./",
		// build configure
		build: {
			outDir: "dist",
			// esbuild 打包更快，但是不能去除 console.log，去除 console 使用 terser 模式
			minify: "esbuild",
			// minify: "terser",
			// terserOptions: {
			// 	compress: {
			// 		drop_console: viteEnv.VITE_DROP_CONSOLE,
			// 		drop_debugger: true
			// 	}
			// },
			rollupOptions: {
				output: {
					// Static resource classification and packaging
					chunkFileNames: "assets/js/[name]-[hash].js",
					entryFileNames: "assets/js/[name]-[hash].js",
					assetFileNames: "assets/[name]-[hash].[ext]"
				}
			}
		}
	};
});
