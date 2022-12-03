import qs from "qs";

import http from "@/api";
import { PORT1 } from "@/api/config/servicePort";
import { Login } from "@/api/interface/index";

/**
 * @name 专栏模块
 */

// 获取列表
export const getColumnListApi = () => {
	return http.get(`${PORT1}/column/listColumn`);
};

// 删除操作
export const delColumnApi = (categoryId: number) => {
	return http.get<Login.ResAuthButtons>(`${PORT1}/column/deleteColumn`, { categoryId });
};
