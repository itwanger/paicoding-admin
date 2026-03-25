import { FC, ReactNode, useEffect, useRef, useState } from "react";
import {
	Alert,
	Button,
	Card,
	Input,
	InputNumber,
	List,
	message,
	Modal,
	Select,
	Space,
	Spin,
	Switch,
	Tag,
	Tree,
	Typography
} from "antd";
import type { DataNode } from "antd/es/tree";

import { AISourceValue, getAiConfigDetailApi } from "@/api/modules/aiConfig";
import {
	getWxMenuDetailApi,
	previewWxMenuAiApi,
	previewWxMenuMatchApi,
	publishWxMenuApi,
	saveWxMenuDraftApi,
	syncWxMenuApi,
	validateWxMenuApi,
	WxMenuButton,
	WxMenuAiProviderOption,
	WxMenuClickReply,
	WxMenuDetail,
	WxMenuKeywordReply,
	WxMenuPreviewAiRes,
	WxMenuPreviewMatchRes,
	WxMenuPublishRes,
	WxMenuReply,
	WxMenuReplyArticle,
	WxMenuTree,
	WxMenuValidateRes
} from "@/api/modules/wxMenu";
import { ContentWrap } from "@/components/common-wrap";

import "./index.scss";

const { Paragraph, Text } = Typography;
const { TextArea } = Input;

const DEFAULT_DRAFT_COMMENT = "微信自定义菜单草稿";
const DEFAULT_FALLBACK_STRATEGY = "fixed_reply";
const LOCAL_DRAFT_CACHE_KEY = "paicoding-admin:wx-menu:draft-cache";

const REPLY_TYPE_OPTIONS = [
	{ label: "文本回复", value: "text" },
	{ label: "图文回复", value: "news" }
];

const MATCH_TYPE_OPTIONS = [
	{ label: "菜单 click key 精确匹配", value: "event_key_exact" },
	{ label: "消息内容精确匹配", value: "content_exact" },
	{ label: "消息内容包含匹配", value: "content_contains" }
];

const FALLBACK_STRATEGY_OPTIONS = [
	{ label: "不处理", value: "none" },
	{ label: "固定回复", value: "fixed_reply" },
	{ label: "AI 回复", value: "ai_reply" }
];

const PREVIEW_EVENT_OPTIONS = [
	{ label: "用户发消息", value: "TEXT" },
	{ label: "点击菜单 click", value: "CLICK" },
	{ label: "关注公众号", value: "subscribe" }
];

const AI_PROVIDER_CATALOG: Array<{
	label: string;
	value: AISourceValue;
	syncPreviewSupported?: boolean;
}> = [
	{ label: "技术派默认 AI", value: "PAI_AI" },
	{ label: "智谱 AI", value: "ZHI_PU_AI" },
	{ label: "智谱 Coding", value: "ZHIPU_CODING" },
	{ label: "讯飞 AI", value: "XUN_FEI_AI", syncPreviewSupported: false },
	{ label: "阿里 AI", value: "ALI_AI" },
	{ label: "DeepSeek", value: "DEEP_SEEK" },
	{ label: "豆包 AI", value: "DOU_BAO_AI" }
];

interface AiProviderOptionViewModel {
	label: string;
	value: string;
}

const DEFAULT_MENU_TEMPLATE = JSON.stringify(
	{
		button: [
			{
				type: "view",
				name: "首页",
				url: "https://paicoding.com"
			},
			{
				name: "内容精选",
				sub_button: [
					{
						type: "view",
						name: "最新文章",
						url: "https://paicoding.com/article/list"
					},
					{
						type: "click",
						name: "联系我们",
						key: "CONTACT_US"
					}
				]
			}
		]
	},
	null,
	2
);

const SUPPORTED_TYPES = [
	"view",
	"miniprogram",
	"click",
	"scancode_push",
	"scancode_waitmsg",
	"pic_sysphoto",
	"pic_photo_or_album",
	"pic_weixin",
	"location_select",
	"media_id",
	"view_limited",
	"article_id",
	"article_view_limited"
];

const MATCH_TYPE_LABEL_MAP: Record<string, string> = {
	event_key_exact: "菜单 click key 精确匹配",
	content_exact: "消息内容精确匹配",
	content_contains: "消息内容包含匹配"
};

const MATCH_TYPE_HINT_MAP: Record<string, string> = {
	event_key_exact: "用于 click 菜单事件。关键字里一行一个 event key，例如 CONTACT_US。",
	content_exact: "只有用户发来的内容和关键字完全一致时才会命中，适合口令类指令。",
	content_contains: "只要消息里包含关键字就会命中，适合模糊词、品牌词和功能词。"
};

const FALLBACK_STRATEGY_DESC_MAP: Record<string, string> = {
	none: "未命中关键词后不走后台配置回复。",
	fixed_reply: "未命中关键词后，优先使用默认兜底回复。",
	ai_reply: "未命中关键词后尝试交给大模型回复，再按系统逻辑兜底。"
};

const createEmptyArticle = (): WxMenuReplyArticle => ({
	title: "",
	description: "",
	picUrl: "",
	url: ""
});

const createReply = (replyType: "text" | "news" = "text"): WxMenuReply =>
	replyType === "news"
		? {
				replyType,
				articles: [createEmptyArticle()]
		  }
		: {
				replyType,
				content: ""
		  };

const createKeywordReply = (matchType = "content_contains"): WxMenuKeywordReply => ({
	matchType,
	keywords: [],
	replyType: "text",
	reply: createReply("text"),
	enabled: true,
	priority: 100,
	title: ""
});

const createSubscribeReplyTemplate = (): WxMenuReply => ({
	replyType: "text",
	content: [
		"🎉 你好，欢迎关注技术派！",
		"",
		"这里可以了解二哥编程星球的实战项目、学习路线和源码获取方式。",
		"",
		"🚀 核心项目入口：",
		`• <a href="https://paicoding.com/column/13/1">PaiFlow：企业级 AI Agent 工作流编排平台</a>`,
		`• <a href="https://paicoding.com/column/10/1">派聪明 RAG：企业级知识库项目（Java 版）</a>`,
		`• <a href="https://paicoding.com">技术派：Spring Boot + React 社区项目</a>`,
		`• <a href="https://paicoding.com/article/detail/2602100040108033">项目源码和教程最新获取方法</a>`,
		"",
		"💬 你也可以直接回复：",
		"【派聪明】了解 RAG 项目",
		"【PaiFlow】了解工作流编排项目",
		"【技术派】了解社区项目",
		"【源码】查看项目源码获取方式"
	].join("\n")
});

const createDefaultReplyTemplate = (): WxMenuReply => ({
	replyType: "text",
	content: [
		"🙂 我这边主要提供二哥编程星球的项目、教程和源码获取说明。",
		"",
		"当前重点方向包括：PaiFlow 工作流编排、派聪明 RAG、技术派、pmhub、PaiAgent 和 mydb。",
		`📚 项目总览：<a href="https://paicoding.com/article/detail/2602100040108033">点击查看最新获取方法</a>`,
		"",
		"你可以继续回复：",
		"【派聪明】",
		"【PaiFlow】",
		"【技术派】",
		"【源码】",
		"【星球】",
		"",
		"如果你想了解某个项目，我可以继续给你做针对性介绍。"
	].join("\n")
});

