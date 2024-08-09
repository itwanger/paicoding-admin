import http from "@/api";
import { PORT1 } from "@/api/config/servicePort";
import { Login } from "@/api/interface/index";
import { IFormType } from "@/views/resume";

/**
 * @name 标签模块
 */

// 获取列表
export const getResumeListApi = (data: { pageNumber: number; pageSize: number }) => {
	return http.post(`${PORT1}/resume/list`, data);
};

// 删除操作
export const delResumeApi = (resumeId: number) => {
	return http.get<Login.ResAuthButtons>(`${PORT1}/resume/delete?resumeId=${resumeId}`);
};

// 上传
export const replayResumeApi = (form: IFormType) => {
	return http.post<Login.ResAuthButtons>(`${PORT1}/resume/replay`, form);
};

// 下载
export const downResumeApi = (resumeId: number) => {
	return http.get<Login.ResAuthButtons>(`${PORT1}/resume/process?resumeId=${resumeId}`);
};
