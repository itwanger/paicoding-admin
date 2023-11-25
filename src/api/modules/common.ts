import http from "@/api";
import { PORT1 } from "@/api/config/servicePort";

/**
 * @name 分类模块
 */

// 获取字典值
export const getDiscListApi = () => {
	console.log("获取字典，getDiscListApi");
	return http.get(`${PORT1}/common/dict`);
};