const createAiPromptTemplate = () =>
	[
		"你是“技术派 / 二哥编程星球”的微信公众号助手，负责回答用户关于项目、教程、源码获取方式和学习路线的问题。",
		"",
		"你已知的重点项目信息如下：",
		"1. PaiFlow：企业级 AI Agent 工作流编排平台，强调可视化编排、模型节点和工具节点组合。",
		"2. PaiAgent：Vibe Coding 风格项目，是 PaiFlow 的前身，适合作为入门项目。",
		"3. 派聪明 RAG：企业级 RAG 知识库项目，包含 Java 版和 Go 版。",
		"4. 技术派：Spring Boot + React 的前后端分离社区项目，覆盖 Web 开发核心能力。",
		"5. pmhub：微服务企业级项目，适合进阶分布式和架构能力。",
		"6. mydb：适合做轮子和数据库基础能力训练。",
		"7. 校招派、编程喵、面试指南、LeetCode 等内容属于补充学习资料。",
		"",
		"回答要求：",
		"1. 优先回答项目定位、适合人群、亮点、学习顺序和源码获取方式。",
		"2. 语气简洁、可信、像一个答疑助手，不要太营销。",
		"3. 当用户提到“派聪明”“PaiFlow”“技术派”“pmhub”等关键词时，优先介绍对应项目。",
		"4. 当用户询问源码获取时，说明需要先加入星球，再按项目说明申请 GitCode 权限；如需人工审核，提醒补充 GitCode 昵称和星球编号。",
		"5. 不确定的信息不要编造，可以建议用户继续回复“派聪明”“PaiFlow”“技术派”“源码”获取更具体说明。",
		"6. 每次回复尽量控制在 3 到 6 句，先给结论，再给下一步引导。"
	].join("\n");

const cloneData = <T,>(value: T): T => {
	if (value == null) return value;
	return JSON.parse(JSON.stringify(value)) as T;
};

interface LocalDraftCache {
	editorValue: string;
	draftComment: string;
	subscribeReply?: WxMenuReply;
	defaultReply?: WxMenuReply;
	keywordReplies?: WxMenuKeywordReply[];
	messageFallbackStrategy?: string;
	aiPrompt?: string;
	aiProvider?: string;
	aiEnable?: boolean;
}

const readLocalDraftCache = (): LocalDraftCache | null => {
	try {
		const cache = window.localStorage.getItem(LOCAL_DRAFT_CACHE_KEY);
		return cache ? (JSON.parse(cache) as LocalDraftCache) : null;
	} catch (error) {
		return null;
	}
};

const writeLocalDraftCache = (cache: LocalDraftCache) => {
	try {
		window.localStorage.setItem(LOCAL_DRAFT_CACHE_KEY, JSON.stringify(cache));
	} catch (error) {
		console.warn("wx menu draft cache save failed", error);
	}
};

const clearLocalDraftCache = () => {
	try {
		window.localStorage.removeItem(LOCAL_DRAFT_CACHE_KEY);
	} catch (error) {
		console.warn("wx menu draft cache clear failed", error);
	}
};

const formatMenuJson = (menuJson?: string) => {
	if (!menuJson) return DEFAULT_MENU_TEMPLATE;
	try {
		return JSON.stringify(JSON.parse(menuJson), null, 2);
	} catch (error) {
		return menuJson;
	}
};

const parseMenuJson = (menuJson?: string) => {
	if (!menuJson) return null;
	try {
		return JSON.parse(menuJson) as WxMenuTree;
	} catch (error) {
		return null;
	}
};

const getButtonMeta = (button: WxMenuButton) => {
	if (button.sub_button?.length) return `包含 ${button.sub_button.length} 个二级菜单`;
	if (button.type === "view") return button.url || "未填写 url";
	if (button.type === "miniprogram") return `${button.appid || "未填写 appid"} / ${button.pagepath || "未填写 pagepath"}`;
	if (button.key) return button.key;
	if (button.media_id) return button.media_id;
	if (button.article_id) return button.article_id;
	return "未配置额外参数";
};

const normalizeText = (value?: string) => value?.trim();

const normalizeReply = (reply?: WxMenuReply) => {
	if (!reply) return undefined;

	const replyType = normalizeText(reply.replyType);
	if (!replyType) return undefined;

	if (replyType === "news") {
		return {
			replyType,
			articles: (reply.articles || []).map(item => ({
				title: normalizeText(item.title),
				description: normalizeText(item.description),
				picUrl: normalizeText(item.picUrl),
				url: normalizeText(item.url)
			}))
		};
	}

	return {
		replyType,
		content: normalizeText(reply.content)
	};
};

const normalizeKeywordReplies = (keywordReplies: WxMenuKeywordReply[]) =>
	keywordReplies.map(item => {
		const normalizedReply = normalizeReply(item.reply);
		return {
			matchType: normalizeText(item.matchType),
			keywords: (item.keywords || []).map(keyword => keyword.trim()).filter(Boolean),
			replyType: normalizeText(item.replyType) || normalizedReply?.replyType,
			reply: normalizedReply,
			enabled: item.enabled !== false,
			priority: typeof item.priority === "number" ? item.priority : undefined,
			title: normalizeText(item.title)
		};
	});

const legacyClickRepliesToKeywordReplies = (clickReplies?: WxMenuClickReply[]) =>
	(clickReplies || []).map(item => ({
		matchType: "event_key_exact",
		keywords: item?.key ? [item.key] : [],
		replyType: item?.reply?.replyType,
		reply: item?.reply,
		enabled: true,
		priority: 100,
		title: item?.title
	}));

const buildTreeData = (buttons?: WxMenuButton[], parentKey = "button"): DataNode[] =>
	(buttons || []).map((button, index) => {
		const key = `${parentKey}-${index}`;
		return {
			key,
			title: (
				<div className="wx-menu-page__tree-node">
					<span className="wx-menu-page__tree-name">{button.name || `未命名菜单 ${index + 1}`}</span>
					{button.type ? <Tag color="green">{button.type}</Tag> : <Tag color="gold">目录</Tag>}
					<Text type="secondary" className="wx-menu-page__tree-meta">
						{getButtonMeta(button)}
					</Text>
				</div>
			),
			children: button.sub_button?.length ? buildTreeData(button.sub_button, key) : undefined
		};
	});

const parseKeywordsInput = (value: string) =>
	value
		.split(/[\n,，]/)
		.map(item => item.trim())
		.filter(Boolean);

const formatKeywordsInput = (keywords?: string[]) => (keywords || []).join("\n");

const getMatchTypeLabel = (matchType?: string) => MATCH_TYPE_LABEL_MAP[matchType || ""] || "未选择匹配方式";

const getFallbackStrategyLabel = (strategy?: string) =>
	FALLBACK_STRATEGY_OPTIONS.find(item => item.value === strategy)?.label || "固定回复";

const getPreviewEventLabel = (eventType?: string) =>
	PREVIEW_EVENT_OPTIONS.find(item => item.value === eventType)?.label || "用户发消息";

const getPreviewTriggerLabel = (eventType?: string) => {
	if (eventType === "CLICK") return "点击菜单";
	if (eventType === "subscribe") return "用户动作";
	return "用户消息";
};

const getPreviewTriggerValue = (eventType?: string, content?: string, eventKey?: string) => {
	if (eventType === "CLICK") return `点击菜单：${eventKey || "未填写 event key"}`;
	if (eventType === "subscribe") return "关注公众号";
	return content || "未填写试跑内容";
};

const getAiProviderLabel = (provider?: string) =>
	AI_PROVIDER_CATALOG.find(item => item.value === provider)?.label || provider || "未填写 Provider";

const isKnownAiProvider = (provider?: string) => AI_PROVIDER_CATALOG.some(item => item.value === provider);

const isSyncPreviewSupportedProvider = (provider?: string) =>
	AI_PROVIDER_CATALOG.find(item => item.value === provider)?.syncPreviewSupported !== false;

const getAiPreviewErrorText = (result?: WxMenuPreviewAiRes) => {
	if (!result || result.success) return "";
	if (result.errorMsg) return result.errorMsg;
	if (result.provider) return `Provider ${result.provider} 调用失败，但后端没有返回具体错误详情，请查看服务端日志。`;
	return "后端没有返回具体失败原因。";
};

const findMatchedKeywordLocally = (rule: WxMenuKeywordReply, eventType?: string, content?: string, eventKey?: string) => {
	const keywords = (rule.keywords || []).map(item => item.trim()).filter(Boolean);
	if (!keywords.length) return null;

	if (rule.matchType === "event_key_exact") {
		if (eventType !== "CLICK" || !eventKey) return null;
		return keywords.find(keyword => keyword === eventKey) || null;
	}

	const normalizedContent = content?.trim();
	if (!normalizedContent) return null;

	if (rule.matchType === "content_exact") {
		return keywords.find(keyword => keyword === normalizedContent) || null;
	}

	if (rule.matchType === "content_contains") {
		return keywords.find(keyword => normalizedContent.includes(keyword)) || null;
	}

	return null;
};

