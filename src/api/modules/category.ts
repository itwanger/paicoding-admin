import qs from "qs";

import http from "@/api";
import { PORT1 } from "@/api/config/servicePort";
import { Login } from "@/api/interface/index";

/**
 * @name 分类模块
 */

// 获取列表
export const getCategoryListApi = () => {
	return http.get(`${PORT1}/category/list`);
};

// 删除操作
export const delCategoryApi = (categoryId: number) => {
	return http.get<Login.ResAuthButtons>(`${PORT1}/category/delete`, { categoryId });
};
