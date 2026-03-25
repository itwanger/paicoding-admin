import http from "@/api";
import { PORT1 } from "@/api/config/servicePort";
import { Login } from "@/api/interface";

export interface SearchCommentReq {
	commentId?: number;
	articleId?: number;
	articleTitle?: string;
	userId?: number;
	userName?: string;
	content?: string;
	commentType?: number;
	pageNumber: number;
	pageSize: number;
}

export interface CommentSaveReq {
	commentId?: number;
	articleId: number;
	parentCommentId?: number;
	topCommentId?: number;
	commentContent: string;
}

export interface CommentAdminDTO {
	commentId: number;
	articleId: number;
	articleTitle?: string;
	userId: number;
	userName?: string;
	userAvatar?: string;
	commentContent: string;
	parentCommentId: number;
	topCommentId: number;
	parentCommentContent?: string;
	topCommentContent?: string;
	commentType: number;
	replyCount?: number;
	praiseCount?: number;
	highlightInfo?: string;
	createTime?: string;
	updateTime?: string;
}

export interface CommentPageDTO {
	list: CommentAdminDTO[];
	pageNum: number;
	pageSize: number;
	total: number;
	pageTotal: number;
}

export const getCommentListApi = (params: SearchCommentReq) => {
	return http.post<CommentPageDTO>(`${PORT1}/comment/list`, params);
};

export const getCommentDetailApi = (commentId: number) => {
	return http.get<CommentAdminDTO>(`${PORT1}/comment/detail`, { commentId });
};

export const saveCommentApi = (params: CommentSaveReq) => {
	return http.post<Login.ResAuthButtons>(`${PORT1}/comment/save`, params);
};

export const deleteCommentApi = (commentId: number) => {
	return http.get<Login.ResAuthButtons>(`${PORT1}/comment/delete`, { commentId });
};
