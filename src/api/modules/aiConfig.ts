import http from "@/api";
import { PORT1 } from "@/api/config/servicePort";
import { Login } from "@/api/interface/index";

export type AISourceValue =
	| "CHAT_GPT_3_5"
	| "CHAT_GPT_4"
	| "PAI_AI"
	| "XUN_FEI_AI"
	| "ZHI_PU_AI"
	| "ZHIPU_CODING"
	| "ALI_AI"
	| "DEEP_SEEK"
	| "DOU_BAO_AI";

export interface GptModelConfig {
	keys?: string[];
	proxy?: boolean;
	apiHost?: string;
	timeOut?: number;
	maxToken?: number;
}

export interface ChatGptConfig {
	main?: AISourceValue;
	gpt35?: GptModelConfig;
	gpt4?: GptModelConfig;
}

export interface ZhipuConfig {
	apiSecretKey?: string;
	requestIdTemplate?: string;
	model?: string;
}

export interface XunFeiConfig {
	hostUrl?: string;
	domain?: string;
	appId?: string;
	apiKey?: string;
	apiSecret?: string;
	apiPassword?: string;
}

export interface ZhipuCodingConfig {
	apiKey?: string;
	apiHost?: string;
	model?: string;
	timeout?: number;
}

export interface DeepSeekConfig {
	apiKey?: string;
	apiHost?: string;
	model?: string;
	timeout?: number;
}

export interface DoubaoConfig {
	apiKey?: string;
	apiHost?: string;
	endPoint?: string;
}

export interface AliConfig {
	model?: string;
}

export interface AiConfigAdminDTO {
	sources?: AISourceValue[];
	chatGpt?: ChatGptConfig;
	zhipu?: ZhipuConfig;
	zhipuCoding?: ZhipuCodingConfig;
	xunFei?: XunFeiConfig;
	deepSeek?: DeepSeekConfig;
	doubao?: DoubaoConfig;
	ali?: AliConfig;
}

export type AiConfigAdminReq = AiConfigAdminDTO;

export interface AiConfigTestReq {
	source: AISourceValue;
	prompt?: string;
}

export interface AiConfigTestRes {
	source?: AISourceValue;
	success?: boolean;
	message?: string;
	answer?: string;
	costMs?: number;
}

export const getAiConfigDetailApi = () => {
	return http.get<AiConfigAdminDTO>(`${PORT1}/ai/config/detail`);
};

export const saveAiConfigApi = (params: AiConfigAdminReq) => {
	return http.post<Login.ResAuthButtons>(`${PORT1}/ai/config/save`, params);
};

export const testAiConfigApi = (params: AiConfigTestReq) => {
	return http.post<AiConfigTestRes>(`${PORT1}/ai/config/test`, params);
};
