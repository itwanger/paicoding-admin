import http from "@/api";
import { PORT1 } from "@/api/config/servicePort";
import { Login } from "@/api/interface/index";
import { baseDomain } from "@/utils/util";

/**
 * @name 分类模块
 */

// 获取字典值
export const getDiscListApi = () => {
	console.log("获取字典，getDiscListApi");
	return http.get(`${PORT1}/common/dict`);
};

// 上传图片
export const uploadImgApi = (data: FormData) => {
	// 添加时间戳参数，确保每个请求 URL 不同，避免被 AxiosCanceler 取消
	return http.post<Login.ResAuthButtons>(`${PORT1}/image/upload?t=${Date.now()}`, data);
};

// 文件上传
export const uploadFileUrl = () => {
	return `${baseDomain}/oss/upload`;
};
