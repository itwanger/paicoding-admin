/* eslint-disable prettier/prettier */
import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Moveable, { OnResize, OnResizeEnd } from "react-moveable";
import { connect } from "react-redux";
import { useLocation, useNavigate } from "react-router";
import { ReloadOutlined, SwapOutlined } from "@ant-design/icons";
import gemoji from "@bytemd/plugin-gemoji";
import gfm from "@bytemd/plugin-gfm";
import highlight from "@bytemd/plugin-highlight";
import math from "@bytemd/plugin-math";
import mediumZoom from "@bytemd/plugin-medium-zoom";
import { Editor } from "@bytemd/react";
import { Button, Drawer, Form, Input, message, Modal, Radio, Select, Space, UploadFile } from "antd";
import TextArea from "antd/es/input/TextArea";
import zhHans from "bytemd/locales/zh_Hans.json";
import mammoth from "mammoth";

import { generateArticleAiApi, getArticleApi, saveArticleApi, saveImgApi } from "@/api/modules/article";
import { uploadImgApi } from "@/api/modules/common";
import { getTagListApi } from "@/api/modules/tag";
import { ContentInterWrap, ContentWrap } from "@/components/common-wrap";
import { UpdateEnum } from "@/enums/common";
import { MapItem } from "@/typings/common";
import { getCompleteUrl } from "@/utils/util";
import DebounceSelect from "@/views/article/components/debounceselect/index";
import ImgUpload from "@/views/column/setting/components/imgupload";
import Search from "./search";

import "bytemd/dist/index.css";
import "./index.scss";
import "highlight.js/styles/default.css";
import "juejin-markdown-themes/dist/juejin.css";
import "katex/dist/katex.css";

// 自定义插件：为图片添加 alt 标题
const imageAltPlugin = () => ({
	viewerEffect({ markdownBody }: { markdownBody: HTMLElement }) {
		const images = markdownBody.querySelectorAll('img[alt]:not([alt=""])');
		images.forEach((img: Element) => {
			const imgElement = img as HTMLImageElement;
			const alt = imgElement.alt;

			// 检查是否已经添加过标题
			const parent = imgElement.parentElement;
			if (parent && parent.classList.contains('img-with-caption')) {
				return;
			}

			// 创建包装容器
			const wrapper = document.createElement('span');
			wrapper.className = 'img-with-caption';

			// 创建标题元素
			const caption = document.createElement('span');
			caption.className = 'img-caption';
			caption.textContent = alt;

			// 替换图片
			imgElement.parentNode?.insertBefore(wrapper, imgElement);
			wrapper.appendChild(imgElement);
			wrapper.appendChild(caption);
		});
	}
});

