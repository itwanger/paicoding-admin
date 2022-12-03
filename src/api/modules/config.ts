import qs from "qs";

import http from "@/api";
import { PORT1 } from "@/api/config/servicePort";
import { Login } from "@/api/interface/index";

/**
 * @name 分类模块
 */

// 获取列表
export const getConfigListApi = () => {
	return http.get(`${PORT1}/config/list`);
};

// 删除操作
export const delConfigApi = (configId: number) => {
	return http.get<Login.ResAuthButtons>(`${PORT1}/config/delete`, { configId });
};
