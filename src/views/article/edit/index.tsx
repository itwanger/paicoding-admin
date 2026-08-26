/* eslint-disable prettier/prettier */
import { FC, MouseEvent as ReactMouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Moveable, { OnResize, OnResizeEnd } from "react-moveable";
import { connect } from "react-redux";
import { useLocation, useNavigate } from "react-router";
import { CopyOutlined, ReloadOutlined, SwapOutlined } from "@ant-design/icons";
import gemoji from "@bytemd/plugin-gemoji";
import gfm from "@bytemd/plugin-gfm";
import highlight from "@bytemd/plugin-highlight";
import math from "@bytemd/plugin-math";
import { Editor } from "@bytemd/react";
import { Button, Drawer, Form, Input, InputNumber, message, Modal, Progress, Radio, Select, Space, UploadFile } from "antd";
import TextArea from "antd/es/input/TextArea";
import zhHans from "bytemd/locales/zh_Hans.json";
import { throttle } from "lodash";
import mammoth from "mammoth";

import { generateArticleAiApi, generateArticleSlugApi, getArticleApi, saveArticleApi, saveImgApi } from "@/api/modules/article";
import { createVodUploadAuthApi, refreshVodUploadAuthApi, uploadImgApi } from "@/api/modules/common";
import { getTagListApi } from "@/api/modules/tag";
import { ContentInterWrap, ContentWrap } from "@/components/common-wrap";
import { PushStatusEnum, UpdateEnum } from "@/enums/common";
import { MapItem } from "@/typings/common";
import { baseDomain, getCompleteUrl, localGet, localRemove, localSet } from "@/utils/util";
import DebounceSelect from "@/views/article/components/debounceselect/index";
import ImgUpload from "@/views/column/setting/components/imgupload";
import Search from "./search";

import "bytemd/dist/index.css";
import "./index.scss";
import "highlight.js/styles/default.css";
import "juejin-markdown-themes/dist/juejin.css";
import "katex/dist/katex.css";

declare global {
	interface Window {
		OSS?: any;
		AliyunUpload?: any;
	}
}

const ALIYUN_VOD_SCRIPT_PATHS = [
	"/aliyun-vod/lib/es6-promise.min.js",
	"/aliyun-vod/lib/aliyun-oss-sdk-6.17.1.min.js",
	"/aliyun-vod/aliyun-upload-sdk-1.5.7.min.js"
];

const loadScript = (src: string) => {
	return new Promise<void>((resolve, reject) => {
		const existing = document.querySelector(`script[src="${src}"]`);
		if (existing) {
			resolve();
			return;
		}
		const script = document.createElement("script");
		script.src = src;
		script.async = true;
		script.onload = () => resolve();
		script.onerror = () => reject(new Error(`加载脚本失败：${src}`));
		document.body.appendChild(script);
	});
};

const loadAliyunVodSdk = async () => {
	if (window.AliyunUpload && window.OSS) return;
	const host = (baseDomain || "").replace(/\/$/, "");
	for (const path of ALIYUN_VOD_SCRIPT_PATHS) {
		await loadScript(`${host}${path}`);
	}
};

// 自定义插件：为图片添加 alt 标题
const imageAltPlugin = () => ({
	viewerEffect({ markdownBody }: { markdownBody: HTMLElement }) {
		const images = markdownBody.querySelectorAll('img[alt]:not([alt=""])');
		images.forEach((img: Element) => {
			const imgElement = img as HTMLImageElement;
			const alt = imgElement.alt;

			// 检查是否已经添加过标题
			const parent = imgElement.parentElement;
			if (parent && parent.classList.contains("img-with-caption")) {
				return;
			}

			// 创建包装容器
			const wrapper = document.createElement("span");
			wrapper.className = "img-with-caption";

			// 创建标题元素
			const caption = document.createElement("span");
			caption.className = "img-caption";
			caption.textContent = alt;

			// 替换图片
			imgElement.parentNode?.insertBefore(wrapper, imgElement);
			wrapper.appendChild(imgElement);
			wrapper.appendChild(caption);
		});
	}
});

const aliyunVodPreviewPlugin = () => ({
	viewerEffect({ markdownBody }: { markdownBody: HTMLElement }) {
		const links = markdownBody.querySelectorAll<HTMLAnchorElement>('a[href]');
		links.forEach(link => {
			if (link.textContent?.trim() !== "aliyun-vod" || link.dataset.vodRendered === "true") return;
			const videoId = link.getAttribute("href") || "";
			if (!/^[a-zA-Z0-9_-]+$/.test(videoId)) return;

			const prev = link.previousSibling;
			if (!prev || prev.nodeType !== Node.TEXT_NODE || !prev.textContent?.endsWith("@")) return;
			const paragraph = link.parentElement?.tagName === "P" ? link.parentElement : null;
			const standalone = paragraph?.textContent?.trim() === "@aliyun-vod";
			prev.textContent = prev.textContent.slice(0, -1);

			const container = document.createElement("div");
			container.className = "video-container video-container--aliyun-vod";
			const video = document.createElement("video");
			video.src = `/video/play/redirect?videoId=${encodeURIComponent(videoId)}`;
			video.controls = true;
			video.preload = "metadata";
			container.appendChild(video);

			if (standalone && paragraph) {
				paragraph.replaceWith(container);
			} else {
				link.replaceWith(container);
			}
		});
	}
});

// 自定义插件：为图片添加可移动和缩放功能
const imageMoveablePlugin = (
	setTarget: (el: HTMLElement | null) => void,
	onScroll: () => void,
	setContainer: (el: HTMLElement | null) => void,
	getScrollInfo: () => { pos: number; active: boolean; clear: () => void },
	setEditor: (editor: any) => void,
	getImageSizeMap: () => Map<string, { width: number; height: number } | "reset">
) => ({
	editorEffect({ editor }: { editor: any }) {
		setEditor(editor);
	},
	viewerEffect({ markdownBody }: { markdownBody: HTMLElement }) {
		const scrollContainer = markdownBody.parentElement;

		// 1. 应用缓存的图片尺寸
		const sizeMap = getImageSizeMap();
		const images = markdownBody.querySelectorAll("img");

		const resolveUrl = (urlStr: string) => {
			if (!urlStr) return "";
			try {
				const cleanUrl = urlStr.split(/\s+/)[0];
				return new URL(decodeURIComponent(cleanUrl), window.location.origin).href;
			} catch (e) {
				return urlStr;
			}
		};

		images.forEach(img => {
			const src = img.getAttribute("src");
			if (!src) return;
			const fullUrl = resolveUrl(src);
			const state = sizeMap.get(fullUrl);
			if (state === "reset") {
				// 强制清除样式（针对已经在源码中是 <img> 标签的情况）
				img.style.width = "";
				img.style.height = "";
			} else if (state) {
				img.style.width = `${state.width}px`;
				img.style.height = `${state.height}px`;
			}
		});

		// 2. 检查是否需要恢复滚动位置
		const info = getScrollInfo();
		if (info.active && scrollContainer) {
			// 使用 requestAnimationFrame 确保在浏览器下一帧渲染前恢复位置
			// 这能有效拦截 ByteMD 渲染导致的滚动跳动
			requestAnimationFrame(() => {
				scrollContainer.scrollTop = info.pos;
				info.clear();
				// 恢复位置后更新一下控制柄位置
				onScroll();
			});
		}

		const handleClick = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			if (target.tagName === "IMG") {
				e.preventDefault();
				e.stopPropagation();
				setTarget(target);
				// 立即触发一次位置更新，确保控制柄出现
				setTimeout(() => {
					onScroll();
				}, 0);
			} else {
				// 点击预览区其他地方取消选中
				setTarget(null);
			}
		};

		const handleScroll = () => {
			onScroll();
		};

		// ByteMD 预览区的滚动容器通常是 markdownBody 的父元素 .bytemd-preview
		setContainer(scrollContainer);

		markdownBody.addEventListener("click", handleClick);
		if (scrollContainer) {
			scrollContainer.addEventListener("scroll", handleScroll);
		}

		return () => {
			markdownBody.removeEventListener("click", handleClick);
			if (scrollContainer) {
				scrollContainer.removeEventListener("scroll", handleScroll);
			}
		};
	}
});

// 自定义 Moveable Able：将复原按钮集成到控制框中
const RestoreAble = {
	name: "restoreAble",
	always: true,
	render(moveable: any, React: any) {
		const { target, resetImageInMarkdown, replaceImageInMarkdown, copyImageToClipboard } = moveable.props;
		// pos2 是右上角的坐标 [x, y]
		const { pos2 } = moveable.state;

		return (
			<div
				key="restore-button"
				style={{
					position: "absolute",
					left: `${pos2[0]}px`,
					top: `${pos2[1]}px`,
					transform: "translate(-100%, -120%)", // 右侧对齐图片右上角，且位于上方
					zIndex: 10,
					display: "flex",
					gap: "8px"
				}}
			>
				<Button
					size="small"
					type="primary"
					icon={<CopyOutlined />}
					style={{
						fontSize: "12px",
						height: "24px",
						padding: "0 8px",
						boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
						border: "none",
						display: "flex",
						alignItems: "center",
						gap: "4px",
						backgroundColor: "#faad14" // 使用橙色区分复制功能
					}}
					onClick={e => {
						e.stopPropagation();
						copyImageToClipboard(target);
					}}
				>
					复制
				</Button>
				<Button
					size="small"
					type="primary"
					icon={<SwapOutlined />}
					style={{
						fontSize: "12px",
						height: "24px",
						padding: "0 8px",
						boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
						border: "none",
						display: "flex",
						alignItems: "center",
						gap: "4px",
						backgroundColor: "#52c41a" // 使用绿色区分替换功能
					}}
					onClick={e => {
						e.stopPropagation();
						replaceImageInMarkdown(target);
					}}
				>
					替换
				</Button>
				<Button
					size="small"
					type="primary"
					icon={<ReloadOutlined />}
					style={{
						fontSize: "12px",
						height: "24px",
						padding: "0 8px",
						boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
						border: "none",
						display: "flex",
						alignItems: "center",
						gap: "4px"
					}}
					onClick={e => {
						e.stopPropagation();
						resetImageInMarkdown(target);
					}}
				>
					复原
				</Button>
			</div>
		);
	}
} as const;

const plugins = (
	setTarget: (el: HTMLElement | null) => void,
	onScroll: () => void,
	setContainer: (el: HTMLElement | null) => void,
	getScrollInfo: () => { pos: number; active: boolean; clear: () => void },
	setEditor: (editor: any) => void,
	getImageSizeMap: () => Map<string, { width: number; height: number } | "reset">
) => [
	gfm(),
	highlight(),
	gemoji(),
	math(),
	imageAltPlugin(),
	aliyunVodPreviewPlugin(),
	imageMoveablePlugin(setTarget, onScroll, setContainer, getScrollInfo, setEditor, getImageSizeMap)
	// Add more plugins here
];

interface IProps {}

interface TagValue {
	tagId: string;
	tag: string;
}

interface ImageInfo {
	img: string;
	alt: string;
	src: string;
	index: number; // 图片在文本中的位置
}

interface ImportedMarkdownSource {
	fileName: string;
	fileHandle?: any;
}

type AiInitStep = "prepare" | "seo" | "defaults" | "slug" | "apply" | "success" | "error";

interface AiInitProgress {
	step: AiInitStep;
	text: string;
	detail?: string;
	completed: number;
	total: number;
	running: boolean;
	startedAt: number;
	elapsedSeconds: number;
}

export interface IFormType {
	articleId: number; // 文章id
	status: number; // 文章状态
	content: string; // 文章内容
	cover: string; // 封面
	tagIds: number[]; // 标签
	shortTitle: string; // 短标题
	urlSlug: string; // 语义 URL
	readType: number; // 阅读类型
	payWay: string; // 付费方式
	payAmount: number; // 付费金额（元）
	title?: string;
	summary?: string;
	categoryId?: number;
}

const defaultInitForm: IFormType = {
	articleId: 0, // 后台默认为 0
	status: 0,
	content: "",
	cover: "",
	tagIds: [],
	shortTitle: "",
	urlSlug: "",
	readType: 0,
	payWay: "wx_native",
	payAmount: 0.99
};

const ArticleReadTypeList = [
	{ label: "全部可读", value: 0 },
	{ label: "登录阅读", value: 1 },
	{ label: "付费阅读", value: 4 },
	{ label: "星球专享", value: 3 }
];

const PayWayList = [
	{ label: "个人收款码", value: "email" },
	{ label: "统一微信支付", value: "wx_native" }
];

const formatElapsed = (seconds: number) => {
	const min = Math.floor(seconds / 60);
	const sec = seconds % 60;
	return min > 0 ? `${min}分${sec.toString().padStart(2, "0")}秒` : `${sec}秒`;
};

const getApiErrorMessage = (error: any, fallback: string) => {
	const messageText =
		error?.status?.msg ||
		error?.msg ||
		error?.response?.data?.status?.msg ||
		error?.response?.data?.msg ||
		error?.message;
	if (typeof messageText === "string" && messageText.trim()) {
		return messageText.includes("timeout") ? "AI 初始化超时，请稍后重试" : messageText;
	}
	return fallback;
};

