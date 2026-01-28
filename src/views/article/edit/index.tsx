/* eslint-disable prettier/prettier */
import { FC, useCallback, useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { useLocation, useNavigate } from "react-router";
import gemoji from '@bytemd/plugin-gemoji';
import gfm from '@bytemd/plugin-gfm';
import highlight from "@bytemd/plugin-highlight";
import math from '@bytemd/plugin-math';
import mediumZoom from '@bytemd/plugin-medium-zoom';
import { Editor } from '@bytemd/react';
import { Button, Drawer, Form, Input, message, Modal, Radio, Space, UploadFile } from "antd";
import TextArea from "antd/es/input/TextArea";
import zhHans from 'bytemd/locales/zh_Hans.json';
import mammoth from 'mammoth';

import { getArticleApi, saveArticleApi, saveImgApi } from "@/api/modules/article";
import { uploadImgApi } from "@/api/modules/common";
import { ContentInterWrap, ContentWrap } from "@/components/common-wrap";
import { UpdateEnum } from "@/enums/common";
import { MapItem } from "@/typings/common";
import { getCompleteUrl } from "@/utils/util";
import DebounceSelect from "@/views/article/components/debounceselect/index";
import ImgUpload from "@/views/column/setting/components/imgupload";
import Search from "./search";

import 'katex/dist/katex.css';
import 'highlight.js/styles/default.css';
import 'bytemd/dist/index.css';
import 'juejin-markdown-themes/dist/juejin.css';
import "./index.scss";

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

const plugins = [
	gfm(),
	highlight(),
	gemoji(),
	math(),
	mediumZoom(),
	imageAltPlugin(),
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
}

const defaultInitForm: IFormType = {
	articleId: 0,// 后台默认为 0
	status: 0,
	content: "",
	cover: "",
	tagIds: [],
}

const ArticleEdit: FC<IProps> = props => {
	const [formRef] = Form.useForm();

	const [form, setForm] = useState<IFormType>(defaultInitForm);

	// 抽屉
	const [isOpenDrawerShow, setIsOpenDrawerShow] = useState<boolean>(false);
	// 文章内容
	const [content, setContent] = useState<string>('');
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
	console.log("看看前面是否把参数传递了过来", articleId, status);

	// 声明一个 coverList，封面
	const [coverList, setCoverList] = useState<UploadFile[]>([]);

	//@ts-ignore
	const { CategoryTypeList, CategoryType} = props || {};
	console.log("CategoryTypeList", CategoryTypeList, CategoryType);

	const onSure = useCallback(() => {
		setQuery(prev => prev + 1);
	}, []);

	const handleChange = (item: MapItem) => {
		// 把变化的值放到 form 表单中，item 可以是 table 的一行数据（详情、编辑），也可以是单独的表单值发生变化
		setForm({ ...form, ...item });
		console.log("handleChange 时看看form的值", item);
	};

	const handleFormRefChange = (item: MapItem) => {
		// 当自定义组件更新时，对 formRef 也进行更新
		console.log("handleFormRefChange 时看看form的值", item);
		formRef.setFieldsValue({ ...item });
	};

	// 抽屉关闭
	const handleClose = () => {
		setIsOpenDrawerShow(false);
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
		// 弹出抽屉
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

	// 导入 Word 文档
	const handleImportWord = () => {
		console.log('=== 开始导入 Word 文档 ===');
		
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
				message.loading('正在导入 Word 文档...', 0);
				
				const arrayBuffer = await file.arrayBuffer();
				console.log('文件读取成功，大小:', arrayBuffer.byteLength);
				
				// 配置 mammoth 选项
				const options = {
					styleMap: [
						// Word 文档中的代码样式（根据警告信息得出）
						"p[style-name='_Style 23'] => pre.code-block",
						// 其他常见代码样式作为备选
						"p[style-name='Code'] => pre.code-block",
						"p[style-name='代码'] => pre.code-block",
						"p[style-name='HTML Preformatted'] => pre.code-block",
						"p[style-name='Preformatted Text'] => pre.code-block",
						"p[style-name='Source Code'] => pre.code-block"
					],
					includeDefaultStyleMap: true
				};
				
				const result = await mammoth.convertToHtml({ arrayBuffer, ...options });
				const html = result.value;
				console.log('HTML 转换成功，长度:', html.length);
				
				// 打印样式警告信息（可以看到文档中有哪些样式）
				if (result.messages && result.messages.length > 0) {
					console.warn('样式信息和警告:');
					result.messages.forEach(msg => {
						console.warn(`- ${msg.type}: ${msg.message}`);
					});
				}
				
				// 打印完整的 HTML（移除 base64 图片避免过长）
				const htmlWithoutImages = html.replace(/src="data:image[^"]*"/g, 'src="[base64]"');
				console.log('=== 完整的 HTML 内容开始 ===');
				console.log(htmlWithoutImages);
				console.log('=== 完整的 HTML 内容结束 ===');
				
				// 预处理：将包含多个 br 的段落转换为代码块
				let processedHtml = html.replace(/<p>([\s\S]*?)<\/p>/gi, (match, content) => {
					// 统计 br 标签数量
					const brCount = (content.match(/<br\s*\/?>/gi) || []).length;
					
					// 如果有 3 个以上的 br，并且包含代码关键字
					if (brCount >= 3) {
						const codeKeywords = /(?:FROM|RUN|COPY|WORKDIR|ENTRYPOINT|CMD|ENV|EXPOSE|VOLUME|ARG|#\s*[阶段|步骤]|import|export|const|let|var|function|class|def|public|private|docker|maven)/i;
						const textContent = content.replace(/<[^>]+>/g, ''); // 移除所有标签查看纯文本
						
						if (codeKeywords.test(textContent)) {
							console.log('检测到代码块，br 数量:', brCount);
							console.log('内容预览:', textContent.substring(0, 100));
							return '<pre class="code-block">' + content + '</pre>';
						}
					}
					return match;
				});
				
				console.log('=== 预处理后的 HTML 开始 ===');
				const processedWithoutImages = processedHtml.replace(/src="data:image[^"]*"/g, 'src="[base64]"');
				console.log(processedWithoutImages);
				console.log('=== 预处理后的 HTML 结束 ===');
				
				// 处理图片：提取 base64 图片并上传
				const base64Images = processedHtml.match(/<img src="data:image\/(.*?);base64,(.*?)"(.*?)>/gi) || [];
				console.log(`找到 ${base64Images.length} 张 base64 图片`);
				
				let htmlWithUploadedImages = processedHtml;
				
				if (base64Images.length > 0) {
					message.loading(`正在上传 ${base64Images.length} 张图片...`, 0);
					
					// 上传所有图片
					const uploadPromises = base64Images.map(async (imgTag, index) => {
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
							for (let i = 0; i < byteString.length; i++) {
								uint8Array[i] = byteString.charCodeAt(i);
							}
							const blob = new Blob([arrayBuffer], { type: `image/${imageType}` });
							
							// 创建 File 对象
							const file = new File([blob], `word-image-${Date.now()}-${index}.${imageType}`, {
								type: `image/${imageType}`
							});
							
							// 上传图片
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
					
					// 等待所有图片上传完成
					const uploadResults = await Promise.all(uploadPromises);
					
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
				
				let markdown = htmlWithUploadedImages
					.replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n')
					.replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n')
					.replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n')
					.replace(/<h4>(.*?)<\/h4>/gi, '#### $1\n\n')
					.replace(/<h5>(.*?)<\/h5>/gi, '##### $1\n\n')
					.replace(/<h6>(.*?)<\/h6>/gi, '###### $1\n\n')
					.replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
					.replace(/<b>(.*?)<\/b>/gi, '**$1**')
					.replace(/<em>(.*?)<\/em>/gi, '*$1*')
					.replace(/<i>(.*?)<\/i>/gi, '*$1*')
					.replace(/<li>(.*?)<\/li>/gi, '- $1\n')
					.replace(/<\/ul>/gi, '\n')
					.replace(/<\/ol>/gi, '\n')
					.replace(/<ul>/gi, '')
					.replace(/<ol>/gi, '')
					// 处理表格 - 转换为 Markdown 表格格式
					.replace(/<table>([\s\S]*?)<\/table>/gi, (match, tableContent) => {
						// 解析表格行
						const rows = tableContent.match(/<tr>([\s\S]*?)<\/tr>/gi) || [];
						if (rows.length === 0) return match;
						
						let markdownTable = '\n';
						
						rows.forEach((row, rowIndex) => {
							// 提取单元格（支持 td 和 th）
							const cells = row.match(/<t[dh]>([\s\S]*?)<\/t[dh]>/gi) || [];
							const cellContents = cells.map(cell => {
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
					.replace(/<pre class="code-block">([\s\S]*?)<\/pre>/gi, (match, code) => {
						const decoded = code
							.replace(/<p>/gi, '')
							.replace(/<\/p>/gi, '\n')
							.replace(/&lt;/g, '<')
							.replace(/&gt;/g, '>')
							.replace(/&amp;/g, '&')
							.replace(/&quot;/g, '"')
							.replace(/&#39;/g, "'")
							.trim();
						return '```\n' + decoded + '\n```\n\n';
					})
					// 处理普通的 pre 标签
					.replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/gi, (match, code) => {
						const decoded = code
							.replace(/&lt;/g, '<')
							.replace(/&gt;/g, '>')
							.replace(/&amp;/g, '&')
							.replace(/&quot;/g, '"')
							.replace(/&#39;/g, "'");
						return '```\n' + decoded + '\n```\n\n';
					})
					.replace(/<pre>([\s\S]*?)<\/pre>/gi, (match, code) => {
						const decoded = code
							.replace(/&lt;/g, '<')
							.replace(/&gt;/g, '>')
							.replace(/&amp;/g, '&')
							.replace(/&quot;/g, '"')
							.replace(/&#39;/g, "'");
						return '```\n' + decoded + '\n```\n\n';
					})
					// 行内代码
					.replace(/<code>(.*?)<\/code>/gi, '`$1`')
					.replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
					.replace(/<a href="(.*?)">(.*?)<\/a>/gi, '[$2]($1)')
					.replace(/<img src="(.*?)" alt="(.*?)">/gi, '![$2]($1)')
					.replace(/<img src="(.*?)">/gi, '![]($1)')
					.replace(/<br\s*\/?>/gi, '\n')
					.replace(/<[^>]+>/g, '')
					.replace(/\n{3,}/g, '\n\n')
					.trim();
				
				console.log('Markdown 转换成功，长度:', markdown.length);
				console.log('=== 完整的 Markdown 内容开始 ===');
				console.log(markdown);
				console.log('=== 完整的 Markdown 内容结束 ===');
				
				// 先关闭 loading
				message.destroy();
				
				// 如果编辑器有内容，使用 Modal 询问用户
				if (content && content.trim()) {
					console.log('编辑器有内容，询问用户');
					Modal.confirm({
						title: '当前编辑器有内容',
						content: '是否追加到末尾？点击"确定"追加，点击"取消"替换现有内容。',
						okText: '追加到末尾',
						cancelText: '替换内容',
						icon: null,
						onOk: () => {
							console.log('用户选择: 追加');
							const finalMarkdown = content + '\n\n---\n\n' + markdown;
							setContent(finalMarkdown);
							handleChange({ content: finalMarkdown });
							message.success('Word 文档已追加到末尾');
						},
						onCancel: () => {
							console.log('用户选择: 替换');
							setContent(markdown);
							handleChange({ content: markdown });
							message.success('Word 文档已导入');
						}
					});
				} else {
					setContent(markdown);
					handleChange({ content: markdown });
					message.success('Word 文档导入成功！');
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

	// 编辑或者新增时提交数据到服务器端
	const handleSubmit = async () => {
		// 又从form中获取数据，需要转换格式的数据
		const { articleId, cover, content, tagIds } = form;
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
			content: content,
			tagIds: tagIds,
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
					summary: result?.summary,
					cover: coverUrl,
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
					handleSave={handleSaveOrUpdate}
					goBack={goBack}
				/>
				<ContentInterWrap>
					<div className="markdown-body">
						<Editor
							value={content}
							plugins={plugins}
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
						<Button onClick={resetFrom}>重置</Button>
						<Button type="primary" onClick={handleSubmit}>
							{status === UpdateEnum.Edit ? "确认更新" : "确认保存"}
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
