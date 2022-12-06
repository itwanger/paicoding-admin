import qs from "qs";

import http from "@/api";
import { PORT1 } from "@/api/config/servicePort";
import { Login } from "@/api/interface/index";

/**
 * @name 文章模块
 */

// 获取列表
export const getArticleListApi = () => {
	return http.get(`${PORT1}/article/list`);
};

// 删除操作
export const delArticleApi = (articleId: number) => {
	return http.get<Login.ResAuthButtons>(`${PORT1}/article/delete`, { articleId });
};

// 置顶/加精操作
export const operateArticleApi = (params: object | undefined) => {
	return http.get<Login.ResAuthButtons>(`${PORT1}/article/operate`, params);
};
