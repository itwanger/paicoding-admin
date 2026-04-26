import http from "@/api";
import { PORT1 } from "@/api/config/servicePort";

export interface UserLoginAuditItem {
	id: number;
	userId?: number;
	loginName?: string;
	starNumber?: string;
	loginType?: number;
	loginTypeDesc?: string;
	eventType?: string;
	eventTypeDesc?: string;
	deviceId?: string;
	deviceName?: string;
	ip?: string;
	region?: string;
	sessionHash?: string;
	riskTag?: string;
	reason?: string;
	createTime?: string;
}

export interface UserSessionItem {
	id: number;
	userId?: number;
	loginName?: string;
	loginType?: number;
	loginTypeDesc?: string;
	sessionHash?: string;
	deviceId?: string;
	deviceName?: string;
	ip?: string;
	region?: string;
	sessionState?: string;
	sessionStateDesc?: string;
	offlineReason?: string;
	latestSeenTime?: string;
	expireTime?: string;
	offlineTime?: string;
	createTime?: string;
}

export interface UserShareRiskItem {
	userId?: number;
	loginName?: string;
	starNumber?: string;
	kickoutCount?: number;
	loginSuccessCount?: number;
	deviceCount?: number;
	ipCount?: number;
	lastKickoutTime?: string;
	lastActiveTime?: string;
	riskLevel?: string;
	riskReason?: string;
	forbidden?: boolean;
	forbidUntil?: string;
	forbidReason?: string;
}

export interface LoginAuditQuery {
	userId?: number;
	loginName?: string;
	starNumber?: string;
	deviceId?: string;
	ip?: string;
	eventType?: string;
	pageNumber: number;
	pageSize: number;
}

export interface UserShareRiskQuery {
	loginName?: string;
	recentDays?: number;
	minKickoutCount?: number;
	minDeviceCount?: number;
	minIpCount?: number;
	pageNumber: number;
	pageSize: number;
}

export interface UserSessionQuery {
	userId?: number;
	loginName?: string;
	deviceId?: string;
	ip?: string;
	activeOnly?: boolean;
	pageNumber: number;
	pageSize: number;
}

export interface UserForbidReq {
	userId: number;
	days?: number;
	reason?: string;
}

export interface UserUnforbidReq {
	userId: number;
}

export interface PageResult<T> {
	list: T[];
	pageNum: number;
	pageSize: number;
	total: number;
	pageTotal?: number;
}

export const getLoginAuditListApi = (params: LoginAuditQuery) => {
	return http.post<PageResult<UserLoginAuditItem>>(`${PORT1}/user/login-audit`, params);
};

export const getUserSessionListApi = (params: UserSessionQuery) => {
	return http.post<PageResult<UserSessionItem>>(`${PORT1}/user/session`, params);
};

export const getUserShareRiskListApi = (params: UserShareRiskQuery) => {
	return http.post<PageResult<UserShareRiskItem>>(`${PORT1}/user/share-risk`, params);
};

export const forbidUserApi = (params: UserForbidReq) => {
	return http.post<string>(`${PORT1}/user/forbid`, params);
};

export const unforbidUserApi = (params: UserUnforbidReq) => {
	return http.post<string>(`${PORT1}/user/unforbid`, params);
};
