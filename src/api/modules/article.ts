import qs from "qs";

import http from "@/api";
import { PORT1 } from "@/api/config/servicePort";
import { Login } from "@/api/interface/index";

/**
 * @name 文章模块
 */

// 获取列表
export const getArticleListApi = (data: { pageNumber: number; pageSize: number }) => {
	return http.get(`${PORT1}/article/list`, data);
};

// 保存操作
export const updateArticleApi = (params: object | undefined) => {
	return http.post<Login.ResAuthButtons>(`${PORT1}/article/save`, params);
};

// 删除操作
export const delArticleApi = (articleId: number) => {
	return http.get<Login.ResAuthButtons>(`${PORT1}/article/delete`, { articleId });
};

// 置顶/加精操作
export const operateArticleApi = (params: object | undefined) => {
	return http.get<Login.ResAuthButtons>(`${PORT1}/article/operate`, params);
};

// 上线/下线操作
export const examineArticleApi = (params: object | undefined) => {
	return http.get<Login.ResAuthButtons>(`${PORT1}/article/examine`, params);
};