const renderRichTextPreview = (content?: string) => {
	if (!content) return null;

	const anchorPattern = /<a\s+href="([^"]+)"[^>]*>(.*?)<\/a>/gi;
	return content.split("\n").map((line, lineIndex) => {
		const nodes: ReactNode[] = [];
		let lastIndex = 0;
		let match: RegExpExecArray | null;

		anchorPattern.lastIndex = 0;
		while ((match = anchorPattern.exec(line))) {
			const [fullText, href, label] = match;
			const startIndex = match.index;
			if (startIndex > lastIndex) {
				nodes.push(line.slice(lastIndex, startIndex));
			}
			nodes.push(
				<a key={`${lineIndex}-${startIndex}`} href={href} target="_blank" rel="noreferrer">
					{label}
				</a>
			);
			lastIndex = startIndex + fullText.length;
		}

		if (lastIndex < line.length) {
			nodes.push(line.slice(lastIndex));
		}

		return (
			<span key={`line-${lineIndex}`}>
				{nodes.length ? nodes : "\u00A0"}
				{lineIndex < content.split("\n").length - 1 ? <br /> : null}
			</span>
		);
	});
};

interface SectionTitleProps {
	index: string;
	title: string;
	description: string;
}

const SectionTitle: FC<SectionTitleProps> = ({ index, title, description }) => (
	<div className="wx-menu-page__section-head">
		<div className="wx-menu-page__section-badge">模块 {index}</div>
		<div className="wx-menu-page__section-copy">
			<h2 className="wx-menu-page__section-title">{title}</h2>
			<p className="wx-menu-page__section-desc">{description}</p>
		</div>
	</div>
);

interface WechatReplyPreviewProps {
	title: string;
	reply?: WxMenuReply;
	triggerLabel?: string;
	triggerValue?: string;
	emptyText: string;
}

const WechatReplyPreview: FC<WechatReplyPreviewProps> = ({ title, reply, triggerLabel, triggerValue, emptyText }) => (
	<div className="wx-menu-page__preview-phone">
		<div className="wx-menu-page__preview-phone-head">{title}</div>
		<div className="wx-menu-page__preview-phone-body">
			{triggerValue ? (
				<div className="wx-menu-page__preview-bubble wx-menu-page__preview-bubble--user">
					<div className="wx-menu-page__preview-bubble-label">{triggerLabel || "用户触发"}</div>
					<div className="wx-menu-page__preview-bubble-content">{triggerValue}</div>
				</div>
			) : null}

			<div className="wx-menu-page__preview-bubble wx-menu-page__preview-bubble--bot">
				<div className="wx-menu-page__preview-bubble-label">公众号回复</div>
				{reply?.replyType === "news" && reply.articles?.length ? (
					<div className="wx-menu-page__preview-news-list">
						{reply.articles.map((article, index) => (
							<div key={`preview-article-${index}`} className="wx-menu-page__preview-news-card">
								<div className="wx-menu-page__preview-news-cover">
									{article.picUrl ? <img src={article.picUrl} alt={article.title || "cover"} /> : <span>图文封面</span>}
								</div>
								<div className="wx-menu-page__preview-news-copy">
									<strong>{article.title || `图文 ${index + 1}`}</strong>
									{article.description ? <span>{article.description}</span> : null}
									{article.url ? (
										<a href={article.url} target="_blank" rel="noreferrer">
											打开链接
										</a>
									) : null}
								</div>
							</div>
						))}
					</div>
				) : reply?.content ? (
					<div className="wx-menu-page__preview-rich-text">{renderRichTextPreview(reply.content)}</div>
				) : (
					<div className="wx-menu-page__preview-empty">{emptyText}</div>
				)}
			</div>
		</div>
	</div>
);

interface WechatMenuPreviewProps {
	buttons?: WxMenuButton[];
}

const WechatMenuPreview: FC<WechatMenuPreviewProps> = ({ buttons }) => {
	const topButtons = buttons || [];

	return (
		<div className="wx-menu-page__preview-phone">
			<div className="wx-menu-page__preview-phone-head">微信菜单预览</div>
			<div className="wx-menu-page__preview-phone-body wx-menu-page__preview-phone-body--menu">
				<div className="wx-menu-page__preview-empty">
					<Text type="secondary">会话底部菜单将显示在这里，点击后可展开二级菜单。</Text>
				</div>
			</div>

			{topButtons.some(button => button.sub_button?.length) ? (
				<div className="wx-menu-page__preview-submenus">
					{topButtons.map((button, index) =>
						button.sub_button?.length ? (
							<div key={`submenu-${index}`} className="wx-menu-page__preview-submenu-card">
								<strong>{button.name || `菜单 ${index + 1}`}</strong>
								<div className="wx-menu-page__preview-submenu-list">
									{button.sub_button.map((subButton, subIndex) => (
										<span key={`submenu-item-${index}-${subIndex}`}>{subButton.name || `子菜单 ${subIndex + 1}`}</span>
									))}
								</div>
							</div>
						) : null
					)}
				</div>
			) : null}

			<div className="wx-menu-page__preview-menu-bar">
				{topButtons.length ? (
					topButtons.map((button, index) => (
						<div key={`menu-${index}`} className="wx-menu-page__preview-menu-item">
							<span>{button.name || `菜单 ${index + 1}`}</span>
							{button.sub_button?.length ? <small>展开</small> : null}
						</div>
					))
				) : (
					<div className="wx-menu-page__preview-empty">暂无菜单内容</div>
				)}
			</div>
		</div>
	);
};

interface MatchPreviewMetaProps {
	result?: WxMenuPreviewMatchRes;
}

const MatchPreviewMeta: FC<MatchPreviewMetaProps> = ({ result }) => {
	if (!result) {
		return <Text type="secondary">还没有执行真实命中预览。</Text>;
	}

	const metaItems = [
		{
			label: "命中状态",
			value: result.matched ? "已命中" : "未命中"
		},
		{
			label: "命中规则",
			value: result.matchedRuleTitle || "未返回"
		},
		{
			label: "规则类型",
			value: result.matchedRuleType || "未返回"
		},
		{
			label: "命中关键字",
			value: result.matchedKeyword || "未返回"
		},
		{
			label: "兜底策略",
			value: result.fallbackStrategy || "未返回"
		},
		{
			label: "是否兜底",
			value: result.usedFallback ? "是" : "否"
		}
	];

	return (
		<div className="wx-menu-page__preview-meta">
			{metaItems.map(item => (
				<div key={item.label} className="wx-menu-page__preview-meta-item">
					<span>{item.label}</span>
					<strong>{item.value}</strong>
				</div>
			))}
		</div>
	);
};

interface ReplyEditorProps {
	value?: WxMenuReply;
	onChange: (reply?: WxMenuReply) => void;
	emptyText: string;
}

