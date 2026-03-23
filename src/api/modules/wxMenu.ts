import http from "@/api";
import { PORT1 } from "@/api/config/servicePort";

export interface WxMenuButton {
	type?: string;
	name?: string;
	key?: string;
	url?: string;
	appid?: string;
	pagepath?: string;
	media_id?: string;
	article_id?: string;
	sub_button?: WxMenuButton[];
}

export interface WxMenuTree {
	button?: WxMenuButton[];
}

export interface WxMenuReplyArticle {
	title?: string;
	description?: string;
	picUrl?: string;
	url?: string;
}

export interface WxMenuReply {
	replyType?: string;
	content?: string;
	articles?: WxMenuReplyArticle[];
}

export interface WxMenuKeywordReply {
	matchType?: string;
	keywords?: string[];
	replyType?: string;
	reply?: WxMenuReply;
	enabled?: boolean;
	priority?: number;
	title?: string;
}

export interface WxMenuClickReply {
	key?: string;
	title?: string;
	reply?: WxMenuReply;
}

export interface WxMenuAiProviderOption {
	code?: number;
	value?: string;
	name?: string;
	syncSupport?: boolean;
}

export interface WxMenuConfig {
	menuJson?: string;
	comment?: string;
	subscribeReply?: WxMenuReply;
	defaultReply?: WxMenuReply;
	keywordReplies?: WxMenuKeywordReply[];
	messageFallbackStrategy?: string;
	aiPrompt?: string;
	aiProvider?: string;
	aiEnable?: boolean;
	aiProviderOptions?: WxMenuAiProviderOption[];
	clickReplies?: WxMenuClickReply[];
}

export interface WxMenuDetail {
	draftConfig?: WxMenuConfig;
	draftJson?: string;
	draftComment?: string;
	draftMenu?: WxMenuTree;
	draftValid?: boolean;
	draftErrors?: string[];
	draftWarnings?: string[];
	subscribeReply?: WxMenuReply;
	defaultReply?: WxMenuReply;
	keywordReplies?: WxMenuKeywordReply[];
	messageFallbackStrategy?: string;
	aiPrompt?: string;
	aiProvider?: string;
	aiEnable?: boolean;
	clickReplies?: WxMenuClickReply[];
	remoteJson?: string;
	remoteMenu?: WxMenuTree;
	conditionalMenuCount?: number;
	remoteError?: string;
	menuJsonTemplate?: string;
	menuJsonTips?: string[];
	replyTips?: string[];
}

export interface WxMenuSaveReq {
	menuJson: string;
	comment?: string;
	subscribeReply?: WxMenuReply;
	defaultReply?: WxMenuReply;
	keywordReplies?: WxMenuKeywordReply[];
	messageFallbackStrategy?: string;
	aiPrompt?: string;
	aiProvider?: string;
	aiEnable?: boolean;
	clickReplies?: WxMenuClickReply[];
}

export interface WxMenuValidateReq {
	menuJson?: string;
	subscribeReply?: WxMenuReply;
	defaultReply?: WxMenuReply;
	keywordReplies?: WxMenuKeywordReply[];
	messageFallbackStrategy?: string;
	aiPrompt?: string;
	aiProvider?: string;
	aiEnable?: boolean;
	clickReplies?: WxMenuClickReply[];
}

export interface WxMenuValidateRes {
	valid?: boolean;
	normalizedMenuJson?: string;
	menuErrors?: string[];
	replyErrors?: string[];
	errors?: string[];
	warnings?: string[];
}

export interface WxMenuPreviewMatchReq extends WxMenuSaveReq {
	eventType?: string;
	eventKey?: string;
	content?: string;
}

export interface WxMenuPreviewMatchRes {
	matched?: boolean;
	matchedRuleTitle?: string;
	matchedRuleType?: string;
	matchedKeyword?: string;
	reply?: WxMenuReply;
	fallbackStrategy?: string;
	usedFallback?: boolean;
}

export interface WxMenuPreviewAiReq {
	content?: string;
	aiPrompt?: string;
	aiProvider?: string;
	aiEnable?: boolean;
}

export interface WxMenuPreviewAiRes {
	success?: boolean;
	replyText?: string;
	provider?: string;
	errorMsg?: string;
}

export interface WxMenuPublishReq {
	menuJson?: string;
}

export interface WxMenuPublishRes {
	success?: boolean;
	errCode?: number;
	errMsg?: string;
	publishedMenuJson?: string;
}

export const getWxMenuDetailApi = () => {
	return http.get<WxMenuDetail>(`${PORT1}/wx/menu/detail`);
};

export const saveWxMenuDraftApi = (params: WxMenuSaveReq) => {
	return http.post(`${PORT1}/wx/menu/save`, params);
};

export const validateWxMenuApi = (params?: WxMenuValidateReq) => {
	return http.post<WxMenuValidateRes>(`${PORT1}/wx/menu/validate`, params);
};

export const previewWxMenuMatchApi = (params?: WxMenuPreviewMatchReq) => {
	return http.post<WxMenuPreviewMatchRes>(`${PORT1}/wx/menu/preview/match`, params);
};

export const previewWxMenuAiApi = (params?: WxMenuPreviewAiReq) => {
	return http.post<WxMenuPreviewAiRes>(`${PORT1}/wx/menu/preview/ai`, params);
};

export const publishWxMenuApi = (params?: WxMenuPublishReq) => {
	return http.post<WxMenuPublishRes>(`${PORT1}/wx/menu/publish`, params);
};

export const syncWxMenuApi = () => {
	return http.post<WxMenuDetail>(`${PORT1}/wx/menu/sync`);
};
