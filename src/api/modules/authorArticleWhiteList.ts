import http from "@/api";
import {PORT1} from "@/api/config/servicePort";
import {Login} from "@/api/interface/index";
import {IFormType} from "@/views/articleWhiteList";

/**
 * @name 标签模块
 */

// 获取列表
export const getWhiteListApi = (data: { pageNumber: number; pageSize: number }) => {
	return http.get(`${PORT1}/api/admin/whitelist/get`, data);
};

// 删除操作
export const removeAuthor = (tagId: number) => {
	return http.get<Login.ResAuthButtons>(`${PORT1}/api/admin/whitelist/remove`, {tagId});
};

// 保存操作
export const addAuthor = (form: IFormType) => {
	return http.post<Login.ResAuthButtons>(`${PORT1}/api/admin/whitelist/add`, form);
};
