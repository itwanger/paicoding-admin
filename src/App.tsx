/* eslint-disable simple-import-sort/imports */
import { HashRouter } from "react-router-dom";
import { ConfigProvider } from "antd";
import zhCN from "antd/lib/locale/zh_CN";

import type { RootState } from "@/rtk";
import { useAppSelector } from "@/hooks/useRTK";
import useTheme from "@/hooks/useTheme";
import Router from "@/routers/index";
import AuthRouter from "@/routers/utils/authRouter";

import "./index.scss";

const App = () => {
	const assemblySize = useAppSelector((state: RootState) => state.global.assemblySize);
	const themeConfig = useAppSelector((state: RootState) => state.global.themeConfig);

	// 全局使用主题
	useTheme(themeConfig);

	return (
		<HashRouter>
			<ConfigProvider componentSize={assemblySize} locale={zhCN}>
				<AuthRouter>
					<Router />
				</AuthRouter>
			</ConfigProvider>
		</HashRouter>
	);
};

export default App;