const ArticleEdit: FC<IProps> = props => {
	const [formRef] = Form.useForm();
	const selectedReadType = Form.useWatch("readType", formRef) ?? defaultInitForm.readType;
	const selectedPayWay = Form.useWatch("payWay", formRef) ?? defaultInitForm.payWay;

	const [form, setForm] = useState<IFormType>(defaultInitForm);
	const [slugGenerating, setSlugGenerating] = useState<boolean>(false);

	// Moveable target
	const [target, setTarget] = useState<HTMLElement | null>(null);
	const [container, setContainer] = useState<HTMLElement | null>(null);
	const moveableRef = useRef<Moveable>(null);
	const editorRef = useRef<any>(null);
	const editorRootRef = useRef<HTMLDivElement | null>(null);

	// 缓存待提交的图片尺寸变更：Map<fullUrl, {width, height} | 'reset'>
	const imageSizeMapRef = useRef<Map<string, { width: number; height: number } | "reset">>(new Map());

	// 记录滚动位置，防止内容更新时预览区跳回顶部
	const scrollPosRef = useRef<number>(0);
	const isUpdatingContentRef = useRef<boolean>(false);

	// 使用 Ref 存储最新的 update 函数，确保插件闭包能拿到最新逻辑而不触发重绘
	const updateMoveableRef = useRef<() => void>();

	const updateMoveable = useCallback(() => {
		moveableRef.current?.updateRect();
	}, []);

	// 更新 Ref
	useEffect(() => {
		updateMoveableRef.current = updateMoveable;
	}, [updateMoveable]);

	// 封装获取滚动位置的逻辑给插件使用
	const getScrollInfo = useCallback(
		() => ({
			pos: scrollPosRef.current,
			active: isUpdatingContentRef.current,
			clear: () => {
				isUpdatingContentRef.current = false;
			}
		}),
		[]
	);

	const setEditor = useCallback((editor: any) => {
		editorRef.current = editor;
	}, []);

	const getImageSizeMap = useCallback(() => imageSizeMapRef.current, []);

	const collapseEditorSelection = useCallback(() => {
		const editor = editorRef.current;
		if (!editor?.listSelections || !editor?.setCursor) return;

		const selections = editor.listSelections();
		if (!editor.somethingSelected?.() && selections.length <= 1) return;

		const primarySelection = selections[selections.length - 1];
		const cursor = primarySelection?.head || primarySelection?.to?.() || editor.getCursor?.("head") || editor.getCursor?.();
		if (!cursor) return;

		const collapse = () => editor.setCursor(cursor);
		if (editor.operation) {
			editor.operation(collapse);
		} else {
			collapse();
		}
	}, []);

	const clearBrowserSelection = useCallback(() => {
		const selection = window.getSelection?.();
		if (selection && !selection.isCollapsed) {
			selection.removeAllRanges();
		}
	}, []);

	const handleEditorMouseDownCapture = useCallback(
		(event: ReactMouseEvent<HTMLDivElement>) => {
			const targetElement = event.target instanceof HTMLElement ? event.target : null;
			if (!targetElement || targetElement.closest(".bytemd-toolbar")) return;

			clearBrowserSelection();

			if (!targetElement.closest(".CodeMirror")) {
				collapseEditorSelection();
				return;
			}

			if (!event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey) {
				collapseEditorSelection();
			}
		},
		[clearBrowserSelection, collapseEditorSelection]
	);

	useEffect(() => {
		const handleDocumentMouseDown = (event: MouseEvent) => {
			const editorRoot = editorRootRef.current;
			if (editorRoot && event.target instanceof Node && editorRoot.contains(event.target)) return;

			clearBrowserSelection();
			collapseEditorSelection();
		};

		document.addEventListener("mousedown", handleDocumentMouseDown, true);
		return () => {
			document.removeEventListener("mousedown", handleDocumentMouseDown, true);
		};
	}, [clearBrowserSelection, collapseEditorSelection]);

	const editorConfig = useMemo(
		() => ({
			configureMouse: () => ({
				addNew: false
			})
		}),
		[]
	);

	const resolveUrl = useCallback((urlStr: string) => {
		if (!urlStr) return "";
		try {
			const cleanUrl = urlStr.split(/\s+/)[0];
			return new URL(decodeURIComponent(cleanUrl), window.location.origin).href;
		} catch (e) {
			return urlStr;
		}
	}, []);

	// 保持 editorPlugins 绝对稳定，防止编辑器重绘导致 target 丢失
	const editorPlugins = useMemo(() => {
		return plugins(setTarget, () => updateMoveableRef.current?.(), setContainer, getScrollInfo, setEditor, getImageSizeMap);
	}, [getScrollInfo, setEditor, getImageSizeMap]); // 没有任何依赖，只创建一次

	useEffect(() => {
		window.addEventListener("resize", updateMoveable);
		return () => {
			window.removeEventListener("resize", updateMoveable);
		};
	}, [updateMoveable]);

	// 当选中图片目标变化时，立即强制更新一次控制柄位置
	useEffect(() => {
		if (target) {
			const timer = setTimeout(() => {
				updateMoveable();
			}, 50); // 给予足够的渲染缓冲时间
			return () => clearTimeout(timer);
		}
	}, [target, updateMoveable]);

	// 文章内容
	const [content, setContent] = useState<string>("");
	const contentRef = useRef<string>("");
	const hasDraftChangesRef = useRef<boolean>(false);
	const isSavingArticleRef = useRef<boolean>(false);
	const draftBaselineSignatureRef = useRef<string>("");
	const suppressEditorChangeValueRef = useRef<string | null>(null);
	const importedMarkdownSourceRef = useRef<ImportedMarkdownSource | null>(null);
	const [importedMarkdownFileName, setImportedMarkdownFileName] = useState<string>("");
	const [canOverwriteMarkdown, setCanOverwriteMarkdown] = useState<boolean>(false);
	const [aiInitProgress, setAiInitProgress] = useState<AiInitProgress | null>(null);
	const aiInitClearTimerRef = useRef<number>();

	// 抽屉
	const [isOpenDrawerShow, setIsOpenDrawerShow] = useState<boolean>(false);

	// 放图片的路径，和上传时间，30s 内防止重复提交
	const lastUploadTimes = useRef<Map<string, number>>(new Map());

	// 刷新函数
	const [query, setQuery] = useState<number>(0);

	// 定义一个常量，用于封面
	const coverName = "建议 180*100，仅在首页信息流中展示";

	const location = useLocation();
	const navigate = useNavigate();
	// 取出来 articleId 和 status
	// 当前的状态，用于新增还是更新，新增的时候不传递 id，更新的时候传递 id
	const { articleId, status } = location.state || {};

	// 声明一个 coverList，封面
	const [coverList, setCoverList] = useState<UploadFile[]>([]);

	// 自动保存 Key
	const draftKey = useMemo(() => {
		return articleId ? `ARTICLE_DRAFT_${articleId}` : "ARTICLE_DRAFT_NEW";
	}, [articleId]);

	const buildDraftSignature = (data: MapItem) => {
		const normalize = (value: any): any => {
			if (value == null) return "";
			if (Array.isArray(value)) {
				return value.map(item => normalize(item));
			}
			if (typeof value === "object") {
				return Object.keys(value)
					.sort()
					.reduce((result: MapItem, key) => {
						result[key] = normalize(value[key]);
						return result;
					}, {});
			}
			return String(value);
		};

		const draftFields = {
			content: data.content,
			title: data.title,
			shortTitle: data.shortTitle,
			summary: data.summary,
			urlSlug: data.urlSlug,
			cover: data.cover,
			status: data.status,
			readType: data.readType,
			payWay: data.payWay,
			payAmount: data.payAmount,
			categoryId: data.categoryId,
			tagIds: data.tagIds,
			tagName: data.tagName
		};

		return JSON.stringify(normalize(draftFields));
	};

	const hasMeaningfulDraftData = (data: MapItem) => {
		return Boolean(data.content || data.title || data.shortTitle || data.summary || data.cover || data.urlSlug);
	};

	// 自动保存函数 (10s 节流)
	const autoSave = useRef(
		throttle(
			(key: string, data: MapItem) => {
				localSet(key, { ...data, timestamp: Date.now() });
				console.log("自动保存草稿成功", new Date().toLocaleTimeString());
			},
			10000,
			{ leading: false, trailing: true }
		)
	);

	// 监听变化并触发自动保存
	useEffect(() => {
		if (isSavingArticleRef.current) return;

		const currentFormValues = formRef.getFieldsValue();
		const draftData = {
			...form,
			...currentFormValues,
			content
		};

		if (!hasMeaningfulDraftData(draftData)) {
			hasDraftChangesRef.current = false;
			autoSave.current.cancel();
			localRemove(draftKey);
			return;
		}

		const currentSignature = buildDraftSignature(draftData);
		const hasUnsavedChanges = currentSignature !== draftBaselineSignatureRef.current;
		hasDraftChangesRef.current = hasUnsavedChanges;

		if (!hasUnsavedChanges) {
			autoSave.current.cancel();
			localRemove(draftKey);
			return;
		}

		autoSave.current(draftKey, draftData);
	}, [content, form, formRef, draftKey]);

	useEffect(() => {
		return () => {
			if (hasDraftChangesRef.current && !isSavingArticleRef.current) {
				autoSave.current.flush();
			} else {
				autoSave.current.cancel();
			}
		};
	}, []);

	useEffect(() => {
		if (!aiInitProgress?.running) return;

		const timer = window.setInterval(() => {
			setAiInitProgress(prev => {
				if (!prev?.running) return prev;
				return {
					...prev,
					elapsedSeconds: Math.floor((Date.now() - prev.startedAt) / 1000)
				};
			});
		}, 1000);

		return () => window.clearInterval(timer);
	}, [aiInitProgress?.running]);

	useEffect(() => {
		return () => {
			if (aiInitClearTimerRef.current) {
				window.clearTimeout(aiInitClearTimerRef.current);
			}
		};
	}, []);

	// 新建文章时检查草稿
	useEffect(() => {
		if (status === UpdateEnum.Edit) return;

		const draft = localGet(draftKey);
		if (draft) {
			const draftTime = new Date(draft.timestamp).toLocaleString();
			Modal.confirm({
				title: "发现未保存的草稿",
				content: `检测到您在 ${draftTime} 有未保存的内容，是否恢复？`,
				okText: "恢复",
				cancelText: "丢弃",
				onOk: () => {
					hasDraftChangesRef.current = true;
					setContent(draft.content);
					setForm(prev => ({ ...prev, ...draft }));
					formRef.setFieldsValue(draft);
					if (draft.cover) {
						let coverUrl = getCompleteUrl(draft.cover);
						setCoverList([
							{
								uid: "-1",
								name: coverName,
								status: "done",
								thumbUrl: coverUrl,
								url: coverUrl
							}
						]);
					}
					message.success("已恢复草稿");
				},
				onCancel: () => {
					hasDraftChangesRef.current = false;
					localRemove(draftKey);
				}
			});
		}
	}, [draftKey, status, formRef]);

	//@ts-ignore
	const { CategoryTypeList, CategoryType, PushStatusList } = props || {};

	const onSure = useCallback(() => {
		setQuery(prev => prev + 1);
	}, []);

	const handleChange = (item: MapItem, markDraftChanged = true) => {
		if (markDraftChanged) {
			hasDraftChangesRef.current = true;
		}
		// 使用函数式更新，避免多次连续调用时的状态覆盖问题
		setForm(prev => ({ ...prev, ...item }));
	};

	useEffect(() => {
		contentRef.current = content;
	}, [content]);

	const setServerContent = (value?: string) => {
		const nextContent = value || "";
		suppressEditorChangeValueRef.current = nextContent;
		setContent(nextContent);
	};

	const handleFormRefChange = (item: MapItem) => {
		// 当自定义组件更新时，对 formRef 也进行更新
		formRef.setFieldsValue({ ...item });
		handleChange(item);
	};

	const isDraftSameAsServerArticle = (draft: MapItem, article: MapItem) => {
		const normalize = (value: any) => (value == null ? "" : String(value));
		if (normalize(draft?.content) !== normalize(article?.content)) return false;
		return ["title", "shortTitle", "summary", "urlSlug"].every(
			key => !Object.prototype.hasOwnProperty.call(draft || {}, key) || normalize(draft?.[key]) === normalize(article?.[key])
		);
	};

	const normalizeUrlSlug = (value?: string) => (value || "").trim().toLowerCase();

	const isValidUrlSlug = (value: string) => {
		return !value || (/^[a-z0-9][a-z0-9-]*$/.test(value) && !/^[0-9]+$/.test(value));
	};

	const buildUrlSlugFromFileName = (fileName: string) => {
		const prefix = fileName.replace(/\.(md|markdown|txt)$/i, "");
		return normalizeUrlSlug(prefix)
			.replace(/[\s_]+/g, "-")
			.replace(/[^a-z0-9-]/g, "")
			.replace(/-+/g, "-")
			.replace(/^-+|-+$/g, "");
	};

	const handleGenerateUrlSlug = async (source?: { title?: string; shortTitle?: string }, silent = false) => {
		const values = source || formRef.getFieldsValue(["title", "shortTitle"]);
		const title = values.title?.trim();
		const shortTitle = values.shortTitle?.trim();
		if (!title && !shortTitle) {
			if (!silent) message.warning("请先填写标题或短标题");
			return "";
		}

		setSlugGenerating(true);
		try {
			const { result } = await generateArticleSlugApi({ title, shortTitle, articleId: form.articleId || articleId });
			const urlSlug = normalizeUrlSlug(String(result || ""));
			if (!urlSlug) {
				if (!silent) message.warning("没有生成可用的语义 URL");
				return "";
			}
			formRef.setFieldsValue({ urlSlug });
			handleChange({ urlSlug });
			if (!silent) message.success("语义 URL 生成成功");
			return urlSlug;
		} catch (error) {
			console.log("生成语义 URL 失败", error);
			if (!silent) message.error("语义 URL 生成失败");
			return "";
		} finally {
			setSlugGenerating(false);
		}
	};

	// 抽屉关闭
	const handleClose = () => {
		setIsOpenDrawerShow(false);
	};

	// 更新 Markdown 中的图片尺寸 (Lazy Update 策略)
	const updateImageInMarkdown = (imgElement: HTMLImageElement, width: number, height: number) => {
		const src = imgElement.getAttribute("src");
		if (!src) return;

		// 辅助函数：归一化路径
		const resolveUrl = (urlStr: string) => {
			if (!urlStr) return "";
			try {
				const cleanUrl = urlStr.split(/\s+/)[0];
				return new URL(decodeURIComponent(cleanUrl), window.location.origin).href;
			} catch (e) {
				return urlStr;
			}
		};

		const fullUrl = resolveUrl(src);

		// 1. 记录变更到缓存 Map 中，而不触发 content 更新
		imageSizeMapRef.current.set(fullUrl, { width: Math.round(width), height: Math.round(height) });

		// 2. 直接操作 DOM 样式以获得即时视觉反馈
		imgElement.style.width = `${Math.round(width)}px`;
		imgElement.style.height = `${Math.round(height)}px`;

		// 3. 同步 Moveable 控件位置
		updateMoveable();
	};

	// 复原图片尺寸
	const resetImageInMarkdown = (imgElement: HTMLImageElement) => {
		const src = imgElement.getAttribute("src");
		if (!src) return;

		const fullUrl = resolveUrl(src);

		// 1. 在缓存中标记为 'reset'，而不是直接删除，这样批量更新时能知道要还原
		imageSizeMapRef.current.set(fullUrl, "reset");

		// 2. 清除 DOM 样式
		imgElement.style.width = "";
		imgElement.style.height = "";

		// 3. 隐藏 Moveable
		setTarget(null);
		message.success("已重置尺寸（保存后同步到源码）");
	};

	// 替换图片功能 (立即更新策略)
	const replaceImageInMarkdown = (imgElement: HTMLImageElement) => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = "image/*";
		input.onchange = async e => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (!file) return;

			// 限制图片大小
			if (file.size > 5 * 1024 * 1024) {
				message.error("图片大小不能超过 5M");
				return;
			}

			const formData = new FormData();
			formData.append("image", file);

			const hide = message.loading("正在上传新图片...", 0);
			try {
				// 发起上传请求
				const response = await uploadImgApi(formData);
				hide();

				// 这里的 response 已经是拦截器处理后的 data (ResultData)
				const { status, result } = (response as any) || {};

				if (status?.code === 0 && result?.imagePath) {
					const oldSrc = imgElement.getAttribute("src");
					const newSrc = result.imagePath;
					if (!oldSrc) return;

					const oldFullUrl = resolveUrl(oldSrc);
					const alt = imgElement.getAttribute("alt") || "";

					// 记录预览区当前滚动位置（用于预览区同步）
					if (container) {
						scrollPosRef.current = container.scrollTop;
						isUpdatingContentRef.current = true;
					}

					// 策略：优先通过编辑器实例直接分发变更，这能保持光标和滚动位置
					if (editorRef.current) {
						try {
							// 更加鲁棒的内容获取方式
							const state = editorRef.current.state;
							const doc =
								state?.doc?.toString() || (typeof editorRef.current.getValue === "function" ? editorRef.current.getValue() : "");

							if (doc) {
								// 1. 尝试匹配 Markdown 语法 ![alt](src)
								const mdImgRegex = /!\[(.*?)\]\((.*?)\)/g;
								let match;
								let found = false;

								while ((match = mdImgRegex.exec(doc)) !== null) {
									if (resolveUrl(match[2]) === oldFullUrl) {
										const mdAlt = match[1] || alt;
										const replacement = `![${mdAlt}](${newSrc})`;

										// 检查是否支持 CM6 的 dispatch
										if (typeof editorRef.current.dispatch === "function") {
											editorRef.current.dispatch({
												changes: { from: match.index, to: match.index + (match[0]?.length || 0), insert: replacement },
												selection: { anchor: match.index },
												scrollIntoView: true
											});
										} else if (typeof editorRef.current.replaceRange === "function") {
											// 兼容 CM5
											const posFrom = editorRef.current.posFromIndex(match.index);
											const posTo = editorRef.current.posFromIndex(match.index + (match[0]?.length || 0));
											editorRef.current.replaceRange(replacement, posFrom, posTo);
											editorRef.current.setCursor(posFrom);
										}
										found = true;
										break;
									}
								}

								// 2. 如果 Markdown 语法没找到，尝试匹配已有的 HTML <img> 标签
								if (!found) {
									const htmlImgRegex = /<img\s+[^>]*src=["'](.*?)["'][^>]*>/g;
									while ((match = htmlImgRegex.exec(doc)) !== null) {
										if (resolveUrl(match[1]) === oldFullUrl) {
											const altMatch = match[0].match(/alt=["'](.*?)["']/);
											const currentAlt = altMatch ? altMatch[1] : alt;
											const replacement = `<img src="${newSrc}" alt="${currentAlt}" />`;

											if (typeof editorRef.current.dispatch === "function") {
												editorRef.current.dispatch({
													changes: { from: match.index, to: match.index + (match[0]?.length || 0), insert: replacement },
													selection: { anchor: match.index },
													scrollIntoView: true
												});
											} else if (typeof editorRef.current.replaceRange === "function") {
												const posFrom = editorRef.current.posFromIndex(match.index);
												const posTo = editorRef.current.posFromIndex(match.index + (match[0]?.length || 0));
												editorRef.current.replaceRange(replacement, posFrom, posTo);
												editorRef.current.setCursor(posFrom);
											}
											found = true;
											break;
										}
									}
								}

								if (found) {
									// 清除该图片的尺寸缓存
									imageSizeMapRef.current.delete(oldFullUrl);
									message.success("图片替换成功");
									setTarget(null);
									return;
								}
							}
						} catch (editorErr) {
							console.error("Editor direct update failed, falling back to setContent:", editorErr);
						}
					}

					// Fallback: 如果没有编辑器实例或直接更新失败，使用传统的 setContent
					setContent(prevContent => {
						const mdImgRegex = /!\[(.*?)\]\((.*?)\)/g;
						let match;
						let newContent = prevContent;
						let found = false;

						while ((match = mdImgRegex.exec(prevContent)) !== null) {
							if (resolveUrl(match[2]) === oldFullUrl) {
								const mdAlt = match[1] || alt;
								const replacement = `![${mdAlt}](${newSrc})`;
								newContent =
									prevContent.substring(0, match.index) + replacement + prevContent.substring(match.index + match[0].length);
								found = true;
								break;
							}
						}

						if (!found) {
							const htmlImgRegex = /<img\s+[^>]*src=["'](.*?)["'][^>]*>/g;
							while ((match = htmlImgRegex.exec(prevContent)) !== null) {
								if (resolveUrl(match[1]) === oldFullUrl) {
									const altMatch = match[0].match(/alt=["'](.*?)["']/);
									const currentAlt = altMatch ? altMatch[1] : alt;
									const replacement = `<img src="${newSrc}" alt="${currentAlt}" />`;
									newContent =
										prevContent.substring(0, match.index) + replacement + prevContent.substring(match.index + match[0].length);
									found = true;
									break;
								}
							}
						}

						if (newContent !== prevContent) {
							handleChange({ content: newContent });
							imageSizeMapRef.current.delete(oldFullUrl);
							message.success("图片替换成功");
							setTarget(null);
						}
						return newContent;
					});
				} else {
					// status.code !== 0 的情况拦截器已经处理并报错了，这里不需要重复提示
					// 除非拦截器没报错（虽然不太可能）
					if (!status?.msg) {
						message.error("图片上传失败");
					}
				}
			} catch (err: any) {
				hide();
				console.error("Replace image error:", err);
				// 如果拦截器已经报错并拒绝了 Promise，err 会包含 status 对象
				if (err?.status?.msg) {
					// 业务错误，拦截器已提示
				} else {
					message.error("网络错误或上传超时");
				}
			}
		};
		input.click();
	};

	// 复制图片
	const copyImageToClipboard = async (imgElement: HTMLImageElement) => {
		const src = imgElement.getAttribute("src");
		if (!src) return;
		const fullUrl = resolveUrl(src);

		const hide = message.loading("正在处理图片...", 0);

		try {
			// 使用 Canvas 方式将图片转换为 PNG Blob
			// 创建一个 Promise，该 Promise 会解析为图片的 Blob 数据
			const blobPromise = new Promise<Blob>((resolve, reject) => {
				const img = new Image();
				// 关键：设置 crossOrigin 为 Anonymous 以请求跨域访问权限
				img.crossOrigin = "Anonymous";
				// 添加时间戳以避开浏览器缓存，确保获取到最新的 CORS 响应头
				img.src = `${fullUrl}${fullUrl.includes("?") ? "&" : "?"}t=${new Date().getTime()}`;

				img.onload = () => {
					try {
						const canvas = document.createElement("canvas");
						canvas.width = img.naturalWidth;
						canvas.height = img.naturalHeight;
						const ctx = canvas.getContext("2d");
						if (!ctx) {
							reject(new Error("Canvas context failed"));
							return;
						}
						ctx.drawImage(img, 0, 0);
						// 导出为 PNG，这是剪贴板最通用的格式
						canvas.toBlob(b => {
							if (b) resolve(b);
							else reject(new Error("Blob creation failed"));
						}, "image/png");
					} catch (e) {
						reject(e);
					}
				};

				img.onerror = () => {
					reject(new Error("Image load failed (CORS or Network)"));
				};
			});

			try {
				// 尝试 Safari/新版 Chrome 的 Promise 写法
				// 直接将 Promise 传递给 ClipboardItem，确保在用户点击事件中立即调用 write
				// @ts-ignore
				const item = new ClipboardItem({ "image/png": blobPromise });
				await navigator.clipboard.write([item]);
			} catch (e: any) {
				// 兼容性降级：如果浏览器不支持 Promise 构造 (旧版 Chrome/Firefox 会报 TypeError)
				// 尝试等待 Blob 生成后再写入
				console.warn("ClipboardItem Promise approach failed, falling back to Blob...", e);
				const blob = await blobPromise;
				// @ts-ignore
				const item = new ClipboardItem({ "image/png": blob });
				await navigator.clipboard.write([item]);
			}

			hide();
			message.success("图片已复制到剪贴板");
		} catch (err) {
			hide();
			console.error("Copy image failed:", err);

			// 降级处理：如果因为跨域等原因失败，自动回退到复制链接
			try {
				await navigator.clipboard.writeText(fullUrl);
				message.warning({
					content: "因跨域限制无法复制图片数据，已为您复制图片链接",
					duration: 3
				});
			} catch (clipboardErr) {
				// 如果连链接都复制失败（极少见），再弹窗提示
				Modal.error({
					title: "复制图片失败",
					content: (
						<div>
							<p>无法直接复制该图片数据，原因可能是：</p>
							<ol>
								<li>图片服务器未配置 CORS 允许跨域访问（最常见）</li>
								<li>浏览器安全策略限制</li>
							</ol>
							<p>建议：尝试手动右键图片选择&quot;复制图片&quot;。</p>
						</div>
					),
					okText: "知道了"
				});
			}
		}
	};

	const goBack = () => {
		// 跳转到文章列表页
		navigate("/article/list/index");
	};

	// 重置表单
	const resetFrom = () => {
		setForm(defaultInitForm);
		formRef.resetFields();
		setCoverList([]);
	};

	const applyPendingImageSizeChanges = (currentContent: string) => {
		const sizeMap = imageSizeMapRef.current;
		if (sizeMap.size === 0) {
			return currentContent;
		}

		let newContent = currentContent;
		const resolveImageUrl = (urlStr: string) => {
			if (!urlStr) return "";
			try {
				const cleanUrl = urlStr.split(/\s+/)[0];
				return new URL(decodeURIComponent(cleanUrl), window.location.origin).href;
			} catch (e) {
				return urlStr;
			}
		};

		const mdImgRegex = /!\[(.*?)\]\((.*?)\)/g;
		const htmlImgRegex = /<img\s+[^>]*src=["'](.*?)["'][^>]*>/g;

		newContent = newContent.replace(mdImgRegex, (match, alt, src) => {
			const fullUrl = resolveImageUrl(src);
			const state = sizeMap.get(fullUrl);
			if (state && typeof state === "object") {
				return `<img src="${src.split(/\s+/)[0]}" alt="${alt}" width="${state.width}" height="${state.height}" />`;
			}
			return match;
		});

		newContent = newContent.replace(htmlImgRegex, (match, src) => {
			const fullUrl = resolveImageUrl(src);
			const state = sizeMap.get(fullUrl);
			const altMatch = match.match(/alt=["'](.*?)["']/);
			const currentAlt = altMatch ? altMatch[1] : "";

			if (state === "reset") {
				return `![${currentAlt}](${src})`;
			} else if (state && typeof state === "object") {
				return `<img src="${src}" alt="${currentAlt}" width="${state.width}" height="${state.height}" />`;
			}
			return match;
		});

		if (newContent !== currentContent) {
			if (container) {
				scrollPosRef.current = container.scrollTop;
				isUpdatingContentRef.current = true;
			}

			setContent(newContent);
			handleChange({ content: newContent });
			sizeMap.clear();
		}

		return newContent;
	};

	// 保存或者更新
	const handleSaveOrUpdate = async () => {
		// 1. 将缓存的图片尺寸变更批量应用到 Markdown 内容中
		applyPendingImageSizeChanges(content);

		// 2. 弹出抽屉
		setIsOpenDrawerShow(true);
	};

	// 判断图片的链接是否已经上传过了
	const canUpload = (url: string) => {
		// 当前的时间
		const now = Date.now();

		const lastUploadTime = lastUploadTimes.current.get(url);
		// 如果没有上传过，或者上传时间超过了 30s，就返回 false
		if (lastUploadTime && now - lastUploadTime < 30000) {
			return false;
		}
		// 更新上传时间
		lastUploadTimes.current.set(url, now);
		return true;
	};

	// 如果是外网的图片链接，转成内网的图片链接
	const uploadImages = async (newVal: string) => {
		// 正则表达式匹配所有图片
		const reg = /!\[(.*?)\]\((.*?)\)/gm;
		let match;

		// 存储需要上传的图片信息及其上传任务
		interface UploadTask {
			imageInfo: ImageInfo;
			uploadPromise: Promise<any>;
		}
		let uploadTasksWithInfo: UploadTask[] = [];
		let successCount = 0;
		let failedCount = 0;
		let skippedCount = 0;

		while ((match = reg.exec(newVal)) !== null) {
			const [img, alt, src] = match;
			console.log("img, alt, src", match, img, alt, src);

			// 判断是否需要转链:
			// 1. 外链图片 (http/https 开头)
			// 2. 包含 saveError 的失败图片也要重试
			const isExternalImage = src.length > 0 && src.startsWith("http");
			const isFailedImage = src.indexOf("saveError") >= 0;

			if (isExternalImage && !isFailedImage) {
				// 普通外链图片，检查 30 秒防重复
				if (!canUpload(src)) {
					console.log("30秒内防重复提交，忽略:", src);
					skippedCount++;
					continue;
				}

				// 收集图片信息和上传任务，保持一一对应
				const imageInfo: ImageInfo = { img, alt, src, index: match.index };
				uploadTasksWithInfo.push({
					imageInfo,
					uploadPromise: saveImgApi(src)
				});
			} else if (isFailedImage) {
				// 失败的图片，提取原始 URL 并重试
				// URL 格式: https://files.mdnice.com/...?&cause=saveError!
				const originalUrl = src.split("?")[0]; // 去掉 query 参数
				console.log("重试失败的图片:", originalUrl);

				const imageInfo: ImageInfo = { img, alt, src, index: match.index };
				uploadTasksWithInfo.push({
					imageInfo,
					uploadPromise: saveImgApi(originalUrl) // 用原始 URL 重试
				});
			}
		}

		// 如果没有需要上传的图片，直接返回
		if (uploadTasksWithInfo.length === 0) {
			return { newContent: newVal, successCount, failedCount, skippedCount };
		}

		// 同时上传所有图片
		const results = await Promise.all(uploadTasksWithInfo.map(task => task.uploadPromise));

		// 按照图片在文本中的位置倒序排序，从后往前替换，避免索引错位
		const sortedTasks = [...uploadTasksWithInfo].sort((a, b) => b.imageInfo.index - a.imageInfo.index);

		// 替换所有图片链接
		let newContent = newVal;
		sortedTasks.forEach(task => {
			// 找到对应的 result（需要用原始顺序的索引）
			const originalIndex = uploadTasksWithInfo.indexOf(task);
			const result = results[originalIndex];

			if (result.status && result.status.code === 0 && result.result && result.result.imagePath) {
				const newImagePath = result.result.imagePath;

				// 检查返回的路径是否包含 saveError,如果包含说明转链失败
				if (newImagePath.indexOf("saveError") >= 0) {
					console.log("转链失败(返回 saveError) - 原:", task.imageInfo.src);
					console.log("转链失败(返回 saveError) - 返回:", newImagePath);
					failedCount++;
					// 不替换内容,保持原样
				} else {
					// 真正转链成功,替换为新路径
					const newSrc = `![${task.imageInfo.alt}](${newImagePath})`;
					console.log("转链成功 - 原:", task.imageInfo.src);
					console.log("转链成功 - 新:", newImagePath);
					// 从后往前替换，避免影响前面的索引
					newContent = newContent.replace(task.imageInfo.img, newSrc);
					successCount++;
				}
			} else {
				console.log("转链失败(API错误):", task.imageInfo.src, result);
				failedCount++;
			}
		});

		return { newContent, successCount, failedCount, skippedCount };
	};

	const handleReplaceImgUrl = async () => {
		const currentContent = contentRef.current || form.content || "";

		// 检查是否有外链图片或失败的图片需要转换
		const hasExternalImages = /!\[.*?\]\(https?:\/\/.*?\)/.test(currentContent);
		if (!hasExternalImages) {
			message.info("当前内容中没有外链图片需要转换");
			return;
		}

		const result = await uploadImages(currentContent);
		const { newContent, successCount, failedCount, skippedCount } = result;

		// 更新内容
		if (newContent !== currentContent) {
			setContent(newContent);
			handleChange({ content: newContent });
		}

		// 构建详细的反馈消息
		const messages = [];
		if (successCount > 0) {
			messages.push(`成功转链 ${successCount} 张图片`);
		}
		if (failedCount > 0) {
			messages.push(`失败 ${failedCount} 张`);
		}
		if (skippedCount > 0) {
			messages.push(`跳过 ${skippedCount} 张(30秒内已转换)`);
		}

		if (successCount > 0 && failedCount === 0) {
			message.success(messages.join(", "));
		} else if (successCount > 0 && failedCount > 0) {
			message.warning(messages.join(", "));
		} else if (failedCount > 0) {
			message.error(messages.join(", "));
		} else if (skippedCount > 0) {
			message.info("所有外链图片都在 30 秒内已转换过,请稍后再试");
		} else {
			message.info("没有需要转换的图片");
		}
	};

	const sanitizeYuqueMarkdown = (raw: string) => {
		const fixYuqueStrongMarkers = (input: string) => {
			let inCodeBlock = false;

			const fixLine = (line: string) => {
				if (/^\s*\*{3,}\s*$/.test(line)) return line;

				let out = line;

				out = out.replace(/([A-Za-z0-9])\*\*([，,。.!?？；;：:])/g, "$1$2**");

				const openMatch = out.match(/([，,])\*\*/);
				if (openMatch?.index !== undefined) {
					const openIndex = openMatch.index + openMatch[1].length;
					const openEnd = openIndex + 2;

					const minCommaSearchStart = openEnd + 2;
					const commaPos = out.indexOf("，", minCommaSearchStart);
					if (commaPos !== -1) {
						const closeCandidatePos = out.indexOf("**", commaPos + 1);
						if (closeCandidatePos !== -1) {
							const right = out[closeCandidatePos + 2] ?? "";
							if (!right || /[\s\p{P}\p{S}\p{Extended_Pictographic}\p{Emoji_Presentation}]/u.test(right)) {
								out = out.slice(0, closeCandidatePos) + out.slice(closeCandidatePos + 2);
								out = out.slice(0, commaPos) + "**" + out.slice(commaPos);
							}
						}
					}
				}

				out = out.replace(/\*\*([\p{Extended_Pictographic}\p{Emoji_Presentation}\s]+)\*\*/gu, "$1");
				out = out.replace(/\*{4,}/g, "**");

				return out;
			};

			return input
				.split("\n")
				.map(line => {
					const trimmed = line.trimStart();
					if (trimmed.startsWith("```")) {
						inCodeBlock = !inCodeBlock;
						return line;
					}
					if (inCodeBlock) return line;
					return fixLine(line);
				})
				.join("\n");
		};

		let text = raw || "";
		text = text.replace(/^\uFEFF/, "");
		text = text.replace(/\r\n?/g, "\n");
		text = text.replace(/[\u200B-\u200D\uFEFF]/g, "");
		text = text.replace(/<!--[\s\S]*?-->/g, "");
		text = text.replace(/<\/?font\b[^>]*>/gi, "");
		text = fixYuqueStrongMarkers(text);
		text = text.replace(/!\[([^\]]*)\]\(\s*`?\s*([^`)\s]+)\s*`?\s*\)/g, (_m, alt, url) => {
			const safeAlt = String(alt ?? "").trim();
			const safeUrl = String(url ?? "").trim();
			return `![${safeAlt}](${safeUrl})`;
		});
		text = text.replace(/\n{3,}/g, "\n\n");
		return text.trim();
	};

	const normalizeMarkdownLineEndings = (raw: string) => {
		return (raw || "").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
	};

	const buildImportedMarkdownSource = (fileName: string, fileHandle?: any): ImportedMarkdownSource => {
		return {
			fileName,
			fileHandle
		};
	};

	const getMarkdownBodyStartIndex = (raw: string) => {
		let bodyStartIndex = 0;
		const fmMatch = raw.match(/^---[ \t]*\r?\n[\s\S]*?\r?\n[ \t]*---[ \t]*(?:\r?\n|$)/);
		if (fmMatch) {
			bodyStartIndex = fmMatch[0].length;
		}

		const contentAfterFrontMatter = raw.slice(bodyStartIndex);
		const h1Match = contentAfterFrontMatter.match(/^[ \t]*#[ \t]+.+[ \t]*(?:\r?\n|$)/m);
		if (h1Match?.index !== undefined) {
			bodyStartIndex += h1Match.index + h1Match[0].length;
		}

		return bodyStartIndex;
	};

	const buildMarkdownSourceContent = (currentFileContent: string, body: string) => {
		const bodyStartIndex = getMarkdownBodyStartIndex(currentFileContent);
		const prefix = currentFileContent.slice(0, bodyStartIndex);
		const lineEnding = currentFileContent.includes("\r\n") ? "\r\n" : "\n";
		const normalizedBody = (body || "").trim();

		if (!prefix) {
			return `${normalizedBody}${lineEnding}`;
		}

		const separator = /\r?\n$/.test(prefix) ? "" : lineEnding;
		return `${prefix}${separator}${normalizedBody}${lineEnding}`;
	};

	const pickMarkdownFile = async (): Promise<{ file: File; fileHandle?: any } | null> => {
		const showOpenFilePicker = (window as any).showOpenFilePicker;

		if (typeof showOpenFilePicker === "function") {
			try {
				const [fileHandle] = await showOpenFilePicker({
					multiple: false,
					types: [
						{
							description: "Markdown",
							accept: {
								"text/markdown": [".md", ".markdown"],
								"text/plain": [".txt"]
							}
						}
					]
				});
				if (!fileHandle) return null;
				return {
					file: await fileHandle.getFile(),
					fileHandle
				};
			} catch (error: any) {
				if (error?.name === "AbortError") return null;
				console.warn("File System Access API 不可用，回退到普通文件导入:", error);
			}
		}

		return new Promise(resolve => {
			const input = document.createElement("input");
			input.type = "file";
			input.accept = ".md,.markdown,.txt,text/markdown,text/plain";
			input.style.display = "none";

			input.onchange = (e: Event) => {
				const target = e.target as HTMLInputElement;
				const file = target.files?.[0];
				if (document.body.contains(input)) {
					document.body.removeChild(input);
				}
				resolve(file ? { file } : null);
			};

			document.body.appendChild(input);
			input.click();
		});
	};

	const ensureMarkdownWritePermission = async (fileHandle: any) => {
		if (!fileHandle) return false;
		const permissionOptions = { mode: "readwrite" };
		if (typeof fileHandle.queryPermission === "function") {
			const currentPermission = await fileHandle.queryPermission(permissionOptions);
			if (currentPermission === "granted") return true;
		}
		if (typeof fileHandle.requestPermission === "function") {
			const requestedPermission = await fileHandle.requestPermission(permissionOptions);
			return requestedPermission === "granted";
		}
		return true;
	};

	// 解析简单的 YAML 格式 Front Matter
	const parseSimpleYaml = (yamlText: string) => {
		const data: any = {};
		const lines = yamlText.split("\n");
		let currentKey = "";

		for (let line of lines) {
			const trimmedLine = line.trim();
			if (!trimmedLine) continue;

			// 匹配 key: value
			const kvMatch = trimmedLine.match(/^(\w+):\s*(.*)$/);
			if (kvMatch) {
				currentKey = kvMatch[1];
				const value = kvMatch[2].trim();
				// 如果值为空，可能是列表开始
				if (value === "" || value === "-") {
					data[currentKey] = [];
				} else {
					data[currentKey] = value;
				}
			} else if (trimmedLine.startsWith("-") && currentKey) {
				// 匹配列表项 - value
				const value = trimmedLine.substring(1).trim();
				if (!Array.isArray(data[currentKey])) {
					data[currentKey] = [];
				}
				data[currentKey].push(value);
			}
		}
		return data;
	};

	const handleImportMarkdown = () => {
		(async () => {
			const selected = await pickMarkdownFile();
			if (!selected) return;

			const { file, fileHandle } = selected;

			const fileName = file.name || "";
			const isMarkdown = /\.(md|markdown|txt)$/i.test(fileName);
			if (!isMarkdown) {
				message.error("仅支持 .md/.markdown/.txt 文件");
				return;
			}
			const fileNameSlug = buildUrlSlugFromFileName(fileName);

			const loadingKey = "markdown-import-loading";
			message.loading({ content: "正在导入 Markdown...", key: loadingKey, duration: 0 });

			try {
				const raw = await file.text();
				const importedSource = buildImportedMarkdownSource(fileName, fileHandle);
				let markdown = sanitizeYuqueMarkdown(raw);

				// 1. 解析 Front Matter
				const fmRegex = /^---\s*\n([\s\S]*?)\n\s*---\s*(\n|$)/;
				const fmMatch = markdown.match(fmRegex);
				let fmData: any = null;
				if (fmMatch) {
					const fmText = fmMatch[1];
					// 从正文中剔除模板
					markdown = markdown.replace(fmRegex, "").trimStart();
					fmData = parseSimpleYaml(fmText);
					console.log("解析到的 Front Matter:", fmData);
				}

				// 2. 解析 H1 标题
				let articleTitle = "";
				const h1Match = markdown.match(/^\s*#\s+(.+)\s*$/m);
				if (h1Match) {
					articleTitle = h1Match[1].trim();
					markdown = markdown.replace(/^\s*#\s+.+\s*\n*/m, "").trimStart();
				}

				// 3. 准备元数据更新
				const updateData: MapItem = {};
				let foundTags: any[] = [];

				if (fmData) {
					if (fmData.title) updateData.title = fmData.title;
					if (fmData.shortTitle) updateData.shortTitle = fmData.shortTitle;
					if (fmData.urlSlug || fmData.slug) updateData.urlSlug = normalizeUrlSlug(fmData.urlSlug || fmData.slug);
					if (fmData.description) updateData.summary = fmData.description;

					// 状态设置为已发布 (Number 格式用于 form 状态)
					updateData.status = Number(PushStatusEnum.Published);

					// 分类匹配
					if (fmData.category) {
						const catName = Array.isArray(fmData.category) ? fmData.category[0] : fmData.category;
						const category = CategoryTypeList?.find((item: any) => item.label === catName);
						if (category) {
							updateData.categoryId = category.value;
						}
					}

					// 标签匹配 (限制最多3个)
					if (fmData.tag) {
						const tagNames = Array.isArray(fmData.tag) ? fmData.tag : [fmData.tag];
						try {
							const tagPromises = tagNames
								.slice(0, 3)
								.map((name: string) => getTagListApi({ status: 1, tag: name.trim(), pageNumber: 1, pageSize: 1 }));
							const tagResults = await Promise.all(tagPromises);
							foundTags = tagResults.map((res: any) => res.result?.list?.[0]).filter(t => t);
							if (foundTags.length > 0) {
								updateData.tagIds = foundTags.map(t => t.tagId);
							}
						} catch (e) {
							console.warn("查找标签失败:", e);
						}
					}
				}

				const shouldImport = await new Promise<"append" | "replace" | "cancel">(resolve => {
					if (content && content.trim()) {
						const modal = Modal.info({
							title: "当前编辑器有内容",
							content: "是否替换或追加导入的 Markdown？",
							icon: null,
							closable: true,
							okButtonProps: { style: { display: "none" } },
							footer: (
								<div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
									<Button
										onClick={() => {
											modal.destroy();
											resolve("cancel");
										}}
									>
										取消
									</Button>
									<Button
										onClick={() => {
											modal.destroy();
											resolve("replace");
										}}
									>
										替换内容
									</Button>
									<Button
										type="primary"
										onClick={() => {
											modal.destroy();
											resolve("append");
										}}
									>
										追加到末尾
									</Button>
								</div>
							)
						});
					} else {
						resolve("replace");
					}
				});

				if (shouldImport === "cancel") {
					message.info({ content: "已取消导入", key: loadingKey });
					return;
				}

				// 4. 执行更新
				const finalUpdateData: MapItem = { ...updateData, content: markdown };
				if (isValidUrlSlug(fileNameSlug) && fileNameSlug) {
					finalUpdateData.urlSlug = fileNameSlug;
				}

				// 处理标题逻辑：优先使用模板里的，没有则使用 H1
				if (!finalUpdateData.shortTitle && articleTitle) {
					finalUpdateData.shortTitle = articleTitle;
				}

				if (!finalUpdateData.urlSlug && finalUpdateData.shortTitle) {
					const generatedSlug = await handleGenerateUrlSlug(
						{
							title: finalUpdateData.title,
							shortTitle: finalUpdateData.shortTitle
						},
						true
					);
					if (generatedSlug) {
						finalUpdateData.urlSlug = generatedSlug;
					}
				}

				if (shouldImport === "append") {
					const appendedContent = (content ? content.trimEnd() : "") + "\n\n---\n\n" + markdown;
					finalUpdateData.content = appendedContent;
					setContent(appendedContent);
				} else {
					setContent(markdown);
				}

				// 统一执行状态更新
				handleChange(finalUpdateData);
				if (shouldImport === "replace") {
					importedMarkdownSourceRef.current = importedSource;
					setImportedMarkdownFileName(fileName);
					setCanOverwriteMarkdown(Boolean(fileHandle));
				} else {
					importedMarkdownSourceRef.current = null;
					setImportedMarkdownFileName("");
					setCanOverwriteMarkdown(false);
				}

				// 更新 AntD 表单 UI
				const formValues: any = {
					...finalUpdateData,
					status: fmData ? String(PushStatusEnum.Published) : undefined
				};
				if (foundTags.length > 0) {
					formValues.tagName = foundTags.map(t => ({
						key: t.tagId,
						label: t.tag,
						value: t.tag
					}));
				}
				formRef.setFieldsValue(formValues);

				message.success({
					content: shouldImport === "append" ? "Markdown 已追加到末尾" : "Markdown 已导入",
					key: loadingKey
				});
			} catch (error) {
				console.error("导入 Markdown 失败:", error);
				message.error({ content: "导入失败，请确保文件内容正确", key: loadingKey });
			}
		})();
	};

	const handleOverwriteImportedMarkdown = async () => {
		const source = importedMarkdownSourceRef.current;
		if (!source) {
			message.warning("请先导入 Markdown 文件");
			return;
		}
		if (!source.fileHandle) {
			message.warning("当前导入方式无法写回原文件，请在 Chrome/Edge 下重新导入 Markdown");
			return;
		}

		try {
			const hasPermission = await ensureMarkdownWritePermission(source.fileHandle);
			if (!hasPermission) {
				message.warning("没有写入原 Markdown 文件的权限");
				return;
			}

			const latestContent = applyPendingImageSizeChanges(contentRef.current || content);
			const currentSourceFile = await source.fileHandle.getFile();
			const currentFileContent = await currentSourceFile.text();
			const fileContent = buildMarkdownSourceContent(currentFileContent, latestContent);
			const writable = await source.fileHandle.createWritable();
			await writable.write(fileContent);
			await writable.close();
			message.success(`已覆盖 ${source.fileName} 的正文，formatter 保持不变`);
		} catch (error) {
			console.error("覆盖 Markdown 源文件失败:", error);
			message.error("覆盖源文件失败，请确认浏览器权限或文件是否仍可写");
		}
	};

	const getVideoInsertSnapshot = () => {
		const editor = editorRef.current;
		const currentValue = typeof editor?.getValue === "function" ? editor.getValue() : contentRef.current;
		if (typeof editor?.getCursor === "function" && typeof editor?.indexFromPos === "function") {
			return {
				index: editor.indexFromPos(editor.getCursor()),
				value: currentValue
			};
		}

		return {
			index: currentValue.length,
			value: currentValue
		};
	};

	const buildBlockInsertion = (value: string, index: number, block: string) => {
		const safeIndex = Math.max(0, Math.min(index, value.length));
		const before = value.slice(0, safeIndex);
		const after = value.slice(safeIndex);
		const prefix = before && !before.endsWith("\n\n") ? (before.endsWith("\n") ? "\n" : "\n\n") : "";
		const suffix = after ? (after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n") : "\n";
		const insertText = `${prefix}${block}${suffix}`;

		return {
			nextContent: `${before}${insertText}${after}`,
			cursorIndex: before.length + insertText.length
		};
	};

	const insertVideoAtSnapshot = (videoId: string, snapshot: { index: number; value: string }) => {
		const editor = editorRef.current;
		const currentValue = typeof editor?.getValue === "function" ? editor.getValue() : contentRef.current || snapshot.value;
		const { nextContent, cursorIndex } = buildBlockInsertion(currentValue, snapshot.index, `@[aliyun-vod](${videoId})`);

		setContent(nextContent);
		handleChange({ content: nextContent });
		contentRef.current = nextContent;

		setTimeout(() => {
			if (typeof editor?.posFromIndex === "function" && typeof editor?.setCursor === "function") {
				editor.setCursor(editor.posFromIndex(cursorIndex));
				editor.focus?.();
			}
		});
	};

	const handleUploadVideo = () => {
		const insertSnapshot = getVideoInsertSnapshot();
		const input = document.createElement("input");
		input.type = "file";
		input.accept = "video/*,audio/*";
		input.style.display = "none";

		input.onchange = async (e: Event) => {
			const target = e.target as HTMLInputElement;
			const file = target.files?.[0];
			if (document.body.contains(input)) {
				document.body.removeChild(input);
			}
			if (!file) return;
			if (!/^video\/|^audio\//.test(file.type)) {
				message.error("请选择视频或音频文件");
				return;
			}

			const loadingKey = "aliyun-vod-upload";
			let resolvedVideoId = "";
			try {
				await loadAliyunVodSdk();
				if (!window.AliyunUpload || !window.OSS) {
					message.error("阿里云上传 SDK 未加载");
					return;
				}

				message.loading({ content: "视频准备上传...", key: loadingKey, duration: 0 });
				await new Promise<void>((resolve, reject) => {
					const uploader = new window.AliyunUpload.Vod({
						userId: "paicoding",
						region: "cn-shanghai",
						partSize: 1048576,
						parallel: 5,
						retryCount: 3,
						retryDuration: 2,
						onUploadstarted: async (uploadInfo: any) => {
							try {
								const response: any = uploadInfo.videoId
									? await refreshVodUploadAuthApi(uploadInfo.videoId)
									: await createVodUploadAuthApi(file.name, file.name);
								const result = response?.result;
								if (!result?.uploadAuth || !result?.uploadAddress || !result?.videoId) {
									reject(new Error("获取视频上传凭证失败"));
									return;
								}
								resolvedVideoId = result.videoId;
								uploader.setUploadAuthAndAddress(uploadInfo, result.uploadAuth, result.uploadAddress, result.videoId);
							} catch (error) {
								reject(error);
							}
						},
						onUploadSucceed: (uploadInfo: any) => {
							resolvedVideoId = resolvedVideoId || uploadInfo.videoId;
							resolve();
						},
						onUploadFailed: (_uploadInfo: any, code: string, errorMessage: string) => {
							reject(new Error(errorMessage || code || "视频上传失败"));
						},
						onUploadProgress: (_uploadInfo: any, _totalSize: number, progress: number) => {
							message.loading({ content: `视频上传中 ${Math.ceil(progress * 100)}%`, key: loadingKey, duration: 0 });
						},
						onUploadTokenExpired: async (uploadInfo: any) => {
							try {
								const response: any = await refreshVodUploadAuthApi(resolvedVideoId || uploadInfo.videoId);
								const result = response?.result;
								if (!result?.uploadAuth) {
									reject(new Error("刷新视频上传凭证失败"));
									return;
								}
								resolvedVideoId = result.videoId || resolvedVideoId;
								uploader.resumeUploadWithAuth(result.uploadAuth);
							} catch (error) {
								reject(error);
							}
						}
					});

					uploader.addFile(file, null, null, null, JSON.stringify({ Vod: { Title: file.name } }));
					uploader.startUpload();
				});

				if (resolvedVideoId) {
					insertVideoAtSnapshot(resolvedVideoId, insertSnapshot);
					message.success({ content: "视频上传成功，已插入文章", key: loadingKey });
				}
			} catch (error: any) {
				message.error({ content: error?.message || "视频上传失败", key: loadingKey });
			}
		};

		document.body.appendChild(input);
		input.click();
	};

	// 导入 Word 文档
	const handleImportWord = () => {
		console.log("=== 开始导入 Word 文档 ===");

		// 定义已知的代码块 styleId
		const codeBlockStyleIds = [
			"23",
			"_Style 23",
			"ne-codeblock",
			"Code",
			"代码",
			"Preformatted",
			"HTML Preformatted",
			"Source Code",
			"Plain Text",
			"Consolas",
			"Courier New",
			"Monospaced"
		];

		// 定义转换函数
		function transformElement(element: any): any {
			// 处理段落：如果有 styleId 但没有 styleName，尝试修复
			if (element.type === "paragraph" && element.styleId && !element.styleName) {
				if (codeBlockStyleIds.some(id => element.styleId.includes(id))) {
					element.styleName = element.styleId; // 用 styleId 作为 styleName
				}
			}

			// 语雀代码块处理：语雀导出的 docx 中，代码块可能带有特定的 styleId
			if (element.type === "paragraph" && element.styleId && element.styleId.includes("code")) {
				element.styleName = "ne-codeblock";
			}

			// 递归处理子元素
			if (element.children) {
				element.children = element.children.map(transformElement);
			}

			return element;
		}

		function transformDocument(document: any) {
			// document 是整个文档对象，需要处理它的所有元素
			if (document && document.children) {
				document.children = document.children.map(transformElement);
			}
			return document;
		}

		// 创建文件输入元素
		const input = document.createElement("input");
		input.type = "file";
		input.accept = ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
		input.style.display = "none";

		input.onchange = async (e: Event) => {
			console.log("change 事件触发");
			const target = e.target as HTMLInputElement;
			const file = target.files?.[0];
			console.log("选中的文件:", file);

			// 清理 DOM
			if (document.body.contains(input)) {
				document.body.removeChild(input);
			}

			if (!file) {
				console.log("没有选择文件");
				return;
			}

			if (!file.name.endsWith(".docx")) {
				console.error("文件类型错误:", file.name);
				message.error("仅支持 .docx 格式的 Word 文档");
				return;
			}

			try {
				console.log("开始转换文件...");
				const loadingKey = "word-import-loading";
				message.loading({ content: "正在导入 Word 文档...", key: loadingKey, duration: 0 });

				const arrayBuffer = await file.arrayBuffer();
				console.log("文件读取成功，大小:", arrayBuffer.byteLength);

				// 配置 mammoth 选项
				const styleMap = [
					// 代码块样式
					"p[style-name='_Style 23'] => pre.code-block",
					"p[style-name='ne-codeblock'] => pre.code-block", // 语雀导出的文档
					"p[style-name='Code'] => pre.code-block",
					"p[style-name='代码'] => pre.code-block",
					"p[style-name='Preformatted'] => pre.code-block",
					"p[style-name='HTML Preformatted'] => pre.code-block",
					"p[style-name='Preformatted Text'] => pre.code-block",
					"p[style-name='Source Code'] => pre.code-block",
					"p[style-name='Plain Text'] => pre.code-block",
					"p[style-name='Consolas'] => pre.code-block",
					"p[style-name='Courier New'] => pre.code-block",
					"p[style-name='Monospaced'] => pre.code-block"
				].join("\n");

				const result = await (mammoth as any).convertToHtml({
					arrayBuffer,
					styleMap: styleMap,
					transformDocument: transformDocument,
					includeDefaultStyleMap: true
				});
				const html = result.value;
				console.log("HTML 转换成功，长度:", html.length);

				// 打印样式警告信息（可以看到文档中有哪些样式）
				if (result.messages && result.messages.length > 0) {
					console.warn("样式信息和警告:");
					result.messages.forEach((msg: any) => {
						console.warn(`- ${msg.type}: ${msg.message}`);
					});
				}

				// 打印完整的 HTML（移除 base64 图片避免过长）
				const htmlWithoutImages = html.replace(/src="data:image[^"]*"/g, 'src="[base64]"');
				console.log("=== 完整的 HTML 内容开始 ===");
				console.log(htmlWithoutImages);
				console.log("=== 完整的 HTML 内容结束 ===");

				// 预处理：将包含多个 br 的段落或符合代码特征的段落转换为代码块
				let processedHtml = html.replace(/<p>([\s\S]*?)<\/p>/gi, (match: string, content: string) => {
					// 统计 br 标签数量
					const brCount = (content.match(/<br\s*\/?>/gi) || []).length;

					// 如果有 1 个以上的 br (至少两行)，或者包含明显的代码关键字
					const codeKeywords =
						/\b(FROM|RUN|COPY|WORKDIR|ENTRYPOINT|CMD|ENV|EXPOSE|VOLUME|ARG|import|export|const|let|var|function|class|def|public|private|protected|package|interface|docker|maven|mvn|git|npm|yarn|pip|npm install|yarn add|void|static|return|if|else|for|while|switch|case|break|continue|try|catch|finally|throw|new|this|super|extends|implements|abstract|final|native|synchronized|transient|volatile|strictfp|assert|instanceof|boolean|byte|char|double|float|int|long|short|String|Integer|Long|Double|Float|Boolean|Map|List|Set|HashMap|ArrayList|HashSet|Stream|Optional|Response|Request|Controller|Service|Repository|Component|Autowired|Resource|Value|RequestMapping|GetMapping|PostMapping|PutMapping|DeleteMapping|PathVariable|RequestParam|RequestBody|ResponseBody|Data|AllArgsConstructor|NoArgsConstructor|Builder|Slf4j|SpringBootApplication|Configuration|Bean|Override|System\.out\.println|console\.log|println|def|fn|lambda|async|await|promise|resolve|reject|fetch|axios|api|admin|paicoding|CompletableFuture|supplyAsync|thenAccept|thenApply|thenRun|handle|exceptionally|executor|submit|execute|TtlRunnable|TtlExecutors|log|info|debug|error|warn|trace|logger|RequestContext)\b/i;

					const textContent = content.replace(/<[^>]+>/g, "").trim(); // 移除所有标签查看纯文本

					// 如果包含 CodeMirror 相关的类名，通常也是代码
					const isCodeMirror = content.includes("CodeMirror-line") || content.includes("cm-text");

					// 识别单行代码特征：Lambda 表达式、方法链、分号结尾、或者包含典型的代码符号组合
					const isSingleLineCode =
						((textContent.includes("->") || textContent.includes("=>")) && textContent.includes("(")) || // Lambda
						(textContent.includes(".") && textContent.includes("(") && textContent.includes(")")) || // 方法调用/链
						(textContent.endsWith(";") && textContent.length > 5) || // 以分号结尾
						(textContent.includes("{") && textContent.includes("}")) || // 包含大括号
						(textContent.includes("(") && textContent.includes(")") && textContent.includes("=")); // 赋值调用

					// 1. 如果有 1 个以上的 br 且匹配关键字
					// 2. 如果文本内容看起来像代码（例如以特定字符开头或包含特定结构）
					// 3. 包含 CodeMirror 特征
					// 4. 符合单行代码特征且包含关键字
					if (
						isCodeMirror ||
						(brCount >= 1 && codeKeywords.test(textContent)) ||
						(isSingleLineCode && codeKeywords.test(textContent)) ||
						(textContent.length > 5 &&
							(textContent.startsWith("import ") ||
								textContent.startsWith("package ") ||
								textContent.includes("public static void main") ||
								(textContent.includes("class ") && textContent.includes("{")) ||
								(textContent.includes("function") && textContent.includes(")")) ||
								(textContent.includes("const ") && textContent.includes("=")) ||
								(textContent.includes("let ") && textContent.includes("="))))
					) {
						console.log("检测到潜在代码块，内容预览:", textContent.substring(0, 100));
						return '<pre class="code-block">' + content + "</pre>";
					}
					return match;
				});

				// 处理已经存在的 pre 标签（可能是 CodeMirror 产生的）
				processedHtml = processedHtml.replace(
					/<pre[^>]*class="[^"]*CodeMirror-line[^"]*"[^>]*>([\s\S]*?)<\/pre>/gi,
					(match: string, content: string) => {
						return '<pre class="code-block">' + content + "</pre>";
					}
				);

				// 合并相邻的代码块
				processedHtml = processedHtml.replace(/<\/pre>\s*<pre class="code-block">/gi, "<br/>");

				console.log("=== 预处理后的 HTML 开始 ===");
				const processedWithoutImages = processedHtml.replace(/src="data:image[^"]*"/g, 'src="[base64]"');
				console.log(processedWithoutImages);
				console.log("=== 预处理后的 HTML 结束 ===");

				// 清理空锚点标签（包括有 id 或 name 属性但内容为空或仅有空白字符的 a 标签）
				// 语雀的锚点通常是 <a id="xxx"></a>
				console.log("=== 开始清理语雀锚点 ===");
				processedHtml = processedHtml.replace(/<a(?![^>]*\bhref\b)[^>]*>([\s\S]*?)<\/a>/gi, (match: string, content: string) => {
					const textContent = content.replace(/<[^>]+>/g, "").trim();
					if (textContent === "") {
						console.log("移除空锚点:", match);
						return "";
					}
					// 如果不是空的，则保留内容但移除 a 标签
					console.log("移除锚点标签但保留内容:", match);
					return content;
				});

				// 针对语雀特定的锚点格式进一步加强清理
				processedHtml = processedHtml.replace(/<a\s+(?:id|name|data-anchor)="[^"]*"\s*>\s*<\/a>/gi, "");
				processedHtml = processedHtml.replace(/<a\s+[^>]*\b(?:id|name|data-anchor)="[^"]*"[^>]*>\s*<\/a>/gi, "");

				const afterClean = processedHtml.substring(0, 500);
				console.log("清理后（前500字符）:", afterClean);
				console.log("=== 空锚点清理完成 ===");

				// 关闭初始的 loading
				message.destroy(loadingKey);

				// 先询问用户是否继续导入
				const shouldImport = await new Promise<"append" | "replace" | "cancel">(resolve => {
					if (content && content.trim()) {
						console.log("编辑器有内容，询问用户");
						const modal = Modal.info({
							title: "当前编辑器有内容",
							content: "Word 文档中包含图片需要上传，是否继续导入？",
							icon: null,
							closable: true,
							okButtonProps: { style: { display: "none" } },
							footer: (
								<div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
									<Button
										onClick={() => {
											console.log("用户取消导入");
											modal.destroy();
											resolve("cancel");
										}}
									>
										取消
									</Button>
									<Button
										onClick={() => {
											console.log("用户选择: 替换");
											modal.destroy();
											resolve("replace");
										}}
									>
										替换内容
									</Button>
									<Button
										type="primary"
										onClick={() => {
											console.log("用户选择: 追加");
											modal.destroy();
											resolve("append");
										}}
									>
										追加到末尾
									</Button>
								</div>
							)
						});
					} else {
						resolve("replace");
					}
				});

				if (shouldImport === "cancel") {
					message.info("已取消导入");
					console.log("用户取消导入");
					return;
				}

				// 处理图片：提取 base64 图片并上传
				const base64Images = processedHtml.match(/<img src="data:image\/(.*?);base64,(.*?)"(.*?)>/gi) || [];
				console.log(`找到 ${base64Images.length} 张 base64 图片`);

				let htmlWithUploadedImages = processedHtml;

				if (base64Images.length > 0) {
					message.loading(`正在上传 ${base64Images.length} 张图片...`, 0);

					// 并发上传图片，最多同时 5 个请求
					const concurrency = 5;
					const uploadResults: Array<{ original: string; uploaded: string } | null> = [];

					// 分批处理
					for (let i = 0; i < base64Images.length; i += concurrency) {
						const batch = base64Images.slice(i, i + concurrency);
						console.log(`上传批次: ${Math.floor(i / concurrency) + 1}, 包含 ${batch.length} 张图片`);

						// 并发上传当前批次
						const batchPromises = batch.map(async (imgTag: string, batchIndex: number) => {
							const index = i + batchIndex;
							try {
								// 提取 base64 数据和图片类型
								const match = imgTag.match(/data:image\/(.*?);base64,(.*?)"/);
								if (!match) return null;

								const [, imageType, base64Data] = match;
								console.log(`上传图片 ${index + 1}/${base64Images.length}, 类型: ${imageType}`);

								// 将 base64 转换为 Blob
								const byteString = atob(base64Data);
								const arrayBuffer = new ArrayBuffer(byteString.length);
								const uint8Array = new Uint8Array(arrayBuffer);
								for (let j = 0; j < byteString.length; j++) {
									uint8Array[j] = byteString.charCodeAt(j);
								}
								const blob = new Blob([arrayBuffer], { type: `image/${imageType}` });

								// 创建 File 对象，增加更多随机性避免文件名和请求冲突
								const timestamp = Date.now();
								const random = Math.random().toString(36).substring(2, 15);
								const fileName = `word-image-${timestamp}-${random}-${index}.${imageType}`;
								const file = new File([blob], fileName, {
									type: `image/${imageType}`
								});

								// 上传图片，使用更唯一的标识
								const formData = new FormData();
								formData.append("image", file);

								const response = await uploadImgApi(formData);
								const { status, result } = response || {};
								const { code } = status || {};
								const { imagePath } = result || {};

								if (code === 0 && imagePath) {
									console.log(`图片 ${index + 1} 上传成功:`, imagePath);
									return { original: imgTag, uploaded: imagePath };
								} else {
									console.error(`图片 ${index + 1} 上传失败`);
									return null;
								}
							} catch (error) {
								console.error(`图片 ${index + 1} 上传出错:`, error);
								return null;
							}
						});

						// 等待当前批次完成
						const batchResults = await Promise.all(batchPromises);
						uploadResults.push(...batchResults);

						// 批次间增加短暂延迟，避免请求过于密集
						if (i + concurrency < base64Images.length) {
							await new Promise(resolve => setTimeout(resolve, 100));
						}
					}

					// 替换 HTML 中的图片
					let successCount = 0;
					uploadResults.forEach(result => {
						if (result) {
							htmlWithUploadedImages = htmlWithUploadedImages.replace(result.original, `<img src="${result.uploaded}">`);
							successCount++;
						}
					});

					message.destroy();
					if (successCount > 0) {
						message.success(`成功上传 ${successCount} 张图片`);
					}
					if (successCount < base64Images.length) {
						message.warning(`${base64Images.length - successCount} 张图片上传失败`);
					}
				}

				// 先清理空的 <a> 标签（锚点）
				let cleanedHtml = htmlWithUploadedImages.replace(
					/<a(?![^>]*\bhref\b)[^>]*>([\s\S]*?)<\/a>/gi,
					(match: string, content: string) => {
						const textContent = content.replace(/<[^>]+>/g, "").trim();
						return textContent === "" ? "" : content;
					}
				);
				cleanedHtml = cleanedHtml.replace(/<a\s+(?:id|name|data-anchor)="[^"]*"\s*>\s*<\/a>/gi, "");

				let markdown = cleanedHtml
					.replace(/<h1>(.*?)<\/h1>/gi, "# $1\n\n")
					.replace(/<h2>(.*?)<\/h2>/gi, "## $1\n\n")
					.replace(/<h3>(.*?)<\/h3>/gi, "### $1\n\n")
					.replace(/<h4>(.*?)<\/h4>/gi, "#### $1\n\n")
					.replace(/<h5>(.*?)<\/h5>/gi, "##### $1\n\n")
					.replace(/<h6>(.*?)<\/h6>/gi, "###### $1\n\n")
					.replace(/<(?:strong|b)>([\s\S]*?)([。，！？；：,.!?;:]*)<\/(?:strong|b)>/gi, "**$1**$2")
					.replace(/<em>(.*?)<\/em>/gi, "*$1*")
					.replace(/<i>(.*?)<\/i>/gi, "*$1*")
					.replace(/<li>([\s\S]*?)<\/li>/gi, (match: string, content: string) => {
						const innerContent = content.replace(/<p>/gi, "").replace(/<\/p>/gi, "").trim();
						return "- " + innerContent + "\n";
					})
					.replace(/<\/ul>/gi, "\n\n")
					.replace(/<\/ol>/gi, "\n\n")
					.replace(/<ul>/gi, "\n")
					.replace(/<ol>/gi, "\n")
					// 处理表格 - 转换为 Markdown 表格格式
					.replace(/<table>([\s\S]*?)<\/table>/gi, (match: string, tableContent: string) => {
						// 解析表格行
						const rows = tableContent.match(/<tr>([\s\S]*?)<\/tr>/gi) || [];
						if (rows.length === 0) return match;

						let markdownTable = "\n";

						rows.forEach((row: string, rowIndex: number) => {
							// 提取单元格（支持 td 和 th）
							const cells = row.match(/<t[dh]>([\s\S]*?)<\/t[dh]>/gi) || [];
							const cellContents = cells.map((cell: string) => {
								// 移除单元格标签，保留内容
								let content = cell
									.replace(/<t[dh]>/gi, "")
									.replace(/<\/t[dh]>/gi, "")
									.replace(/<p>/gi, "")
									.replace(/<\/p>/gi, " ")
									.replace(/<a[^>]*>(.*?)<\/a>/gi, "$1")
									.replace(/<strong>(.*?)<\/strong>/gi, "**$1**")
									.replace(/<em>(.*?)<\/em>/gi, "*$1*")
									.replace(/<[^>]+>/g, "")
									.trim();
								return content || " ";
							});

							// 构建 Markdown 表格行
							markdownTable += "| " + cellContents.join(" | ") + " |\n";

							// 第一行后添加分隔线
							if (rowIndex === 0) {
								markdownTable += "| " + cellContents.map(() => "---").join(" | ") + " |\n";
							}
						});

						return markdownTable + "\n";
					})
					// 处理代码块 - 匹配我们自定义的 class
					.replace(/<pre class="code-block">([\s\S]*?)<\/pre>/gi, (match: string, code: string) => {
						const decoded = code
							.replace(/<p>/gi, "")
							.replace(/<\/p>/gi, "\n")
							.replace(/<br\s*\/?>/gi, "\n")
							.replace(/<[^>]+>/g, "") // 移除代码块内部的所有其他标签（如 CodeMirror 的 span）
							.replace(/&ZeroWidthSpace;/g, "") // 移除零宽字符
							.replace(/&lt;/g, "<")
							.replace(/&gt;/g, ">")
							.replace(/&amp;/g, "&")
							.replace(/&quot;/g, '"')
							.replace(/&#39;/g, "'")
							.trim();

						// 检测代码语言
						let language = "";

						// Java 代码特征
						if (
							/\b(public|private|protected|class|interface|enum|package|import)\s+/i.test(decoded) ||
							/\bpublic\s+static\s+void\s+main/i.test(decoded)
						) {
							language = "java";
						}
						// Dockerfile 特征
						else if (/^FROM\s+/im.test(decoded) || /^RUN\s+/im.test(decoded)) {
							language = "dockerfile";
						}

						return "```" + language + "\n" + decoded + "\n```\n\n";
					})
					// 处理普通的 pre 标签
					.replace(/<pre[^>]*><code>([\s\S]*?)<\/code><\/pre>/gi, (match: string, code: string) => {
						const decoded = code
							.replace(/<[^>]+>/g, "") // 移除内部标签
							.replace(/&ZeroWidthSpace;/g, "")
							.replace(/&lt;/g, "<")
							.replace(/&gt;/g, ">")
							.replace(/&amp;/g, "&")
							.replace(/&quot;/g, '"')
							.replace(/&#39;/g, "'");

						// 检测代码语言
						let language = "";

						// Java 代码特征
						if (
							/\b(public|private|protected|class|interface|enum|package|import)\s+/i.test(decoded) ||
							/\bpublic\s+static\s+void\s+main/i.test(decoded)
						) {
							language = "java";
						}
						// Dockerfile 特征
						else if (/^FROM\s+/im.test(decoded) || /^RUN\s+/im.test(decoded)) {
							language = "dockerfile";
						}

						return "```" + language + "\n" + decoded + "\n```\n\n";
					})
					.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (match: string, code: string) => {
						const decoded = code
							.replace(/<[^>]+>/g, "") // 移除内部标签
							.replace(/&ZeroWidthSpace;/g, "")
							.replace(/&lt;/g, "<")
							.replace(/&gt;/g, ">")
							.replace(/&amp;/g, "&")
							.replace(/&quot;/g, '"')
							.replace(/&#39;/g, "'");

						// 检测代码语言
						let language = "";

						// Java 代码特征
						if (
							/\b(public|private|protected|class|interface|enum|package|import)\s+/i.test(decoded) ||
							/\bpublic\s+static\s+void\s+main/i.test(decoded)
						) {
							language = "java";
						}
						// Dockerfile 特征
						else if (/^FROM\s+/im.test(decoded) || /^RUN\s+/im.test(decoded)) {
							language = "dockerfile";
						}

						return "```" + language + "\n" + decoded + "\n```\n\n";
					})
					// 行内代码
					.replace(/<code>(.*?)<\/code>/gi, "`$1`")
					.replace(/<p>(.*?)<\/p>/gi, "$1\n\n")
					.replace(/<a href="(.*?)">(.*?)<\/a>/gi, "[$2]($1)")
					.replace(/<img src="(.*?)" alt="(.*?)">/gi, "![$2]($1)")
					.replace(/<img src="(.*?)">/gi, "![]($1)")
					.replace(/<br\s*\/?>/gi, "\n")
					.replace(/<[^>]+>/g, "");
				// 最终全局清洗：保护代码块内部的缩进
				let inCodeBlock = false;
				markdown = markdown
					.replace(/&ZeroWidthSpace;/g, "") // 全局移除零宽字符
					.split("\n")
					.map((line: string) => {
						const trimmedLine = line.trim();
						// 检测代码块边界
						if (trimmedLine.startsWith("```")) {
							inCodeBlock = !inCodeBlock;
							return trimmedLine;
						}
						// 如果在代码块内部，只清理行尾空格，保留行首缩进
						if (inCodeBlock) {
							return line.trimEnd();
						}
						// 普通行执行全量 trim
						return trimmedLine;
					})
					.join("\n")
					.replace(/\n{3,}/g, "\n\n")
					.trim();

				console.log("Markdown 转换成功，长度:", markdown.length);

				// 提取一级标题并同步到文章标题
				let articleTitle = "";
				const h1Match = markdown.match(/^#\s+(.+)$/m);
				if (h1Match) {
					articleTitle = h1Match[1].trim();
					console.log("检测到一级标题，同步为文章标题:", articleTitle);
					// 从正文中移除一级标题及其后的换行
					markdown = markdown.replace(/^#\s+.+\n*/m, "").trimStart();
				}

				console.log("=== 完整的 Markdown 内容开始 ===");
				console.log(markdown);
				console.log("=== 完整的 Markdown 内容结束 ===");

				// 先关闭 loading
				message.destroy();

				// 根据用户之前的选择来处理内容
				if (shouldImport === "append") {
					console.log("执行追加操作");
					const finalMarkdown = content + "\n\n---\n\n" + markdown;
					setContent(finalMarkdown);
					handleChange({ content: finalMarkdown });
					message.success("Word 文档已追加到末尾");
				} else {
					console.log("执行替换操作");
					setContent(markdown);
					// 如果提取到了标题，同步更新标题
					if (articleTitle) {
						const generatedSlug = await handleGenerateUrlSlug({ shortTitle: articleTitle }, true);
						const updateData = generatedSlug
							? { content: markdown, shortTitle: articleTitle, urlSlug: generatedSlug }
							: { content: markdown, shortTitle: articleTitle };
						handleChange(updateData);
						formRef.setFieldsValue(updateData);
					} else {
						handleChange({ content: markdown });
					}
					message.success("Word 文档已导入");
				}

				console.log("=== Word 导入完成 ===");
			} catch (error) {
				console.error("❌ 导入失败:", error);
				message.destroy();
				message.error("导入失败，请确保文件格式正确");
			}
		};

		// 必须先添加到 DOM，Chrome 才允许触发
		document.body.appendChild(input);
		console.log("input 已添加到 DOM");
		// 立即触发 click，必须在同一个事件循环中
		input.click();
		console.log("click 事件已触发");
	};

	// AI 初始化文章信息
	const handleAiInit = async () => {
		const { shortTitle, content } = form;
		if (!shortTitle) {
			message.warning("请先输入或从 Word 导入短标题");
			return;
		}

		if (aiInitClearTimerRef.current) {
			window.clearTimeout(aiInitClearTimerRef.current);
		}

		const startedAt = Date.now();
		const updateProgress = (step: AiInitStep, text: string, completed: number, detail?: string, running = true) => {
			setAiInitProgress({
				step,
				text,
				detail,
				completed,
				total: 3,
				running,
				startedAt,
				elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000)
			});
		};

		updateProgress("prepare", "准备 AI 初始化文章信息", 0, "SEO 标题、简介和 URL slug 会由一次模型请求返回。");

		try {
			// 1. 调用 AI 接口生成标题和简介
			updateProgress("seo", "已请求模型，等待生成 SEO 标题、简介和 URL slug", 1);
			const { status: aiStatus, result: aiResult } = await generateArticleAiApi({
				shortTitle: shortTitle,
				content: content.substring(0, 400),
				articleId: form.articleId || articleId
			});

			if (aiStatus?.code === 0 && aiResult) {
				const { title, description, urlSlug } = aiResult as any;
				console.log("AI 初始化成功:", { title, description, urlSlug });

				// 2. 准备回填数据
				const updateData: MapItem = {
					title,
					summary: description,
					status: 0,
					urlSlug: normalizeUrlSlug(urlSlug)
				};

				// 3. 设置分类默认值为“星球专栏”
				updateProgress("defaults", "模型已返回，正在设置默认分类和标签", 2);
				const planetCategory = CategoryTypeList?.find((item: any) => item.label === "星球专栏");
				if (planetCategory) {
					updateData.categoryId = planetCategory.value;
					updateData.readType = 3;
					console.log("自动选择分类:", planetCategory.label);
				}

				// 4. 设置标签默认值为第一个
				try {
					const response = (await getTagListApi({
						status: 1,
						tag: "",
						pageNumber: 1,
						pageSize: 1
					}, {
						headers: { noLoading: true, noProgress: true }
					})) as any;

					const { status: tagStatus, result: tagResult } = response;

					if (tagStatus?.code === 0 && tagResult?.list?.length > 0) {
						const firstTag = tagResult.list[0];
						updateData.tagIds = [firstTag.tagId];
						// 同步回填到 DebounceSelect（它在 Form 中受控）
						formRef.setFieldsValue({
							tagName: [
								{
									key: firstTag.tagId,
									label: firstTag.tag,
									value: firstTag.tag
								}
							]
						});
						console.log("自动选择标签:", firstTag.tag);
					}
				} catch (tagError) {
					console.warn("获取默认标签失败:", tagError);
				}

				// 5. 执行回填
				updateProgress("apply", "正在回填文章信息", 2);
				handleChange(updateData);
				formRef.setFieldsValue({
					title,
					summary: description,
					urlSlug: updateData.urlSlug,
					status: "0",
					categoryId: updateData.categoryId,
					readType: updateData.readType ?? defaultInitForm.readType
				});

				updateProgress("success", "AI 初始化完成", 3, "标题、简介、默认分类、标签和 URL slug 已回填。", false);
				message.success("AI 初始化成功");
				aiInitClearTimerRef.current = window.setTimeout(() => {
					setAiInitProgress(null);
				}, 4000);
			} else {
				updateProgress("error", "AI 初始化失败", 0, aiStatus?.msg || "模型接口未返回可用结果。", false);
				message.error(aiStatus?.msg || "AI 初始化失败");
			}
		} catch (error) {
			console.error("AI 初始化出错:", error);
			const errorMessage = getApiErrorMessage(error, "AI 初始化失败");
			updateProgress("error", "AI 初始化失败", 0, errorMessage, false);
			message.error(errorMessage);
		}
	};

	// 编辑或者新增时提交数据到服务器端
	const handleSubmit = async () => {
		// 又 from 中获取数据，需要转换格式的数据
		const { articleId, cover, tagIds, shortTitle } = form;
		const latestContent = contentRef.current || form.content;
		console.log("handleSubmit 时看看form的值", form);
		// content 为空的时候，提示用户
		if (!latestContent) {
			message.error("请输入文章内容");
			return;
		}

		// tags 不能超过 3 个
		if (tagIds.length > 3) {
			message.error("标签不能超过 3 个");
			return;
		}

		const values = await formRef.validateFields();
		console.log("handleSubmit 时看看form的值 values", values);
		const urlSlug = normalizeUrlSlug(values.urlSlug);
		if (!isValidUrlSlug(urlSlug)) {
			message.error("URL Slug 只能包含小写字母、数字和连字符，且不能是纯数字");
			return;
		}

		const normalizedReadType = Number(values.readType ?? defaultInitForm.readType);
		const normalizedPayWay = normalizedReadType === 4 ? values.payWay || defaultInitForm.payWay : undefined;
		const normalizedPayAmount =
			normalizedReadType === 4 && values.payAmount != null ? Math.round(Number(values.payAmount) * 100) : undefined;

		// 新的值传递到后端
		const newValues = {
			...values,
			status: Number(values.status),
			readType: normalizedReadType,
			payWay: normalizedPayWay,
			payAmount: normalizedPayAmount,
			content: latestContent,
			tagIds: tagIds,
			shortTitle: shortTitle,
			urlSlug,
			// 确定的参数
			articleType: "BLOG",
			source: 2,
			// 草稿还是发布
			actionType: "post",
			articleId: status === UpdateEnum.Save ? UpdateEnum.Save : articleId
		};
		console.log("submit 之前的所有值:", newValues);

		isSavingArticleRef.current = true;
		try {
			const { status: successStatus } = (await saveArticleApi(newValues)) || {};
			const { code, msg } = successStatus || {};
			if (code === 0) {
				message.success("成功");
				draftBaselineSignatureRef.current = buildDraftSignature(newValues);
				hasDraftChangesRef.current = false;
				autoSave.current.cancel();
				localRemove(draftKey);
				// 返回文章列表页
				goBack();
			} else {
				isSavingArticleRef.current = false;
				message.error(msg || "失败");
			}
		} catch (error) {
			isSavingArticleRef.current = false;
			throw error;
		}
	};

	// 数据请求，这是一个钩子，query, current, pageSize, search 有变化的时候就会自动触发
	useEffect(() => {
		const getArticle = async () => {
			console.log("此时是否还有 ", articleId, status);
			const { status: resultStatus, result } = await getArticleApi(articleId);
			const { code } = resultStatus || {};
			if (code === 0 && status === UpdateEnum.Edit) {
				console.log("result", result);

				// 如果 status 为编辑，就请求数据
				// 设置文章内容，编辑器使用
				setServerContent(result?.content);

				// 此时不能直接从 form 中取出来，所以我们从 item 中取出来了。
				let coverUrl = getCompleteUrl(result?.cover);
				// 需要把 cover 放到 coverList 中，默认显示
				setCoverList([
					{
						uid: "-1",
						name: coverName,
						status: "done",
						thumbUrl: coverUrl,
						url: coverUrl
					}
				]);
				const serverFormValues = {
					title: result?.title,
					shortTitle: result?.shortTitle,
					urlSlug: result?.urlSlug,
					summary: result?.summary,
					cover: coverUrl,
					status: result?.status?.toString(),
					readType: result?.readType ?? defaultInitForm.readType,
					payWay: result?.payWay || defaultInitForm.payWay,
					payAmount: result?.payAmount == null ? defaultInitForm.payAmount : Number(result?.payAmount),
					categoryId: result?.category?.categoryId,
					tagName: result?.tags?.map((item: TagValue) => ({
						key: item?.tagId,
						label: item?.tag,
						value: item?.tag
					}))
				};

				// 填充表单
				formRef.setFieldsValue(serverFormValues);

				// 保存的时候需要
				const serverFormState = {
					content: result?.content,
					articleId: result?.articleId,
					title: result?.title,
					shortTitle: result?.shortTitle,
					urlSlug: result?.urlSlug,
					summary: result?.summary,
					status: result?.status,
					readType: result?.readType ?? defaultInitForm.readType,
					payWay: result?.payWay || defaultInitForm.payWay,
					payAmount: result?.payAmount == null ? defaultInitForm.payAmount : Number(result?.payAmount),
					categoryId: result?.category?.categoryId,
					tagIds: result?.tags?.map((item: TagValue) => Number(item?.tagId)).filter(Boolean)
				};
				handleChange(serverFormState, false);
				draftBaselineSignatureRef.current = buildDraftSignature({
					...serverFormState,
					...serverFormValues,
					content: result?.content
				});
				hasDraftChangesRef.current = false;

				// 检查草稿
				const draft = localGet(draftKey);
				if (draft) {
					if (isDraftSameAsServerArticle(draft, result || {})) {
						localRemove(draftKey);
						return;
					}

					const draftTime = new Date(draft.timestamp).toLocaleString();
					Modal.confirm({
						title: "发现未保存的草稿",
						content: `检测到您在 ${draftTime} 对此文章有未保存的修改，是否覆盖当前服务器版本？`,
						okText: "使用草稿",
						cancelText: "使用服务器版本",
						onOk: () => {
							hasDraftChangesRef.current = true;
							setContent(draft.content);
							setForm(prev => ({ ...prev, ...draft }));
							formRef.setFieldsValue(draft);
							if (draft.cover) {
								let coverUrl = getCompleteUrl(draft.cover);
								setCoverList([
									{
										uid: "-1",
										name: coverName,
										status: "done",
										thumbUrl: coverUrl,
										url: coverUrl
									}
								]);
							}
							message.success("已加载本地草稿");
						},
						onCancel: () => {
							hasDraftChangesRef.current = false;
							localRemove(draftKey);
						}
					});
				}
			}
		};

		getArticle();
	}, []);

	// 标题、分类、标签、封面、简介
	const aiInitPercent = aiInitProgress ? Math.round((aiInitProgress.completed / aiInitProgress.total) * 100) : 0;
	const aiInitStatus = aiInitProgress?.step === "error" ? "exception" : aiInitProgress?.step === "success" ? "success" : "active";
	const aiInitElapsedText = aiInitProgress ? `已耗时 ${formatElapsed(aiInitProgress.elapsedSeconds)}` : "";
	const aiInitSlugExtra =
		aiInitProgress && ["seo", "defaults", "slug", "apply", "success", "error"].includes(aiInitProgress.step) ? (
			<div className="article-url-slug-progress">
				<span>{aiInitProgress.step === "seo" ? "URL slug 会随本次模型结果一起返回" : aiInitProgress.text}</span>
			</div>
		) : null;
	const aiInitTopProgress = aiInitProgress ? (
		<div className="article-ai-init-strip">
			<div className="article-ai-init-strip__text">
				<span>{aiInitProgress.text}</span>
				<span>
					{aiInitProgress.completed}/{aiInitProgress.total} · {aiInitElapsedText}
				</span>
			</div>
			<Progress percent={aiInitPercent} showInfo={false} size="small" status={aiInitStatus} />
			{aiInitProgress.step === "error" && aiInitProgress.detail && (
				<div className="article-ai-init-strip__detail">{aiInitProgress.detail}</div>
			)}
		</div>
	) : null;

	const drawerContent = (
		<>
			{aiInitTopProgress}
			<Form name="basic" form={formRef} labelCol={{ span: 4 }} wrapperCol={{ span: 16 }} autoComplete="off">
				<Form.Item label="标题" name="title" rules={[{ required: true, message: "请输入标题!" }]}>
					<Input
						allowClear
						minLength={5}
						maxLength={120}
						onChange={e => {
							handleChange({ title: e.target.value });
						}}
					/>
				</Form.Item>
			<Form.Item label="短标题" name="shortTitle">
				<Input
					allowClear
					maxLength={40}
					onChange={e => {
						handleChange({ shortTitle: e.target.value });
					}}
				/>
			</Form.Item>
			<Form.Item
				label="URL Slug"
				tooltip="保存后文章访问地址为 https://xxx/{urlSlug}"
				extra={
					<div>
						<div>{form.urlSlug ? `访问路径：${baseDomain || ""}/${form.urlSlug}` : "导入文章后会优先根据短标题自动生成"}</div>
						{aiInitSlugExtra}
					</div>
				}
			>
				<Space.Compact style={{ width: "100%" }}>
					<Form.Item
						name="urlSlug"
						noStyle
						rules={[
							{
								validator: (_, value) => {
									const urlSlug = normalizeUrlSlug(value);
									if (isValidUrlSlug(urlSlug)) return Promise.resolve();
									return Promise.reject(new Error("只能包含小写字母、数字和连字符，且不能是纯数字"));
								}
							}
						]}
					>
						<Input
							allowClear
							maxLength={100}
							placeholder="如 pai-smart-resume"
							onChange={e => {
								const urlSlug = normalizeUrlSlug(e.target.value);
								formRef.setFieldsValue({ urlSlug });
								handleChange({ urlSlug });
							}}
						/>
					</Form.Item>
					<Button loading={slugGenerating} onClick={() => handleGenerateUrlSlug()}>
						生成
					</Button>
				</Space.Compact>
			</Form.Item>
			<Form.Item label="简介" name="summary" rules={[{ required: true, message: "请输入简介!" }]}>
				<TextArea
					allowClear
					// 行数
					rows={4}
					onChange={e => {
						handleChange({ summary: e.target.value });
					}}
				/>
			</Form.Item>
			<Form.Item label="封面" name="cover">
				<ImgUpload
					coverList={coverList}
					coverName={coverName}
					setCoverList={setCoverList}
					handleFormRefChange={handleFormRefChange}
				/>
			</Form.Item>
			<Form.Item label="状态" name="status">
				<Select
					placeholder="请选择文章状态"
					options={PushStatusList}
					onChange={value => {
						handleChange({ status: Number(value) });
					}}
				/>
			</Form.Item>
			<Form.Item
				label="阅读类型"
				name="readType"
				initialValue={defaultInitForm.readType}
			>
				<Radio.Group
					className="custom-radio-group"
					optionType="button"
					buttonStyle="solid"
					options={ArticleReadTypeList}
					onChange={e => {
						handleChange({ readType: Number(e.target.value) });
					}}
				/>
			</Form.Item>
			{selectedReadType === 4 && (
				<>
					<Form.Item label="支付方式" name="payWay" initialValue={defaultInitForm.payWay}>
						<Radio.Group
							options={PayWayList}
							onChange={e => {
								handleChange({ payWay: e.target.value });
							}}
						/>
					</Form.Item>
					<Form.Item
						label="付费金额"
						name="payAmount"
						initialValue={defaultInitForm.payAmount}
						rules={
							selectedPayWay === "email"
								? []
								: [
										{ required: true, message: "请输入付费金额" },
										{
											validator: (_, value) => {
												if (value == null || Number(value) <= 0) {
													return Promise.reject(new Error("付费金额必须大于 0"));
												}
												return Promise.resolve();
											}
										}
								  ]
						}
					>
						<InputNumber
							min={0.01}
							precision={2}
							style={{ width: "100%" }}
							addonAfter="元"
							onChange={value => {
								handleChange({ payAmount: Number(value || 0) });
							}}
						/>
					</Form.Item>
				</>
			)}
			<Form.Item name="categoryId" label="分类" rules={[{ required: true, message: "请选择一个分类" }]}>
				<Radio.Group
					className="custom-radio-group"
					optionType="button"
					buttonStyle="solid"
					options={CategoryTypeList}
				></Radio.Group>
			</Form.Item>
			<Form.Item label="标签" name="tagName" rules={[{ required: true, message: "请选择标签!" }]}>
				{/*用下拉框做一个教程的选择 */}
				<DebounceSelect
					onChange={selectedValues => {
						console.log("选中的值:", selectedValues);
						// @ts-ignore
						const keys = selectedValues.map(item => Number(item.key));

						console.log("keysString", keys);
						handleChange({ tagIds: keys });
					}}
				/>
			</Form.Item>
			</Form>
		</>
	);

	return (
		<div className="ArticleEdit">
			<ContentWrap>
				<Search
					status={status}
					handleReplaceImgUrl={handleReplaceImgUrl}
					handleImportWord={handleImportWord}
					handleImportMarkdown={handleImportMarkdown}
					handleOverwriteMarkdown={handleOverwriteImportedMarkdown}
					handleUploadVideo={handleUploadVideo}
					importedMarkdownFileName={importedMarkdownFileName}
					canOverwriteMarkdown={canOverwriteMarkdown}
					handleSave={handleSaveOrUpdate}
					goBack={goBack}
				/>
				<ContentInterWrap>
					<div
						ref={editorRootRef}
						className="markdown-body"
						style={{ position: "relative" }}
						onMouseDownCapture={handleEditorMouseDownCapture}
					>
						<Editor
							value={content}
							plugins={editorPlugins}
							editorConfig={editorConfig}
							locale={zhHans}
							uploadImages={files => {
								return Promise.all(
									files.map(file => {
										// 限制图片大小，不超过 5M
										if (file.size > 5 * 1024 * 1024) {
											return {
												url: "图片大小不能超过 5M"
											};
										}

										const formData = new FormData();
										formData.append("image", file);

										return uploadImgApi(formData).then(({ status, result }) => {
											const { code, msg } = status || {};
											const { imagePath } = result || {};
											if (code === 0) {
												return {
													url: imagePath
												};
											}
											return {
												url: msg
											};
										});
									})
								);
							}}
							onChange={v => {
								if (
									(suppressEditorChangeValueRef.current !== null && v === suppressEditorChangeValueRef.current) ||
									(!hasDraftChangesRef.current && v === contentRef.current)
								) {
									suppressEditorChangeValueRef.current = null;
									setContent(v);
									handleChange({ content: v }, false);
									return;
								}
								suppressEditorChangeValueRef.current = null;
								// 右侧的预览更新
								setContent(v);
								handleChange({ content: v });
							}}
						/>
						{target &&
							container &&
							createPortal(
								<Moveable
									ref={moveableRef}
									target={target}
									container={container}
									draggable={false}
									resizable={true}
									keepRatio={true}
									throttleResize={0}
									renderDirections={["nw", "ne", "sw", "se"]} // 只显示四个角的缩放柄，更符合图片操作
									ables={[RestoreAble]}
									props={{
										resetImageInMarkdown: resetImageInMarkdown,
										replaceImageInMarkdown: replaceImageInMarkdown,
										copyImageToClipboard: copyImageToClipboard
									}}
									onResize={({ target, width, height, drag }: OnResize) => {
										// 限制最小尺寸为 20px，防止图片消失
										const finalWidth = Math.max(20, width);
										const finalHeight = Math.max(20, height);

										const el = target as HTMLElement;
										el.style.width = `${finalWidth}px`;
										el.style.height = `${finalHeight}px`;

										// 如果有位移（通常由于中心点偏移引起），也应用到位移上
										el.style.transform = drag.transform;
									}}
									onResizeEnd={({ target }: OnResizeEnd) => {
										const el = target as HTMLElement;
										updateImageInMarkdown(el as HTMLImageElement, el.offsetWidth, el.offsetHeight);
									}}
									origin={false}
									edge={false} // 设为 false，避免边缘点击冲突
								/>,
								container
							)}
					</div>
				</ContentInterWrap>
			</ContentWrap>
			{/* 保存或者更新时打开的抽屉 */}
			<Drawer
				title={status === UpdateEnum.Edit ? "更新文章" : "保存文章"}
				placement="right"
				width={600}
				open={isOpenDrawerShow}
				onClose={handleClose}
				extra={
					<Space>
						<Button disabled={aiInitProgress?.running} onClick={handleAiInit}>
							初始
						</Button>
						<Button onClick={resetFrom}>重置</Button>
						<Button type="primary" onClick={handleSubmit}>
							{status === UpdateEnum.Edit ? "更新文章" : "确认保存"}
						</Button>
					</Space>
				}
			>
				{drawerContent}
			</Drawer>
		</div>
	);
};

const mapStateToProps = (state: any) => state.disc.disc;
const mapDispatchToProps = {};
export default connect(mapStateToProps, mapDispatchToProps)(ArticleEdit);
