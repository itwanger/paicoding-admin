import http from "@/api";
import { PORT1 } from "@/api/config/servicePort";
import { Login } from "@/api/interface/index";

// 添加返回类型
export const getAuthorWhiteListApi = () => {
	return http.get(`${PORT1}/whitelist/get`);
};

// 删除操作
export const delAuthorWhiteApi = (authorId: number) => {
	return http.get<Login.ResAuthButtons>(`${PORT1}/whitelist/remove`, { authorId });
};

// 保存操作
export const updateAuthorWhiteApi = (authorId: number) => {
	return http.get<Login.ResAuthButtons>(`${PORT1}/whitelist/add`, { authorId });
};