const ReplyEditor: FC<ReplyEditorProps> = ({ value, onChange, emptyText }) => {
	const replyType = value?.replyType || "text";
	const articles = value?.articles || [];

	const handleReplyTypeChange = (nextType: "text" | "news") => {
		const nextReply = cloneData(value) || createReply(nextType);
		nextReply.replyType = nextType;
		if (nextType === "news") {
			nextReply.articles = nextReply.articles?.length ? nextReply.articles : [createEmptyArticle()];
			delete nextReply.content;
		} else {
			nextReply.content = nextReply.content || "";
			delete nextReply.articles;
		}
		onChange(nextReply);
	};

	const updateArticle = (index: number, patch: Partial<WxMenuReplyArticle>) => {
		const nextReply = cloneData(value) || createReply("news");
		const nextArticles = nextReply.articles?.length ? [...nextReply.articles] : [createEmptyArticle()];
		nextArticles[index] = { ...nextArticles[index], ...patch };
		nextReply.articles = nextArticles;
		onChange(nextReply);
	};

	const addArticle = () => {
		const nextReply = cloneData(value) || createReply("news");
		nextReply.replyType = "news";
		nextReply.articles = [...(nextReply.articles || []), createEmptyArticle()];
		onChange(nextReply);
	};

	const removeArticle = (index: number) => {
		const nextReply = cloneData(value) || createReply("news");
		nextReply.articles = (nextReply.articles || []).filter((_, itemIndex) => itemIndex !== index);
		onChange(nextReply);
	};

	if (!value) {
		return (
			<div className="wx-menu-page__reply-empty">
				<Paragraph type="secondary">{emptyText}</Paragraph>
				<Space wrap>
					<Button onClick={() => onChange(createReply("text"))}>添加文本回复</Button>
					<Button onClick={() => onChange(createReply("news"))}>添加图文回复</Button>
				</Space>
			</div>
		);
	}

	return (
		<Space direction="vertical" size={12} style={{ display: "flex" }}>
			<Space wrap className="wx-menu-page__reply-actions">
				<Select
					value={replyType}
					options={REPLY_TYPE_OPTIONS}
					style={{ width: 160 }}
					onChange={nextType => handleReplyTypeChange(nextType as "text" | "news")}
				/>
				<Button onClick={() => onChange(undefined)}>清空回复</Button>
			</Space>

			{replyType === "news" ? (
				<div className="wx-menu-page__reply-articles">
					{articles.map((article, index) => (
						<Card
							size="small"
							key={`article-${index}`}
							title={`图文 ${index + 1}`}
							className="wx-menu-page__subcard"
							extra={
								<Button danger size="small" onClick={() => removeArticle(index)} disabled={articles.length === 1}>
									删除
								</Button>
							}
						>
							<Space direction="vertical" size={10} style={{ display: "flex" }}>
								<Input placeholder="标题" value={article.title} onChange={e => updateArticle(index, { title: e.target.value })} />
								<TextArea
									autoSize={{ minRows: 2, maxRows: 4 }}
									placeholder="描述，可选"
									value={article.description}
									onChange={e => updateArticle(index, { description: e.target.value })}
								/>
								<Input
									placeholder="封面图 URL，可选"
									value={article.picUrl}
									onChange={e => updateArticle(index, { picUrl: e.target.value })}
								/>
								<Input
									placeholder="跳转链接 URL"
									value={article.url}
									onChange={e => updateArticle(index, { url: e.target.value })}
								/>
							</Space>
						</Card>
					))}
					<Button onClick={addArticle}>新增图文</Button>
				</div>
			) : (
				<TextArea
					autoSize={{ minRows: 5, maxRows: 8 }}
					placeholder="请输入回复内容"
					value={value.content}
					onChange={e => onChange({ ...value, replyType: "text", content: e.target.value })}
				/>
			)}
		</Space>
	);
};

interface KeywordRuleCardProps {
	index: number;
	value: WxMenuKeywordReply;
	onChange: (patch: Partial<WxMenuKeywordReply>) => void;
	onReplyChange: (reply?: WxMenuReply) => void;
	onRemove: () => void;
}

const KeywordRuleCard: FC<KeywordRuleCardProps> = ({ index, value, onChange, onReplyChange, onRemove }) => {
	const matchType = value.matchType || "content_contains";
	const previewTriggerValue =
		value.matchType === "event_key_exact"
			? `点击菜单：${value.keywords?.[0] || "未设置 event key"}`
			: value.keywords?.[0] || "未设置关键词";

	return (
		<Card
			size="small"
			className="wx-menu-page__rule-card"
			title={value.title || `规则 ${index + 1}`}
			extra={
				<Space size={12} wrap>
					<Text type="secondary">启用</Text>
					<Switch checked={value.enabled !== false} onChange={checked => onChange({ enabled: checked })} />
					<Button danger size="small" onClick={onRemove}>
						删除
					</Button>
				</Space>
			}
		>
			<div className="wx-menu-page__rule-grid">
				<div className="wx-menu-page__field">
					<Text strong>规则名称</Text>
					<Input placeholder="例如 派聪明邀请码" value={value.title} onChange={e => onChange({ title: e.target.value })} />
				</div>
				<div className="wx-menu-page__field">
					<Text strong>优先级</Text>
					<InputNumber
						min={1}
						style={{ width: "100%" }}
						placeholder="数字越小越先命中"
						value={value.priority}
						onChange={nextValue => onChange({ priority: typeof nextValue === "number" ? nextValue : undefined })}
					/>
				</div>
				<div className="wx-menu-page__field">
					<Text strong>匹配方式</Text>
					<Select value={matchType} options={MATCH_TYPE_OPTIONS} onChange={nextValue => onChange({ matchType: nextValue })} />
				</div>
				<div className="wx-menu-page__field">
					<Text strong>当前规则</Text>
					<div className="wx-menu-page__rule-label">{getMatchTypeLabel(matchType)}</div>
				</div>
				<div className="wx-menu-page__field wx-menu-page__field--full">
					<Text strong>关键词 / event key</Text>
					<TextArea
						autoSize={{ minRows: 3, maxRows: 5 }}
						placeholder={
							matchType === "event_key_exact"
								? "一行一个 event key，例如 CONTACT_US"
								: matchType === "content_exact"
								? "一行一个完整关键词，例如 聪明"
								: "一行一个包含词，例如 派聪明"
						}
						value={formatKeywordsInput(value.keywords)}
						onChange={e => onChange({ keywords: parseKeywordsInput(e.target.value) })}
					/>
					<Text type="secondary">{MATCH_TYPE_HINT_MAP[matchType]}</Text>
				</div>
				<div className="wx-menu-page__field wx-menu-page__field--full">
					<Text strong>命中后回复</Text>
					<ReplyEditor
						value={value.reply}
						onChange={reply => onReplyChange(reply ? { ...reply, replyType: reply.replyType || value.replyType } : reply)}
						emptyText="命中这条规则后需要返回的回复内容。"
					/>
				</div>
				<div className="wx-menu-page__field wx-menu-page__field--full">
					<Text strong>规则预览</Text>
					<WechatReplyPreview
						title={value.title || `规则 ${index + 1}`}
						reply={value.reply}
						triggerLabel={getMatchTypeLabel(matchType)}
						triggerValue={previewTriggerValue}
						emptyText="这条规则还没有配置回复内容。"
					/>
				</div>
			</div>
		</Card>
	);
};

