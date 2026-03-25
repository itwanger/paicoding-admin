import http from "@/api";
import { PORT1 } from "@/api/config/servicePort";
import { Login } from "@/api/interface/index";

export interface SensitiveWordHitDTO {
	word: string;
	hitCount: number;
}

export interface SensitiveWordConfigDTO {
	enable: boolean;
	denyWords: string[];
	allowWords: string[];
	hitTotal?: number;
	hitWords?: SensitiveWordHitDTO[];
}

export interface SensitiveWordConfigReq {
	enable: boolean;
	denyWords: string[];
	allowWords: string[];
}

export interface SensitiveWordHitPageReq {
	pageNumber: number;
	pageSize: number;
}

export interface SensitiveWordHitPageDTO {
	list: SensitiveWordHitDTO[];
	pageNum: number;
	pageSize: number;
	total: number;
	pageTotal: number;
}

export const getSensitiveWordDetailApi = () => {
	return http.get<SensitiveWordConfigDTO>(`${PORT1}/sensitive/detail`);
};

export const saveSensitiveWordConfigApi = (params: SensitiveWordConfigReq) => {
	return http.post<Login.ResAuthButtons>(`${PORT1}/sensitive/save`, params);
};

export const getSensitiveWordHitListApi = (params: SensitiveWordHitPageReq) => {
	return http.post<SensitiveWordHitPageDTO>(`${PORT1}/sensitive/hit/list`, params);
};

export const clearSensitiveWordHitApi = (word: string) => {
	return http.post<Login.ResAuthButtons>(`${PORT1}/sensitive/hit/clear`, { word });
};
