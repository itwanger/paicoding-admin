import http from "@/api";
import { PORT1 } from "@/api/config/servicePort";

/**
 * @name 分类模块
 */

export const getAllApi = () => {
	return http.get(`${PORT1}/statistics/queryTotal`);
};

// 获取列表
export const getPvUvApi = (day: number) => {
	return http.get(`${PORT1}/statistics/pvUvDayList?day=${day}`);
};

// download pvuv to excel, params: day response: excel file
export const download2ExcelPvUvApi = (day: number) => {
	return http.down(`${PORT1}/statistics/pvUvDayDownload2Excel?day=${day}`, { responseType: "blob" });
};