// 自定义插件：为图片添加可移动和缩放功能
const imageMoveablePlugin = (
	setTarget: (el: HTMLElement | null) => void, 
	onScroll: () => void,
	setContainer: (el: HTMLElement | null) => void,
	getScrollInfo: () => { pos: number, active: boolean, clear: () => void },
	setEditor: (editor: any) => void,
	getImageSizeMap: () => Map<string, { width: number, height: number } | 'reset'>
) => ({
	editorEffect({ editor }: { editor: any }) {
		setEditor(editor);
	},
	viewerEffect({ markdownBody }: { markdownBody: HTMLElement }) {
		const scrollContainer = markdownBody.parentElement;
		
		// 1. 应用缓存的图片尺寸
		const sizeMap = getImageSizeMap();
		const images = markdownBody.querySelectorAll('img');
		
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
			const src = img.getAttribute('src');
			if (!src) return;
			const fullUrl = resolveUrl(src);
			const state = sizeMap.get(fullUrl);
			if (state === 'reset') {
				// 强制清除样式（针对已经在源码中是 <img> 标签的情况）
				img.style.width = '';
				img.style.height = '';
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
			if (target.tagName === 'IMG') {
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

		markdownBody.addEventListener('click', handleClick);
		if (scrollContainer) {
			scrollContainer.addEventListener('scroll', handleScroll);
		}

		return () => {
			markdownBody.removeEventListener('click', handleClick);
			if (scrollContainer) {
				scrollContainer.removeEventListener('scroll', handleScroll);
			}
		};
	}
});

// 自定义 Moveable Able：将复原按钮集成到控制框中
const RestoreAble = {
	name: "restoreAble",
	always: true,
	render(moveable: any, React: any) {
		const { target, resetImageInMarkdown, replaceImageInMarkdown } = moveable.props;
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
					display: 'flex',
					gap: '8px'
				}}
			>
				<Button
					size="small"
					type="primary"
					icon={<SwapOutlined />}
					style={{ 
						fontSize: '12px', 
						height: '24px', 
						padding: '0 8px',
						boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
						border: 'none',
						display: 'flex',
						alignItems: 'center',
						gap: '4px',
						backgroundColor: '#52c41a' // 使用绿色区分替换功能
					}}
					onClick={(e) => {
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
						fontSize: '12px', 
						height: '24px', 
						padding: '0 8px',
						boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
						border: 'none',
						display: 'flex',
						alignItems: 'center',
						gap: '4px'
					}}
					onClick={(e) => {
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
	getScrollInfo: () => { pos: number, active: boolean, clear: () => void },
	setEditor: (editor: any) => void,
	getImageSizeMap: () => Map<string, { width: number, height: number } | 'reset'>
) => [
	gfm(),
	highlight(),
	gemoji(),
	math(),
	imageAltPlugin(),
	imageMoveablePlugin(setTarget, onScroll, setContainer, getScrollInfo, setEditor, getImageSizeMap),
	// Add more plugins here
]

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

export interface IFormType {
	articleId: number;// 文章id
	status: number; // 文章状态
	content: string; // 文章内容
	cover: string; // 封面
	tagIds: number[]; // 标签
	shortTitle: string; // 短标题
}

const defaultInitForm: IFormType = {
	articleId: 0,// 后台默认为 0
	status: 0,
	content: "",
	cover: "",
	tagIds: [],
	shortTitle: "",
}

const ArticleEdit: FC<IProps> = props => {
	const [formRef] = Form.useForm();

	const [form, setForm] = useState<IFormType>(defaultInitForm);

	// Moveable target
	const [target, setTarget] = useState<HTMLElement | null>(null);
	const [container, setContainer] = useState<HTMLElement | null>(null);
	const moveableRef = useRef<Moveable>(null);
	const editorRef = useRef<any>(null);

	// 缓存待提交的图片尺寸变更：Map<fullUrl, {width, height} | 'reset'>
	const imageSizeMapRef = useRef<Map<string, { width: number, height: number } | 'reset'>>(new Map());

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
	const getScrollInfo = useCallback(() => ({
		pos: scrollPosRef.current,
		active: isUpdatingContentRef.current,
		clear: () => { isUpdatingContentRef.current = false; }
	}), []);

	const setEditor = useCallback((editor: any) => {
		editorRef.current = editor;
	}, []);

	const getImageSizeMap = useCallback(() => imageSizeMapRef.current, []);

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
		window.addEventListener('resize', updateMoveable);
		return () => {
			window.removeEventListener('resize', updateMoveable);
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
	const [content, setContent] = useState<string>('');

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

	//@ts-ignore
	const { CategoryTypeList, CategoryType, PushStatusList } = props || {};

	const onSure = useCallback(() => {
		setQuery(prev => prev + 1);
	}, []);

	const handleChange = (item: MapItem) => {
		// 把变化的值放到 form 表单中，item 可以是 table 的一行数据（详情、编辑），也可以是单独的表单值发生变化
		setForm({ ...form, ...item });
	};

	const handleFormRefChange = (item: MapItem) => {
		// 当自定义组件更新时，对 formRef 也进行更新
		formRef.setFieldsValue({ ...item });
	};

	// 抽屉关闭
	const handleClose = () => {
		setIsOpenDrawerShow(false);
	};

	// 更新 Markdown 中的图片尺寸 (Lazy Update 策略)
	const updateImageInMarkdown = (imgElement: HTMLImageElement, width: number, height: number) => {
		const src = imgElement.getAttribute('src');
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
		const src = imgElement.getAttribute('src');
		if (!src) return;

		const fullUrl = resolveUrl(src);

		// 1. 在缓存中标记为 'reset'，而不是直接删除，这样批量更新时能知道要还原
		imageSizeMapRef.current.set(fullUrl, 'reset');

		// 2. 清除 DOM 样式
		imgElement.style.width = '';
		imgElement.style.height = '';

		// 3. 隐藏 Moveable
		setTarget(null);
		message.success("已重置尺寸（保存后同步到源码）");
	};

	// 替换图片功能 (立即更新策略)
	const replaceImageInMarkdown = (imgElement: HTMLImageElement) => {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = 'image/*';
		input.onchange = async (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (!file) return;

			// 限制图片大小
			if (file.size > 5 * 1024 * 1024) {
				message.error("图片大小不能超过 5M");
				return;
			}

			const formData = new FormData();
			formData.append("image", file);

			const hide = message.loading('正在上传新图片...', 0);
			try {
				// 发起上传请求
				const response = await uploadImgApi(formData);
				hide();
				
				// 这里的 response 已经是拦截器处理后的 data (ResultData)
				const { status, result } = (response as any) || {};
				
				if (status?.code === 0 && result?.imagePath) {
					const oldSrc = imgElement.getAttribute('src');
					const newSrc = result.imagePath;
					if (!oldSrc) return;

					const oldFullUrl = resolveUrl(oldSrc);
					const alt = imgElement.getAttribute('alt') || '';
					
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
							const doc = state?.doc?.toString() || (typeof editorRef.current.getValue === 'function' ? editorRef.current.getValue() : "");
							
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
										if (typeof editorRef.current.dispatch === 'function') {
											editorRef.current.dispatch({
												changes: { from: match.index, to: match.index + (match[0]?.length || 0), insert: replacement },
												selection: { anchor: match.index },
												scrollIntoView: true
											});
										} else if (typeof editorRef.current.replaceRange === 'function') {
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
											
											if (typeof editorRef.current.dispatch === 'function') {
												editorRef.current.dispatch({
													changes: { from: match.index, to: match.index + (match[0]?.length || 0), insert: replacement },
													selection: { anchor: match.index },
													scrollIntoView: true
												});
											} else if (typeof editorRef.current.replaceRange === 'function') {
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
								newContent = prevContent.substring(0, match.index) + replacement + prevContent.substring(match.index + match[0].length);
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
									newContent = prevContent.substring(0, match.index) + replacement + prevContent.substring(match.index + match[0].length);
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

	// 保存或者更新
	const handleSaveOrUpdate = async () => {
		// 1. 将缓存的图片尺寸变更批量应用到 Markdown 内容中
		const sizeMap = imageSizeMapRef.current;
		if (sizeMap.size > 0) {
			let newContent = content;
			const resolveUrl = (urlStr: string) => {
				if (!urlStr) return "";
				try {
					const cleanUrl = urlStr.split(/\s+/)[0];
					return new URL(decodeURIComponent(cleanUrl), window.location.origin).href;
				} catch (e) {
					return urlStr;
				}
			};

			// 匹配所有图片
			const mdImgRegex = /!\[(.*?)\]\((.*?)\)/g;
			const htmlImgRegex = /<img\s+[^>]*src=["'](.*?)["'][^>]*>/g;
			
			// 使用简单的 replace 回调处理批量更新
			newContent = newContent.replace(mdImgRegex, (match, alt, src) => {
				const fullUrl = resolveUrl(src);
				const state = sizeMap.get(fullUrl);
				if (state && typeof state === 'object') {
					return `<img src="${src.split(/\s+/)[0]}" alt="${alt}" width="${state.width}" height="${state.height}" />`;
				}
				return match;
			});

			newContent = newContent.replace(htmlImgRegex, (match, src) => {
				const fullUrl = resolveUrl(src);
				const state = sizeMap.get(fullUrl);
				
				// 提取原标签中的 alt 属性
				const altMatch = match.match(/alt=["'](.*?)["']/);
				const currentAlt = altMatch ? altMatch[1] : "";

				if (state === 'reset') {
					// 还原为 Markdown 语法，保留提取到的 alt
					return `![${currentAlt}](${src})`;
				} else if (state && typeof state === 'object') {
					// 替换或添加 width/height 属性，同时保留 alt
					return `<img src="${src}" alt="${currentAlt}" width="${state.width}" height="${state.height}" />`;
				}
				return match;
			});

			if (newContent !== content) {
				// 记录滚动位置，防止批量更新时跳动
				if (container) {
					scrollPosRef.current = container.scrollTop;
					isUpdatingContentRef.current = true;
				}
				
				setContent(newContent);
				handleChange({ content: newContent });
				// 清空缓存
				sizeMap.clear();
			}
		}

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
	}

	// 如果是外网的图片链接，转成内网的图片链接
	const uploadImages = async (newVal: string) => {
		// 正则表达式匹配所有图片
		const reg = /!\[(.*?)\]\((.*?)\)/mg;
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
				const originalUrl = src.split('?')[0]; // 去掉 query 参数
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
		const results = await Promise.all(
			uploadTasksWithInfo.map(task => task.uploadPromise)
		);

		// 按照图片在文本中的位置倒序排序，从后往前替换，避免索引错位
		const sortedTasks = [...uploadTasksWithInfo].sort((a, b) => b.imageInfo.index - a.imageInfo.index);

		// 替换所有图片链接
		let newContent = newVal;
		sortedTasks.forEach((task) => {
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
	}

	const handleReplaceImgUrl = async () => {
		const { content } = form;

		// 检查是否有外链图片或失败的图片需要转换
		const hasExternalImages = /!\[.*?\]\(https?:\/\/.*?\)/.test(content);
		if (!hasExternalImages) {
			message.info("当前内容中没有外链图片需要转换");
			return;
		}

		const result = await uploadImages(content);
		const { newContent, successCount, failedCount, skippedCount } = result;

		// 更新内容
		if (newContent !== content) {
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
			message.success(messages.join(', '));
		} else if (successCount > 0 && failedCount > 0) {
			message.warning(messages.join(', '));
		} else if (failedCount > 0) {
			message.error(messages.join(', '));
		} else if (skippedCount > 0) {
			message.info("所有外链图片都在 30 秒内已转换过,请稍后再试");
		} else {
			message.info("没有需要转换的图片");
		}
	}

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

	const handleImportMarkdown = () => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = ".md,.markdown,.txt,text/markdown,text/plain";
		input.style.display = "none";

		input.onchange = async (e: Event) => {
			const target = e.target as HTMLInputElement;
			const file = target.files?.[0];

			if (document.body.contains(input)) {
				document.body.removeChild(input);
			}

			if (!file) return;

			const fileName = file.name || "";
			const isMarkdown = /\.(md|markdown|txt)$/i.test(fileName);
			if (!isMarkdown) {
				message.error("仅支持 .md/.markdown/.txt 文件");
				return;
			}

			const loadingKey = "markdown-import-loading";
			message.loading({ content: "正在导入 Markdown...", key: loadingKey, duration: 0 });

			try {
				const raw = await file.text();
				let markdown = sanitizeYuqueMarkdown(raw);

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

				let articleTitle = "";
				const h1Match = markdown.match(/^\s*#\s+(.+)\s*$/m);
				if (h1Match) {
					articleTitle = h1Match[1].trim();
					markdown = markdown.replace(/^\s*#\s+.+\s*\n*/m, "").trimStart();
				}

				if (shouldImport === "append") {
					const finalMarkdown = (content ? content.trimEnd() : "") + "\n\n---\n\n" + markdown;
					setContent(finalMarkdown);
					handleChange({ content: finalMarkdown });
					message.success({ content: "Markdown 已追加到末尾", key: loadingKey });
				} else {
					setContent(markdown);
					if (articleTitle) {
						handleChange({ content: markdown, shortTitle: articleTitle });
						formRef.setFieldsValue({ shortTitle: articleTitle });
					} else {
						handleChange({ content: markdown });
					}
					message.success({ content: "Markdown 已导入", key: loadingKey });
				}
			} catch (error) {
				console.error("导入 Markdown 失败:", error);
				message.error({ content: "导入失败，请确保文件内容正确", key: loadingKey });
			}
		};

		document.body.appendChild(input);
		input.click();
	};

	// 导入 Word 文档
	const handleImportWord = () => {
		console.log('=== 开始导入 Word 文档 ===');
		
		// 定义已知的代码块 styleId
		const codeBlockStyleIds = [
			'23', 
			'_Style 23', 
			'ne-codeblock', 
			'Code', 
			'代码', 
			'Preformatted', 
			'HTML Preformatted',
			'Source Code',
			'Plain Text',
			'Consolas',
			'Courier New',
			'Monospaced'
		];
		
		// 定义转换函数
		function transformElement(element: any): any {
			// 处理段落：如果有 styleId 但没有 styleName，尝试修复
			if (element.type === 'paragraph' && element.styleId && !element.styleName) {
				if (codeBlockStyleIds.some(id => element.styleId.includes(id))) {
					element.styleName = element.styleId;  // 用 styleId 作为 styleName
				}
			}
			
			// 语雀代码块处理：语雀导出的 docx 中，代码块可能带有特定的 styleId
			if (element.type === 'paragraph' && element.styleId && element.styleId.includes('code')) {
				element.styleName = 'ne-codeblock';
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
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
		input.style.display = 'none';
		
		input.onchange = async (e: Event) => {
			console.log('change 事件触发');
			const target = e.target as HTMLInputElement;
			const file = target.files?.[0];
			console.log('选中的文件:', file);
			
			// 清理 DOM
			if (document.body.contains(input)) {
				document.body.removeChild(input);
			}
			
			if (!file) {
				console.log('没有选择文件');
				return;
			}
			
			if (!file.name.endsWith('.docx')) {
				console.error('文件类型错误:', file.name);
				message.error('仅支持 .docx 格式的 Word 文档');
				return;
			}
			
			try {
				console.log('开始转换文件...');
				const loadingKey = 'word-import-loading';
				message.loading({ content: '正在导入 Word 文档...', key: loadingKey, duration: 0 });
				
				const arrayBuffer = await file.arrayBuffer();
				console.log('文件读取成功，大小:', arrayBuffer.byteLength);
				
				// 配置 mammoth 选项
				const styleMap = [
					// 代码块样式
					"p[style-name='_Style 23'] => pre.code-block",
					"p[style-name='ne-codeblock'] => pre.code-block",  // 语雀导出的文档
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
				].join('\n');
				
				const result = await (mammoth as any).convertToHtml({ 
					arrayBuffer, 
					styleMap: styleMap,
					transformDocument: transformDocument,
					includeDefaultStyleMap: true
				});
				const html = result.value;
				console.log('HTML 转换成功，长度:', html.length);
				
				// 打印样式警告信息（可以看到文档中有哪些样式）
				if (result.messages && result.messages.length > 0) {
					console.warn('样式信息和警告:');
					result.messages.forEach((msg: any) => {
						console.warn(`- ${msg.type}: ${msg.message}`);
					});
				}
				
				// 打印完整的 HTML（移除 base64 图片避免过长）
				const htmlWithoutImages = html.replace(/src="data:image[^"]*"/g, 'src="[base64]"');
				console.log('=== 完整的 HTML 内容开始 ===');
				console.log(htmlWithoutImages);
				console.log('=== 完整的 HTML 内容结束 ===');
				
				// 预处理：将包含多个 br 的段落或符合代码特征的段落转换为代码块
				let processedHtml = html.replace(/<p>([\s\S]*?)<\/p>/gi, (match: string, content: string) => {
					// 统计 br 标签数量
					const brCount = (content.match(/<br\s*\/?>/gi) || []).length;
					
					// 如果有 1 个以上的 br (至少两行)，或者包含明显的代码关键字
					const codeKeywords = /\b(FROM|RUN|COPY|WORKDIR|ENTRYPOINT|CMD|ENV|EXPOSE|VOLUME|ARG|import|export|const|let|var|function|class|def|public|private|protected|package|interface|docker|maven|mvn|git|npm|yarn|pip|npm install|yarn add|void|static|return|if|else|for|while|switch|case|break|continue|try|catch|finally|throw|new|this|super|extends|implements|abstract|final|native|synchronized|transient|volatile|strictfp|assert|instanceof|boolean|byte|char|double|float|int|long|short|String|Integer|Long|Double|Float|Boolean|Map|List|Set|HashMap|ArrayList|HashSet|Stream|Optional|Response|Request|Controller|Service|Repository|Component|Autowired|Resource|Value|RequestMapping|GetMapping|PostMapping|PutMapping|DeleteMapping|PathVariable|RequestParam|RequestBody|ResponseBody|Data|AllArgsConstructor|NoArgsConstructor|Builder|Slf4j|SpringBootApplication|Configuration|Bean|Override|System\.out\.println|console\.log|println|def|fn|lambda|async|await|promise|resolve|reject|fetch|axios|api|admin|paicoding|CompletableFuture|supplyAsync|thenAccept|thenApply|thenRun|handle|exceptionally|executor|submit|execute|TtlRunnable|TtlExecutors|log|info|debug|error|warn|trace|logger|RequestContext)\b/i;
					
					const textContent = content.replace(/<[^>]+>/g, '').trim(); // 移除所有标签查看纯文本
					
					// 如果包含 CodeMirror 相关的类名，通常也是代码
					const isCodeMirror = content.includes('CodeMirror-line') || content.includes('cm-text');

					// 识别单行代码特征：Lambda 表达式、方法链、分号结尾、或者包含典型的代码符号组合
					const isSingleLineCode = (
						((textContent.includes('->') || textContent.includes('=>')) && textContent.includes('(')) || // Lambda
						(textContent.includes('.') && textContent.includes('(') && textContent.includes(')')) || // 方法调用/链
						(textContent.endsWith(';') && textContent.length > 5) || // 以分号结尾
						(textContent.includes('{') && textContent.includes('}')) || // 包含大括号
						(textContent.includes('(') && textContent.includes(')') && textContent.includes('=')) // 赋值调用
					);

					// 1. 如果有 1 个以上的 br 且匹配关键字
					// 2. 如果文本内容看起来像代码（例如以特定字符开头或包含特定结构）
					// 3. 包含 CodeMirror 特征
					// 4. 符合单行代码特征且包含关键字
					if (isCodeMirror || (brCount >= 1 && codeKeywords.test(textContent)) || 
						(isSingleLineCode && codeKeywords.test(textContent)) ||
						(textContent.length > 5 && (
							(textContent.startsWith('import ') || textContent.startsWith('package ')) ||
							(textContent.includes('public static void main')) ||
							(textContent.includes('class ') && textContent.includes('{')) ||
							(textContent.includes('function') && textContent.includes(')')) ||
							(textContent.includes('const ') && textContent.includes('=')) ||
							(textContent.includes('let ') && textContent.includes('='))
						))) {
						console.log('检测到潜在代码块，内容预览:', textContent.substring(0, 100));
						return '<pre class="code-block">' + content + '</pre>';
					}
					return match;
				});
				
				// 处理已经存在的 pre 标签（可能是 CodeMirror 产生的）
				processedHtml = processedHtml.replace(/<pre[^>]*class="[^"]*CodeMirror-line[^"]*"[^>]*>([\s\S]*?)<\/pre>/gi, (match: string, content: string) => {
					return '<pre class="code-block">' + content + '</pre>';
				});

				// 合并相邻的代码块
				processedHtml = processedHtml.replace(/<\/pre>\s*<pre class="code-block">/gi, '<br/>');
				
				console.log('=== 预处理后的 HTML 开始 ===');
				const processedWithoutImages = processedHtml.replace(/src="data:image[^"]*"/g, 'src="[base64]"');
				console.log(processedWithoutImages);
				console.log('=== 预处理后的 HTML 结束 ===');
				
				// 清理空锚点标签（包括有 id 或 name 属性但内容为空或仅有空白字符的 a 标签）
				// 语雀的锚点通常是 <a id="xxx"></a>
				console.log('=== 开始清理语雀锚点 ===');
				processedHtml = processedHtml.replace(/<a(?![^>]*\bhref\b)[^>]*>([\s\S]*?)<\/a>/gi, (match: string, content: string) => {
					const textContent = content.replace(/<[^>]+>/g, '').trim();
					if (textContent === '') {
						console.log('移除空锚点:', match);
						return '';
					}
					// 如果不是空的，则保留内容但移除 a 标签
					console.log('移除锚点标签但保留内容:', match);
					return content;
				});
				
				// 针对语雀特定的锚点格式进一步加强清理
				processedHtml = processedHtml.replace(/<a\s+(?:id|name|data-anchor)="[^"]*"\s*>\s*<\/a>/gi, '');
				processedHtml = processedHtml.replace(/<a\s+[^>]*\b(?:id|name|data-anchor)="[^"]*"[^>]*>\s*<\/a>/gi, '');
				
				const afterClean = processedHtml.substring(0, 500);
				console.log('清理后（前500字符）:', afterClean);
				console.log('=== 空锚点清理完成 ===');
				
				// 关闭初始的 loading
				message.destroy(loadingKey);
				
				// 先询问用户是否继续导入
				const shouldImport = await new Promise<'append' | 'replace' | 'cancel'>((resolve) => {
					if (content && content.trim()) {
						console.log('编辑器有内容，询问用户');
						const modal = Modal.info({
							title: '当前编辑器有内容',
							content: 'Word 文档中包含图片需要上传，是否继续导入？',
							icon: null,
							closable: true,
							okButtonProps: { style: { display: 'none' } },
							footer: (
								<div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
									<Button
										onClick={() => {
											console.log('用户取消导入');
											modal.destroy();
											resolve('cancel');
										}}
									>
										取消
									</Button>
									<Button
										onClick={() => {
											console.log('用户选择: 替换');
											modal.destroy();
											resolve('replace');
										}}
									>
										替换内容
									</Button>
									<Button
										type="primary"
										onClick={() => {
											console.log('用户选择: 追加');
											modal.destroy();
											resolve('append');
										}}
									>
										追加到末尾
									</Button>
								</div>
							)
						});
					} else {
						resolve('replace');
					}
				});
				
				if (shouldImport === 'cancel') {
					message.info('已取消导入');
					console.log('用户取消导入');
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
								formData.append('image', file);
								
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
							htmlWithUploadedImages = htmlWithUploadedImages.replace(
								result.original,
								`<img src="${result.uploaded}">`
							);
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
				let cleanedHtml = htmlWithUploadedImages.replace(/<a(?![^>]*\bhref\b)[^>]*>([\s\S]*?)<\/a>/gi, (match: string, content: string) => {
					const textContent = content.replace(/<[^>]+>/g, '').trim();
					return textContent === '' ? '' : content;
				});
				cleanedHtml = cleanedHtml.replace(/<a\s+(?:id|name|data-anchor)="[^"]*"\s*>\s*<\/a>/gi, '');
				
				let markdown = cleanedHtml
					.replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n')
					.replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n')
					.replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n')
					.replace(/<h4>(.*?)<\/h4>/gi, '#### $1\n\n')
					.replace(/<h5>(.*?)<\/h5>/gi, '##### $1\n\n')
					.replace(/<h6>(.*?)<\/h6>/gi, '###### $1\n\n')
					.replace(/<(?:strong|b)>([\s\S]*?)([。，！？；：,.!?;:]*)<\/(?:strong|b)>/gi, '**$1**$2')
					.replace(/<em>(.*?)<\/em>/gi, '*$1*')
					.replace(/<i>(.*?)<\/i>/gi, '*$1*')
					.replace(/<li>([\s\S]*?)<\/li>/gi, (match: string, content: string) => {
						const innerContent = content
							.replace(/<p>/gi, '')
							.replace(/<\/p>/gi, '')
							.trim();
						return '- ' + innerContent + '\n';
					})
					.replace(/<\/ul>/gi, '\n\n')
					.replace(/<\/ol>/gi, '\n\n')
					.replace(/<ul>/gi, '\n')
					.replace(/<ol>/gi, '\n')
					// 处理表格 - 转换为 Markdown 表格格式
					.replace(/<table>([\s\S]*?)<\/table>/gi, (match: string, tableContent: string) => {
						// 解析表格行
						const rows = tableContent.match(/<tr>([\s\S]*?)<\/tr>/gi) || [];
						if (rows.length === 0) return match;
						
						let markdownTable = '\n';
						
						rows.forEach((row: string, rowIndex: number) => {
							// 提取单元格（支持 td 和 th）
							const cells = row.match(/<t[dh]>([\s\S]*?)<\/t[dh]>/gi) || [];
							const cellContents = cells.map((cell: string) => {
								// 移除单元格标签，保留内容
								let content = cell
									.replace(/<t[dh]>/gi, '')
									.replace(/<\/t[dh]>/gi, '')
									.replace(/<p>/gi, '')
									.replace(/<\/p>/gi, ' ')
									.replace(/<a[^>]*>(.*?)<\/a>/gi, '$1')
									.replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
									.replace(/<em>(.*?)<\/em>/gi, '*$1*')
									.replace(/<[^>]+>/g, '')
									.trim();
								return content || ' ';
							});
							
							// 构建 Markdown 表格行
							markdownTable += '| ' + cellContents.join(' | ') + ' |\n';
							
							// 第一行后添加分隔线
							if (rowIndex === 0) {
								markdownTable += '| ' + cellContents.map(() => '---').join(' | ') + ' |\n';
							}
						});
						
						return markdownTable + '\n';
					})
					// 处理代码块 - 匹配我们自定义的 class
					.replace(/<pre class="code-block">([\s\S]*?)<\/pre>/gi, (match: string, code: string) => {
						const decoded = code
							.replace(/<p>/gi, '')
							.replace(/<\/p>/gi, '\n')
							.replace(/<br\s*\/?>/gi, '\n')
							.replace(/<[^>]+>/g, '') // 移除代码块内部的所有其他标签（如 CodeMirror 的 span）
							.replace(/&ZeroWidthSpace;/g, '') // 移除零宽字符
							.replace(/&lt;/g, '<')
							.replace(/&gt;/g, '>')
							.replace(/&amp;/g, '&')
							.replace(/&quot;/g, '"')
							.replace(/&#39;/g, "'")
							.trim();
						
						// 检测代码语言
						let language = '';
						
						// Java 代码特征
						if (/\b(public|private|protected|class|interface|enum|package|import)\s+/i.test(decoded) ||
								/\bpublic\s+static\s+void\s+main/i.test(decoded)) {
							language = 'java';
						}
						// Dockerfile 特征
						else if (/^FROM\s+/im.test(decoded) || /^RUN\s+/im.test(decoded)) {
							language = 'dockerfile';
						}
						
						return '```' + language + '\n' + decoded + '\n```\n\n';
					})
					// 处理普通的 pre 标签
					.replace(/<pre[^>]*><code>([\s\S]*?)<\/code><\/pre>/gi, (match: string, code: string) => {
						const decoded = code
							.replace(/<[^>]+>/g, '') // 移除内部标签
							.replace(/&ZeroWidthSpace;/g, '')
							.replace(/&lt;/g, '<')
							.replace(/&gt;/g, '>')
							.replace(/&amp;/g, '&')
							.replace(/&quot;/g, '"')
							.replace(/&#39;/g, "'");
						
						// 检测代码语言
						let language = '';
						
						// Java 代码特征
						if (/\b(public|private|protected|class|interface|enum|package|import)\s+/i.test(decoded) ||
								/\bpublic\s+static\s+void\s+main/i.test(decoded)) {
							language = 'java';
						}
						// Dockerfile 特征
						else if (/^FROM\s+/im.test(decoded) || /^RUN\s+/im.test(decoded)) {
							language = 'dockerfile';
						}
						
						return '```' + language + '\n' + decoded + '\n```\n\n';
					})
					.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (match: string, code: string) => {
						const decoded = code
							.replace(/<[^>]+>/g, '') // 移除内部标签
							.replace(/&ZeroWidthSpace;/g, '')
							.replace(/&lt;/g, '<')
							.replace(/&gt;/g, '>')
							.replace(/&amp;/g, '&')
							.replace(/&quot;/g, '"')
							.replace(/&#39;/g, "'");
						
						// 检测代码语言
						let language = '';
						
						// Java 代码特征
						if (/\b(public|private|protected|class|interface|enum|package|import)\s+/i.test(decoded) ||
								/\bpublic\s+static\s+void\s+main/i.test(decoded)) {
							language = 'java';
						}
						// Dockerfile 特征
						else if (/^FROM\s+/im.test(decoded) || /^RUN\s+/im.test(decoded)) {
							language = 'dockerfile';
						}
						
						return '```' + language + '\n' + decoded + '\n```\n\n';
					})
					// 行内代码
					.replace(/<code>(.*?)<\/code>/gi, '`$1`')
					.replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
					.replace(/<a href="(.*?)">(.*?)<\/a>/gi, '[$2]($1)')
					.replace(/<img src="(.*?)" alt="(.*?)">/gi, '![$2]($1)')
					.replace(/<img src="(.*?)">/gi, '![]($1)')
					.replace(/<br\s*\/?>/gi, '\n')
					.replace(/<[^>]+>/g, '')
				// 最终全局清洗：保护代码块内部的缩进
				let inCodeBlock = false;
				markdown = markdown
					.replace(/&ZeroWidthSpace;/g, '') // 全局移除零宽字符
					.split('\n')
					.map((line: string) => {
						const trimmedLine = line.trim();
						// 检测代码块边界
						if (trimmedLine.startsWith('```')) {
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
					.join('\n')
					.replace(/\n{3,}/g, '\n\n')
					.trim();
				
				console.log('Markdown 转换成功，长度:', markdown.length);

				// 提取一级标题并同步到文章标题
				let articleTitle = '';
				const h1Match = markdown.match(/^#\s+(.+)$/m);
				if (h1Match) {
					articleTitle = h1Match[1].trim();
					console.log('检测到一级标题，同步为文章标题:', articleTitle);
					// 从正文中移除一级标题及其后的换行
					markdown = markdown.replace(/^#\s+.+\n*/m, '').trimStart();
				}

				console.log('=== 完整的 Markdown 内容开始 ===');
				console.log(markdown);
				console.log('=== 完整的 Markdown 内容结束 ===');
				
				// 先关闭 loading
				message.destroy();
				
				// 根据用户之前的选择来处理内容
				if (shouldImport === 'append') {
					console.log('执行追加操作');
					const finalMarkdown = content + '\n\n---\n\n' + markdown;
					setContent(finalMarkdown);
					handleChange({ content: finalMarkdown });
					message.success('Word 文档已追加到末尾');
				} else {
					console.log('执行替换操作');
					setContent(markdown);
					// 如果提取到了标题，同步更新标题
					if (articleTitle) {
						handleChange({ content: markdown, shortTitle: articleTitle });
						formRef.setFieldsValue({ shortTitle: articleTitle });
					} else {
						handleChange({ content: markdown });
					}
					message.success('Word 文档已导入');
				}
				
				console.log('=== Word 导入完成 ===');
			} catch (error) {
				console.error('❌ 导入失败:', error);
				message.destroy();
				message.error('导入失败，请确保文件格式正确');
			}
		};
		
		// 必须先添加到 DOM，Chrome 才允许触发
		document.body.appendChild(input);
		console.log('input 已添加到 DOM');
		// 立即触发 click，必须在同一个事件循环中
		input.click();
		console.log('click 事件已触发');
	};

	// AI 初始化文章信息
	const handleAiInit = async () => {
		const { shortTitle, content } = form;
		if (!shortTitle) {
			message.warning("请先输入或从 Word 导入短标题");
			return;
		}

		const loadingKey = 'ai-init-loading';
		message.loading({ content: '正在 AI 初始化文章信息...', key: loadingKey, duration: 0 });

		try {
			// 1. 调用 AI 接口生成标题和简介
			const { status: aiStatus, result: aiResult } = await generateArticleAiApi({
				shortTitle: shortTitle,
				content: content.substring(0, 400)
			});

			if (aiStatus?.code === 0 && aiResult) {
				const { title, description } = aiResult as any;
				console.log('AI 初始化成功:', { title, description });

				// 2. 准备回填数据
				const updateData: MapItem = {
					title,
					summary: description,
					status: 0
				};

				// 3. 设置分类默认值为“星球专栏”
				const planetCategory = CategoryTypeList?.find((item: any) => item.label === "星球专栏");
				if (planetCategory) {
					updateData.categoryId = planetCategory.value;
					console.log('自动选择分类:', planetCategory.label);
				}

				// 4. 设置标签默认值为第一个
				try {
					const response = await getTagListApi({
						status: 1,
						tag: "",
						pageNumber: 1,
						pageSize: 1
					}) as any;

					const { status: tagStatus, result: tagResult } = response;

					if (tagStatus?.code === 0 && tagResult?.list?.length > 0) {
						const firstTag = tagResult.list[0];
						updateData.tagIds = [firstTag.tagId];
						// 同步回填到 DebounceSelect（它在 Form 中受控）
						formRef.setFieldsValue({
							tagName: [{
								key: firstTag.tagId,
								label: firstTag.tag,
								value: firstTag.tag
							}]
						});
						console.log('自动选择标签:', firstTag.tag);
					}
				} catch (tagError) {
					console.warn('获取默认标签失败:', tagError);
				}

				// 5. 执行回填
				handleChange(updateData);
				formRef.setFieldsValue({
					title,
					summary: description,
					status: "0",
					categoryId: updateData.categoryId
				});

				message.success({ content: 'AI 初始化成功', key: loadingKey });
			} else {
				message.error({ content: aiStatus?.msg || 'AI 初始化失败', key: loadingKey });
			}
		} catch (error) {
			console.error('AI 初始化出错:', error);
			message.error({ content: '网络错误，AI 初始化失败', key: loadingKey });
		}
	};

	// 编辑或者新增时提交数据到服务器端
	const handleSubmit = async () => {
		// 又 from 中获取数据，需要转换格式的数据
		const { articleId, cover, content, tagIds, shortTitle } = form;
		console.log("handleSubmit 时看看form的值", form);
		// content 为空的时候，提示用户
		if (!content) {
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

		// 新的值传递到后端
		const newValues = {
			...values,
			status: Number(values.status),
			content: content,
			tagIds: tagIds,
			shortTitle: shortTitle,
			// 确定的参数
			articleType: "BLOG",
			source: 2,
			// 草稿还是发布
			actionType: "post",
			articleId: status === UpdateEnum.Save ? UpdateEnum.Save : articleId,
		};
		console.log("submit 之前的所有值:", newValues);

		const { status: successStatus } = (await saveArticleApi(newValues)) || {};
		const { code, msg } = successStatus || {};
		if (code === 0) {
			message.success("成功");
			// 返回文章列表页
			goBack();
		} else {
			message.error(msg || "失败");
		}
	};

	// 数据请求，这是一个钩子，query, current, pageSize, search 有变化的时候就会自动触发
	useEffect(() => {
		const getArticle = async () => {
			console.log("此时是否还有 ", articleId, status);
			const { status: resultStatus, result } = await getArticleApi(
				articleId
			);
			const { code } = resultStatus || {};
			if (code === 0 && status === UpdateEnum.Edit) { 
				console.log("result", result);

				// 如果 status 为编辑，就请求数据
				// 设置文章内容，编辑器使用
				setContent(result?.content);

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
				// 填充表单
				formRef.setFieldsValue({
					title: result?.title,
					shortTitle: result?.shortTitle,
					summary: result?.summary,
					cover: coverUrl,
					status: result?.status?.toString(),
					categoryId: result?.category?.categoryId,
					tagName: result?.tags?.map((item: TagValue) => ({
						key: item?.tagId,
						label: item?.tag,
						value: item?.tag
					}))
				});

				// 保存的时候需要
				handleChange({
					content: result?.content,
					articleId: result?.articleId,
					shortTitle: result?.shortTitle,
					status: result?.status,
				});
			 }
		};
	
		getArticle();
	}, []);

	// 标题、分类、标签、封面、简介
	const drawerContent = (
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
        name="categoryId"
        label="分类"
        rules={[{ required: true, message: '请选择一个分类' }]}
      >
        <Radio.Group 
					className="custom-radio-group"
					optionType="button" 
					buttonStyle="solid"
					options={CategoryTypeList}>
        </Radio.Group>
      </Form.Item>
			<Form.Item 
				label="标签" 
				name="tagName" 
				rules={[{ required: true, message: "请选择标签!" }]}>
				{/*用下拉框做一个教程的选择 */}
				<DebounceSelect
					onChange={
						(selectedValues) => {
							console.log('选中的值:', selectedValues);
							// @ts-ignore
							const keys = selectedValues.map(item => Number(item.key));

							console.log('keysString', keys);
							handleChange({ tagIds: keys });
						}
					}
				/>
			</Form.Item>
		</Form>
	);

	return (
		<div className="ArticleEdit">
			<ContentWrap>
				<Search
					status={status}
					handleReplaceImgUrl={handleReplaceImgUrl}
					handleImportWord={handleImportWord}
					handleImportMarkdown={handleImportMarkdown}
					handleSave={handleSaveOrUpdate}
					goBack={goBack}
				/>
				<ContentInterWrap>
					<div className="markdown-body" style={{ position: 'relative' }}>
						<Editor
							value={content}
							plugins={editorPlugins}
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
								// 右侧的预览更新
								setContent(v);
								handleChange({ content: v });
							}}
						/>
						{target && container && createPortal(
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
									replaceImageInMarkdown: replaceImageInMarkdown
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
						<Button onClick={handleAiInit}>初始</Button>
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