const WxMenuPage: FC = () => {
	const [loading, setLoading] = useState(false);
	const [actionLoading, setActionLoading] = useState<string>("");
	const [detail, setDetail] = useState<WxMenuDetail>();
	const [validateResult, setValidateResult] = useState<WxMenuValidateRes>();
	const [editorValue, setEditorValue] = useState("");
	const [draftComment, setDraftComment] = useState(DEFAULT_DRAFT_COMMENT);
	const [subscribeReply, setSubscribeReply] = useState<WxMenuReply>();
	const [defaultReply, setDefaultReply] = useState<WxMenuReply>();
	const [keywordReplies, setKeywordReplies] = useState<WxMenuKeywordReply[]>([]);
	const [messageFallbackStrategy, setMessageFallbackStrategy] = useState(DEFAULT_FALLBACK_STRATEGY);
	const [aiPrompt, setAiPrompt] = useState("");
	const [aiProvider, setAiProvider] = useState("");
	const [aiEnable, setAiEnable] = useState(false);
	const [availableAiProviderOptions, setAvailableAiProviderOptions] = useState<AiProviderOptionViewModel[]>([]);
	const [previewEventType, setPreviewEventType] = useState("TEXT");
	const [previewContent, setPreviewContent] = useState("");
	const [previewEventKey, setPreviewEventKey] = useState("");
	const [matchPreviewResult, setMatchPreviewResult] = useState<WxMenuPreviewMatchRes>();
	const [aiPreviewContent, setAiPreviewContent] = useState("");
	const [aiPreviewResult, setAiPreviewResult] = useState<WxMenuPreviewAiRes>();
	const hasInitializedRef = useRef(false);
	const hasRestoredCacheRef = useRef(false);

	const loadDetail = async (nextEditorValue?: string) => {
		setLoading(true);
		try {
			const [{ result }, aiConfigResponse] = await Promise.all([getWxMenuDetailApi(), getAiConfigDetailApi()]);
			if (!result) return;
			const aiConfigResult = aiConfigResponse?.result;

			const serverEditorValue = formatMenuJson(
				nextEditorValue || result.draftJson || result.remoteJson || result.menuJsonTemplate || DEFAULT_MENU_TEMPLATE
			);
			const serverDraftComment = result.draftComment || DEFAULT_DRAFT_COMMENT;
			const serverSubscribeReply = cloneData(result.subscribeReply || result.draftConfig?.subscribeReply);
			const serverDefaultReply = cloneData(result.defaultReply || result.draftConfig?.defaultReply);
			const serverKeywordReplies = cloneData(
				result.keywordReplies ||
					result.draftConfig?.keywordReplies ||
					legacyClickRepliesToKeywordReplies(result.clickReplies || result.draftConfig?.clickReplies)
			);
			const serverFallbackStrategy =
				result.messageFallbackStrategy || result.draftConfig?.messageFallbackStrategy || DEFAULT_FALLBACK_STRATEGY;
			const serverAiPrompt = result.aiPrompt || result.draftConfig?.aiPrompt || "";
			const serverAiProvider = result.aiProvider || result.draftConfig?.aiProvider || "";
			const serverAiEnable = Boolean(result.aiEnable ?? result.draftConfig?.aiEnable);
			const localCache = readLocalDraftCache();
			const detailProviderOptions = (result.aiProviderOptions || [])
				.filter((item: WxMenuAiProviderOption) => item?.value && item.syncSupport !== false)
				.map((item: WxMenuAiProviderOption) => ({
					label: item?.name || item?.value || "",
					value: item?.value || ""
				}))
				.filter((item: AiProviderOptionViewModel) => item.value);
			const syncEnabledSources = ((aiConfigResult?.sources || []) as AISourceValue[]).filter(source =>
				isSyncPreviewSupportedProvider(source)
			);
			const fallbackProviderOptions = AI_PROVIDER_CATALOG.filter(item => syncEnabledSources.includes(item.value)).map(item => ({
				label: item.label,
				value: item.value
			}));
			const syncedProviderOptions = detailProviderOptions.length ? detailProviderOptions : fallbackProviderOptions;
			const syncedProviderValues = syncedProviderOptions.map(item => item.value);
			const autoSyncedAiProvider =
				localCache?.aiProvider || serverAiProvider || (syncedProviderValues.length === 1 ? syncedProviderValues[0] : "");

			setDetail(result);
			setAvailableAiProviderOptions(syncedProviderOptions);
			setDraftComment(localCache?.draftComment ?? serverDraftComment);
			setSubscribeReply(localCache?.subscribeReply ?? serverSubscribeReply);
			setDefaultReply(localCache?.defaultReply ?? serverDefaultReply);
			setKeywordReplies(localCache?.keywordReplies ?? serverKeywordReplies ?? []);
			setMessageFallbackStrategy(localCache?.messageFallbackStrategy ?? serverFallbackStrategy);
			setAiPrompt(localCache?.aiPrompt ?? serverAiPrompt);
			setAiProvider(autoSyncedAiProvider);
			setAiEnable(localCache?.aiEnable ?? serverAiEnable);
			setValidateResult({
				valid: result.draftValid,
				normalizedMenuJson: result.draftJson,
				menuErrors: [],
				replyErrors: [],
				errors: result.draftErrors || [],
				warnings: result.draftWarnings || []
			});
			setEditorValue(localCache?.editorValue ?? serverEditorValue);

			if (localCache && !hasRestoredCacheRef.current) {
				hasRestoredCacheRef.current = true;
				message.info("已恢复本地未保存的微信菜单编辑内容");
			}

			hasInitializedRef.current = true;
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadDetail();
	}, []);

	useEffect(() => {
		if (!hasInitializedRef.current) return;

		writeLocalDraftCache({
			editorValue,
			draftComment,
			subscribeReply,
			defaultReply,
			keywordReplies,
			messageFallbackStrategy,
			aiPrompt,
			aiProvider,
			aiEnable
		});
	}, [
		editorValue,
		draftComment,
		subscribeReply,
		defaultReply,
		keywordReplies,
		messageFallbackStrategy,
		aiPrompt,
		aiProvider,
		aiEnable
	]);

	const runAction = async (actionKey: string, action: () => Promise<void>) => {
		setActionLoading(actionKey);
		try {
			await action();
		} finally {
			setActionLoading("");
		}
	};

	const buildPayload = () => ({
		menuJson: editorValue,
		comment: draftComment,
		subscribeReply: normalizeReply(subscribeReply),
		defaultReply: normalizeReply(defaultReply),
		keywordReplies: normalizeKeywordReplies(keywordReplies),
		messageFallbackStrategy,
		aiPrompt: normalizeText(aiPrompt),
		aiProvider: normalizeText(aiProvider),
		aiEnable
	});

	const handleValidate = async () => {
		await runAction("validate", async () => {
			const payload = buildPayload();
			const { result } = await validateWxMenuApi(payload);
			if (!result) return;

			setValidateResult(result);
			if (result.valid && result.normalizedMenuJson) {
				setEditorValue(formatMenuJson(result.normalizedMenuJson));
				message.success("整套微信菜单配置校验通过");
				return;
			}

			message.warning(`校验未通过，共 ${result.errors?.length || 0} 项问题`);
		});
	};

	const handleSaveDraft = async () => {
		await runAction("save", async () => {
			const { status } = await saveWxMenuDraftApi(buildPayload());
			if (status?.code === 0) {
				clearLocalDraftCache();
				hasRestoredCacheRef.current = false;
				message.success("草稿已保存");
				await loadDetail();
			}
		});
	};

	const handlePublish = () => {
		Modal.confirm({
			title: "确认发布当前菜单吗？",
			content: "这次发布只会同步菜单结构到微信公众号；关注后回复、关键词回复和普通消息兜底在保存草稿后就会立即生效。",
			okText: "确认发布",
			cancelText: "取消",
			onOk: async () => {
				await runAction("publish", async () => {
					const { result } = await publishWxMenuApi({ menuJson: editorValue });
					const publishResult = (result || {}) as WxMenuPublishRes;
					if (publishResult.success) {
						message.success("微信菜单发布成功");
						await loadDetail(publishResult.publishedMenuJson || editorValue);
					}
				});
			}
		});
	};

	const handleSyncRemote = () => {
		Modal.confirm({
			title: "同步线上菜单到草稿？",
			content: "这会把当前公众号线上菜单写回草稿区，其它回复配置会继续沿用你当前编辑的内容。",
			okText: "同步",
			cancelText: "取消",
			onOk: async () => {
				await runAction("sync", async () => {
					const { result } = await syncWxMenuApi();
					clearLocalDraftCache();
					hasRestoredCacheRef.current = false;
					message.success("线上菜单已同步到草稿");
					await loadDetail(result?.draftJson || result?.draftConfig?.menuJson);
				});
			}
		});
	};

	const handleFormat = () => {
		const parsedMenu = parseMenuJson(editorValue);
		if (!parsedMenu) {
			message.warning("当前 JSON 不是合法格式，暂时无法格式化");
			return;
		}

		setEditorValue(JSON.stringify(parsedMenu, null, 2));
	};

	const handlePreviewMatch = async () => {
		const normalizedContent = normalizeText(previewContent);
		const normalizedEventKey = normalizeText(previewEventKey);

		if (previewEventType === "TEXT" && !normalizedContent) {
			message.warning("请输入一条用户消息，再执行真实命中预览");
			return;
		}

		if (previewEventType === "CLICK" && !normalizedEventKey) {
			message.warning("请输入 event key，再执行 click 命中预览");
			return;
		}

		await runAction("previewMatch", async () => {
			const { result } = await previewWxMenuMatchApi({
				...buildPayload(),
				eventType: previewEventType,
				eventKey: previewEventType === "CLICK" ? normalizedEventKey : undefined,
				content: previewEventType === "TEXT" ? normalizedContent : undefined
			});

			setMatchPreviewResult(result);
			message.success("真实命中预览已更新");
		});
	};

	const handlePreviewAi = async () => {
		const normalizedContent = normalizeText(aiPreviewContent);
		if (!normalizedContent) {
			message.warning("请输入一条消息，再试跑 AI 回复");
			return;
		}

		await runAction("previewAi", async () => {
			const { result } = await previewWxMenuAiApi({
				content: normalizedContent,
				aiPrompt: normalizeText(aiPrompt),
				aiProvider: normalizeText(aiProvider),
				aiEnable
			});

			setAiPreviewResult(result);
			if (result?.success) {
				message.success("AI 回复预览已更新");
				return;
			}

			message.warning(getAiPreviewErrorText(result) || "AI 回复预览未成功，请检查配置");
		});
	};

	const updateKeywordReply = (index: number, patch: Partial<WxMenuKeywordReply>) => {
		setKeywordReplies(prev => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
	};

	const updateKeywordReplyReply = (index: number, reply?: WxMenuReply) => {
		setKeywordReplies(prev =>
			prev.map((item, itemIndex) =>
				itemIndex === index ? { ...item, reply, replyType: reply?.replyType || item.replyType || "text" } : item
			)
		);
	};

	const removeKeywordReply = (index: number) => {
		setKeywordReplies(prev => prev.filter((_, itemIndex) => itemIndex !== index));
	};

	const editorPreview = parseMenuJson(editorValue);
	const editorTreeData = buildTreeData(editorPreview?.button);
	const remoteTreeData = buildTreeData(detail?.remoteMenu?.button);
	const templateValue = detail?.menuJsonTemplate || DEFAULT_MENU_TEMPLATE;
	const draftStatusText =
		detail?.draftValid === true ? "草稿已通过" : detail?.draftValid === false ? "草稿待修正" : "尚未保存草稿";
	const remoteStatusText = detail?.remoteError ? "远端拉取异常" : remoteTreeData.length ? "远端菜单已连接" : "远端菜单为空";
	const warningCount = validateResult?.warnings?.length || 0;
	const topMenuCount = editorPreview?.button?.length || 0;
	const enabledRuleCount = keywordReplies.filter(item => item.enabled !== false).length;
	const eventRuleCount = keywordReplies.filter(item => item.matchType === "event_key_exact").length;
	const contentRuleCount = keywordReplies.filter(item => item.matchType !== "event_key_exact").length;
	const fallbackStrategyLabel = getFallbackStrategyLabel(messageFallbackStrategy);
	const previewTriggerLabel = getPreviewTriggerLabel(previewEventType);
	const previewTriggerValue = getPreviewTriggerValue(previewEventType, previewContent, previewEventKey);
	const isAiProviderEnabled = aiProvider ? availableAiProviderOptions.some(item => item.value === aiProvider) : false;
	const aiPreviewReply =
		aiPreviewResult?.replyText && aiPreviewResult.success
			? {
					replyType: "text",
					content: aiPreviewResult.replyText
			  }
			: undefined;
	const matchDisabledRules = keywordReplies
		.map(rule => ({
			rule,
			matchedKeyword: findMatchedKeywordLocally(rule, previewEventType, previewContent, previewEventKey)
		}))
		.filter(item => item.rule.enabled === false && item.matchedKeyword);
	const aiProviderOptions = availableAiProviderOptions.length
		? aiProvider && !availableAiProviderOptions.some(item => item.value === aiProvider)
			? [
					...availableAiProviderOptions,
					{
						label: `${getAiProviderLabel(aiProvider)}（当前草稿值，未在 AI 模型配置中启用）`,
						value: aiProvider
					}
			  ]
			: availableAiProviderOptions
		: aiProvider
		? [
				{
					label: `${getAiProviderLabel(aiProvider)}（当前草稿值，未在 AI 模型配置中启用）`,
					value: aiProvider
				}
		  ]
		: [];

	return (
		<div className="wx-menu-page">
			<ContentWrap className="wx-menu-page__wrap">
				<Spin spinning={loading}>
					<div className="wx-menu-page__layout">
						<section className="wx-menu-page__hero">
							<div className="wx-menu-page__hero-copy">
								<p className="wx-menu-page__eyebrow">微信配置中心</p>
								<h1 className="wx-menu-page__title">微信公众号配置</h1>
								<p className="wx-menu-page__subtitle">
									菜单、关注后回复、关键词规则和普通消息兜底分开维护。页面只保留后台需要的结构和信息，不再额外做一套独立视觉。
								</p>
							</div>
							<div className="wx-menu-page__hero-metrics">
								<div className="wx-menu-page__metric-card">
									<span className="wx-menu-page__metric-label">菜单配置</span>
									<strong className="wx-menu-page__metric-value">{topMenuCount} 个一级菜单</strong>
									<Text type="secondary">{draftStatusText}</Text>
								</div>
								<div className="wx-menu-page__metric-card">
									<span className="wx-menu-page__metric-label">关键词规则</span>
									<strong className="wx-menu-page__metric-value">{enabledRuleCount} 条已启用规则</strong>
									<Text type="secondary">
										{eventRuleCount} 条事件规则 / {contentRuleCount} 条消息规则
									</Text>
								</div>
								<div className="wx-menu-page__metric-card">
									<span className="wx-menu-page__metric-label">普通消息兜底</span>
									<strong className="wx-menu-page__metric-value">{fallbackStrategyLabel}</strong>
									<Text type="secondary">{aiEnable ? getAiProviderLabel(aiProvider) : "AI 未开启"}</Text>
								</div>
								<div className="wx-menu-page__metric-card">
									<span className="wx-menu-page__metric-label">线上状态</span>
									<strong className="wx-menu-page__metric-value">{remoteStatusText}</strong>
									<Text type="secondary">{warningCount} 条校验提示</Text>
								</div>
							</div>
						</section>

						<Card bordered={false} className="wx-menu-page__action-bar">
							<div className="wx-menu-page__action-copy">
								<Text strong>保存节奏</Text>
								<Text type="secondary">保存草稿会立即生效回复配置；发布菜单只同步微信公众号菜单结构。</Text>
							</div>
							<Space wrap>
								<Button onClick={() => loadDetail()} loading={loading}>
									刷新详情
								</Button>
								<Button onClick={() => setEditorValue(formatMenuJson(templateValue))}>填充模板</Button>
								<Button onClick={handleFormat}>格式化 JSON</Button>
								<Button type="primary" onClick={handleValidate} loading={actionLoading === "validate"}>
									校验整套配置
								</Button>
								<Button onClick={handleSaveDraft} loading={actionLoading === "save"}>
									保存草稿
								</Button>
								<Button onClick={handleSyncRemote} loading={actionLoading === "sync"}>
									同步线上到草稿
								</Button>
								<Button danger type="primary" onClick={handlePublish} loading={actionLoading === "publish"}>
									发布菜单到微信
								</Button>
							</Space>
						</Card>

						<section className="wx-menu-page__module">
							<SectionTitle
								index="01"
								title="菜单配置"
								description="这一块只处理微信官方菜单 JSON。保存草稿后菜单结构会持久化，点击发布后才会真正同步到公众号。"
							/>
							<div className="wx-menu-page__menu-layout">
								<Card bordered={false} className="wx-menu-page__panel wx-menu-page__panel--editor" title="菜单工作台">
									<div className="wx-menu-page__editor-shell">
										<div className="wx-menu-page__field">
											<Text strong>草稿备注</Text>
											<Input
												className="wx-menu-page__comment"
												placeholder="用于记录这份草稿的说明"
												value={draftComment}
												onChange={e => setDraftComment(e.target.value)}
											/>
										</div>
										<div className="wx-menu-page__editor-field">
											<div className="wx-menu-page__field-head">
												<Text strong>菜单 JSON</Text>
												<Text type="secondary">一级菜单、二级菜单和跳转规则都在这里维护。</Text>
											</div>
											<TextArea
												className="wx-menu-page__editor"
												value={editorValue}
												onChange={e => setEditorValue(e.target.value)}
												placeholder="请输入微信菜单 JSON"
												style={{ height: "100%", resize: "none" }}
											/>
										</div>
									</div>
								</Card>

								<div className="wx-menu-page__sidebar">
									<Card bordered={false} className="wx-menu-page__panel" title="当前编辑预览">
										{editorTreeData.length ? (
											<Tree defaultExpandAll treeData={editorTreeData} />
										) : (
											<Alert type="warning" showIcon message="当前编辑区 JSON 还不能解析为菜单树" />
										)}
									</Card>

									<Card bordered={false} className="wx-menu-page__panel" title="微信菜单效果预览">
										<WechatMenuPreview buttons={editorPreview?.button} />
									</Card>

									<Card bordered={false} className="wx-menu-page__panel" title="支持的 type">
										<div className="wx-menu-page__tag-list">
											{SUPPORTED_TYPES.map(type => (
												<Tag key={type}>{type}</Tag>
											))}
										</div>
									</Card>

									<Card bordered={false} className="wx-menu-page__panel" title="最新校验结果">
										<Space direction="vertical" size={12} style={{ display: "flex" }}>
											{validateResult?.valid === true && <Alert type="success" showIcon message="当前整套配置校验通过" />}
											{validateResult?.valid === undefined && <Text type="secondary">还没有执行过校验。</Text>}
											{validateResult?.menuErrors?.length ? (
												<Alert
													type="error"
													showIcon
													message="菜单结构问题"
													description={
														<List
															size="small"
															dataSource={validateResult.menuErrors}
															renderItem={item => <List.Item>{item}</List.Item>}
														/>
													}
												/>
											) : null}
											{validateResult?.errors?.length &&
											!validateResult?.menuErrors?.length &&
											!validateResult?.replyErrors?.length ? (
												<Alert
													type="error"
													showIcon
													message="草稿配置问题"
													description={
														<List
															size="small"
															dataSource={validateResult.errors}
															renderItem={item => <List.Item>{item}</List.Item>}
														/>
													}
												/>
											) : null}
											{validateResult?.replyErrors?.length ? (
												<Alert
													type="error"
													showIcon
													message="回复配置问题"
													description={
														<List
															size="small"
															dataSource={validateResult.replyErrors}
															renderItem={item => <List.Item>{item}</List.Item>}
														/>
													}
												/>
											) : null}
											{validateResult?.warnings?.length ? (
												<Alert
													type="warning"
													showIcon
													message="校验提示"
													description={
														<List
															size="small"
															dataSource={validateResult.warnings}
															renderItem={item => <List.Item>{item}</List.Item>}
														/>
													}
												/>
											) : null}
										</Space>
									</Card>

									<Card bordered={false} className="wx-menu-page__panel" title="菜单 JSON 规则">
										<List
											size="small"
											dataSource={detail?.menuJsonTips || []}
											renderItem={item => <List.Item>{item}</List.Item>}
										/>
									</Card>
								</div>
							</div>
						</section>

						<section className="wx-menu-page__module">
							<SectionTitle
								index="02"
								title="被关注回复"
								description="用户刚关注公众号时触发。适合放欢迎语、导航说明或首次触达文案。"
							/>
							<div className="wx-menu-page__single-layout">
								<Card
									bordered={false}
									className="wx-menu-page__panel"
									title="关注后回复"
									extra={
										<Button size="small" onClick={() => setSubscribeReply(createSubscribeReplyTemplate())}>
											填充项目介绍模板
										</Button>
									}
								>
									<ReplyEditor
										value={subscribeReply}
										onChange={setSubscribeReply}
										emptyText="当前没有配置关注后回复，用户关注后不会收到后台定义的被动消息。"
									/>
								</Card>

								<Card bordered={false} className="wx-menu-page__panel wx-menu-page__panel--aside" title="关注后回复预览">
									<WechatReplyPreview
										title="新用户关注"
										reply={subscribeReply}
										triggerLabel="用户动作"
										triggerValue="关注公众号"
										emptyText="当前还没有配置关注后回复。"
									/>
								</Card>
							</div>
						</section>

						<section className="wx-menu-page__module">
							<SectionTitle
								index="03"
								title="关键词回复"
								description="这里统一管理 click 事件规则和用户消息关键词规则。优先级越小越先命中，命中后立即返回对应回复。"
							/>
							<div className="wx-menu-page__rules-layout">
								<Card bordered={false} className="wx-menu-page__panel" title="规则列表">
									<div className="wx-menu-page__rule-actions">
										<Space wrap>
											<Button onClick={() => setKeywordReplies(prev => [...prev, createKeywordReply("event_key_exact")])}>
												新增 click 事件规则
											</Button>
											<Button onClick={() => setKeywordReplies(prev => [...prev, createKeywordReply("content_exact")])}>
												新增精确关键词
											</Button>
											<Button
												type="primary"
												onClick={() => setKeywordReplies(prev => [...prev, createKeywordReply("content_contains")])}
											>
												新增包含关键词
											</Button>
										</Space>
										<Text type="secondary">比如发送“聪明”返回邀请码，或者让 CONTACT_US 这种 click key 命中专属回复。</Text>
									</div>

									{keywordReplies.length ? (
										<div className="wx-menu-page__rules-list">
											{keywordReplies.map((item, index) => (
												<KeywordRuleCard
													key={`keyword-rule-${index}`}
													index={index}
													value={item}
													onChange={patch => updateKeywordReply(index, patch)}
													onReplyChange={reply => updateKeywordReplyReply(index, reply)}
													onRemove={() => removeKeywordReply(index)}
												/>
											))}
										</div>
									) : (
										<div className="wx-menu-page__empty-block">
											<Paragraph className="wx-menu-page__empty-title">还没有配置关键词回复</Paragraph>
											<Paragraph type="secondary">
												可以先加一条 `content_exact` 规则，把 “聪明” 这类口令指向邀请码；剩余消息再交给普通消息兜底处理。
											</Paragraph>
										</div>
									)}
								</Card>

								<div className="wx-menu-page__aside-stack">
									<Card bordered={false} className="wx-menu-page__panel wx-menu-page__panel--aside" title="回复配置提示">
										<List size="small" dataSource={detail?.replyTips || []} renderItem={item => <List.Item>{item}</List.Item>} />
									</Card>
									<Card bordered={false} className="wx-menu-page__panel wx-menu-page__panel--aside" title="规则速记">
										<div className="wx-menu-page__rule-cheats">
											<div className="wx-menu-page__cheat-item">
												<Tag color="green">event_key_exact</Tag>
												<Text type="secondary">给 click 菜单事件用，关键字写 event key。</Text>
											</div>
											<div className="wx-menu-page__cheat-item">
												<Tag color="blue">content_exact</Tag>
												<Text type="secondary">适合口令类消息，比如“聪明”。</Text>
											</div>
											<div className="wx-menu-page__cheat-item">
												<Tag color="gold">content_contains</Tag>
												<Text type="secondary">适合模糊关键词和自然语言触发。</Text>
											</div>
										</div>
									</Card>
								</div>
							</div>
						</section>

						<section className="wx-menu-page__module">
							<SectionTitle
								index="04"
								title="普通消息兜底"
								description="当用户消息没有命中任何关键词规则时，按这里的策略继续处理，可以不回复、固定回复，或者交给 AI。"
							/>
							<div className="wx-menu-page__fallback-grid">
								<Card bordered={false} className="wx-menu-page__panel" title="兜底策略">
									<Space direction="vertical" size={16} style={{ display: "flex" }}>
										<div className="wx-menu-page__field">
											<Text strong>messageFallbackStrategy</Text>
											<Select
												value={messageFallbackStrategy}
												options={FALLBACK_STRATEGY_OPTIONS}
												onChange={value => setMessageFallbackStrategy(value)}
											/>
										</div>
										<Alert showIcon type="info" message={FALLBACK_STRATEGY_DESC_MAP[messageFallbackStrategy]} />
										<div className="wx-menu-page__strategy-notes">
											{FALLBACK_STRATEGY_OPTIONS.map(item => (
												<div
													key={item.value}
													className={`wx-menu-page__strategy-item ${
														item.value === messageFallbackStrategy ? "wx-menu-page__strategy-item--active" : ""
													}`}
												>
													<strong>{item.label}</strong>
													<span>{FALLBACK_STRATEGY_DESC_MAP[item.value]}</span>
												</div>
											))}
										</div>
									</Space>
								</Card>

								<Card
									bordered={false}
									className="wx-menu-page__panel"
									title="AI 回复设置"
									extra={
										<Button size="small" onClick={() => setAiPrompt(createAiPromptTemplate())}>
											填充助手模板
										</Button>
									}
								>
									<Space direction="vertical" size={16} style={{ display: "flex" }}>
										<div className="wx-menu-page__switch-row">
											<div>
												<Text strong>启用 AI</Text>
												<Paragraph type="secondary">只有兜底策略选了 AI 回复，这里的配置才会参与生效。</Paragraph>
											</div>
											<Switch checked={aiEnable} onChange={setAiEnable} />
										</div>
										<div className="wx-menu-page__field">
											<Text strong>AI Provider</Text>
											<Select
												showSearch
												allowClear
												placeholder={
													availableAiProviderOptions.length
														? "请选择 AI 模型配置中已启用的 Provider"
														: "请先到 AI 模型配置里启用 Provider"
												}
												value={aiProvider || undefined}
												options={aiProviderOptions}
												onChange={value => setAiProvider(value || "")}
											/>
											<Text type="secondary">这里已经同步 AI 模型配置里当前启用的来源，只展示可用于同步预览的 Provider。</Text>
										</div>
										<div className="wx-menu-page__field">
											<Text strong>AI Prompt</Text>
											<TextArea
												autoSize={{ minRows: 6, maxRows: 10 }}
												placeholder="给大模型的系统提示词，例如：根据用户消息回答公众号相关问题，保持简洁，无法确定时引导查看菜单。"
												value={aiPrompt}
												onChange={e => setAiPrompt(e.target.value)}
											/>
										</div>
									</Space>
								</Card>

								<Card
									bordered={false}
									className="wx-menu-page__panel"
									title="默认兜底回复"
									extra={
										<Button size="small" onClick={() => setDefaultReply(createDefaultReplyTemplate())}>
											填充项目介绍模板
										</Button>
									}
								>
									<ReplyEditor
										value={defaultReply}
										onChange={setDefaultReply}
										emptyText="当前没有配置默认回复。固定兜底模式下，未命中的消息会走系统默认文案。"
									/>
								</Card>
							</div>
						</section>

						<section className="wx-menu-page__module">
							<SectionTitle
								index="05"
								title="真实预览"
								description="这里会调用后端新增的预览接口，直接用当前编辑中的配置试跑命中结果和 AI 回复，不需要先保存草稿。"
							/>
							<div className="wx-menu-page__runtime-grid">
								<Card bordered={false} className="wx-menu-page__panel" title="真实命中预览">
									<Space direction="vertical" size={16} style={{ display: "flex" }}>
										<div className="wx-menu-page__field">
											<Text strong>触发方式</Text>
											<Select value={previewEventType} options={PREVIEW_EVENT_OPTIONS} onChange={setPreviewEventType} />
										</div>

										{previewEventType === "TEXT" ? (
											<div className="wx-menu-page__field">
												<Text strong>用户消息</Text>
												<TextArea
													autoSize={{ minRows: 3, maxRows: 5 }}
													placeholder="例如：聪明"
													value={previewContent}
													onChange={e => setPreviewContent(e.target.value)}
												/>
											</div>
										) : null}

										{previewEventType === "CLICK" ? (
											<div className="wx-menu-page__field">
												<Text strong>event key</Text>
												<Input
													placeholder="例如：CONTACT_US"
													value={previewEventKey}
													onChange={e => setPreviewEventKey(e.target.value)}
												/>
											</div>
										) : null}

										<Alert
											showIcon
											type="info"
											message={`当前会按「${getPreviewEventLabel(
												previewEventType
											)}」方式，把页面上正在编辑的配置送到后端真实试跑。`}
										/>

										{matchDisabledRules.length ? (
											<Alert
												showIcon
												type="warning"
												message="当前有本可命中的规则处于关闭状态"
												description={
													<div className="wx-menu-page__preview-hints">
														{matchDisabledRules.map((item, index) => (
															<div key={`${item.rule.title || "rule"}-${index}`} className="wx-menu-page__preview-hint">
																<strong>{item.rule.title || `规则 ${index + 1}`}</strong>
																<span>
																	匹配方式：{getMatchTypeLabel(item.rule.matchType)}，命中词：{item.matchedKeyword}
																</span>
															</div>
														))}
													</div>
												}
											/>
										) : null}

										<Button type="primary" onClick={handlePreviewMatch} loading={actionLoading === "previewMatch"}>
											试跑命中结果
										</Button>

										<div className="wx-menu-page__preview-result">
											<MatchPreviewMeta result={matchPreviewResult} />
											<WechatReplyPreview
												title="命中结果"
												reply={matchPreviewResult?.reply}
												triggerLabel={previewTriggerLabel}
												triggerValue={previewTriggerValue}
												emptyText="这次试跑没有返回回复内容。"
											/>
										</div>
									</Space>
								</Card>

								<Card bordered={false} className="wx-menu-page__panel" title="AI 回复预览">
									<Space direction="vertical" size={16} style={{ display: "flex" }}>
										<div className="wx-menu-page__field">
											<Text strong>用户消息</Text>
											<TextArea
												autoSize={{ minRows: 4, maxRows: 6 }}
												placeholder="例如：我想了解派聪明 RAG 这个项目"
												value={aiPreviewContent}
												onChange={e => setAiPreviewContent(e.target.value)}
											/>
										</div>

										<Alert
											showIcon
											type={aiEnable ? "success" : "warning"}
											message={
												aiEnable
													? `当前 AI 预览会使用 Provider：${getAiProviderLabel(aiProvider)}`
													: "当前 AI 开关还没开启，后端预览大概率会直接返回失败原因。"
											}
										/>

										{!availableAiProviderOptions.length ? (
											<Alert
												showIcon
												type="warning"
												message="还没有可用的 AI Provider"
												description="请先到 AI 模型配置页启用至少一个支持同步预览的模型来源，再回来选择。"
											/>
										) : null}

										{aiProvider && !isKnownAiProvider(aiProvider) ? (
											<Alert
												showIcon
												type="warning"
												message="当前 Provider 不在后端可识别列表里"
												description="建议改用下拉中的固定值，例如 PAI_AI、ZHI_PU_AI、ALI_AI、DEEP_SEEK、DOU_BAO_AI。"
											/>
										) : null}

										{aiProvider && isKnownAiProvider(aiProvider) && !isAiProviderEnabled ? (
											<Alert
												showIcon
												type="warning"
												message="当前 Provider 未在 AI 模型配置中启用"
												description="这份微信配置草稿里保存了一个旧值，建议改成当前已启用的 Provider，避免预览和线上运行不一致。"
											/>
										) : null}

										<Button type="primary" onClick={handlePreviewAi} loading={actionLoading === "previewAi"}>
											试跑 AI 回复
										</Button>

										{aiPreviewResult && !aiPreviewResult.success ? (
											<Alert showIcon type="error" message="AI 预览失败" description={getAiPreviewErrorText(aiPreviewResult)} />
										) : null}

										{aiPreviewResult?.provider ? (
											<div className="wx-menu-page__preview-meta">
												<div className="wx-menu-page__preview-meta-item">
													<span>AI Provider</span>
													<strong>{aiPreviewResult.provider}</strong>
												</div>
											</div>
										) : null}

										<WechatReplyPreview
											title="AI 回复结果"
											reply={aiPreviewReply}
											triggerLabel="用户消息"
											triggerValue={aiPreviewContent || "未填写试跑内容"}
											emptyText="执行 AI 预览后，这里会展示后端返回的回复内容。"
										/>
									</Space>
								</Card>
							</div>
						</section>
					</div>
				</Spin>
			</ContentWrap>
		</div>
	);
};

export default WxMenuPage;
