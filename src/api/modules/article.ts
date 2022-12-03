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
export const delArticleApi = (categoryId: number) => {
	return http.get<Login.ResAuthButtons>(`${PORT1}/article/delete`, { categoryId });
};
