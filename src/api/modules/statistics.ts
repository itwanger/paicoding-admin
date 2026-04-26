import http from "@/api";
import { PORT1 } from "@/api/config/servicePort";

/**
 * @name 数据统计模块
 */

export const getAllApi = () => {
	return http.get(`${PORT1}/statistics/queryTotal`);
};

export const getPvUvApi = (day: number) => {
	return http.get(`${PORT1}/statistics/pvUvDayList?day=${day}`);
};

export const download2ExcelPvUvApi = (day: number) => {
	return http.down(`${PORT1}/statistics/pvUvDayDownload2Excel?day=${day}`, { responseType: "blob" });
};
