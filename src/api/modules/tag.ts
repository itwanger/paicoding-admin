import qs from "qs";

import http from "@/api";
import { PORT1 } from "@/api/config/servicePort";
import { Login } from "@/api/interface/index";

/**
 * @name 标签模块
 */

// 获取列表
export const getTagListApi = () => {
	return http.get(`${PORT1}/tag/list`);
};

// 删除操作
export const delTagListApi = (categoryId: number) => {
	return http.get<Login.ResAuthButtons>(`${PORT1}/tag/delete`, { categoryId });
};
