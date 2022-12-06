import qs from "qs";

import http from "@/api";
import { PORT1 } from "@/api/config/servicePort";
import { Login } from "@/api/interface/index";
import { IFormType } from "@/views/column";

/**
 * @name 专栏模块
 */

// 获取列表
export const getColumnListApi = () => {
	return http.get(`${PORT1}/column/listColumn`);
};

// 保存操作
export const updateColumnApi = (form: IFormType) => {
	return http.post<Login.ResAuthButtons>(`${PORT1}/column/saveColumn`, form);
};

// 删除操作
export const delColumnApi = (columnId: number) => {
	return http.get<Login.ResAuthButtons>(`${PORT1}/column/deleteColumn`, { columnId });
};
