import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { DeleteOutlined, EditOutlined, MessageOutlined } from "@ant-design/icons";
import { Avatar, Button, Form, Input, InputNumber, message, Modal, Table, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import {
	CommentAdminDTO,
	CommentSaveReq,
	deleteCommentApi,
	getCommentDetailApi,
	getCommentListApi,
	saveCommentApi
} from "@/api/modules/comment";
import { ContentInterWrap, ContentWrap } from "@/components/common-wrap";
import { initPagination, IPagination } from "@/enums/common";
import { baseDomain } from "@/utils/util";
import Search from "./components/search";

import "./index.scss";

type ModalMode = "create" | "reply" | "edit";

interface SearchFormState {
	articleId?: number;
	articleTitle?: string;
	userName?: string;
	content?: string;
	commentType: number;
}

interface FormState {
	commentId?: number;
	articleId?: number;
	parentCommentId?: number;
	topCommentId?: number;
	commentContent: string;
}

const defaultSearchForm: SearchFormState = {
	articleId: undefined,
	articleTitle: "",
	userName: "",
	content: "",
	commentType: -1
};

const defaultForm: FormState = {
	commentId: undefined,
	articleId: undefined,
	parentCommentId: 0,
	topCommentId: 0,
	commentContent: ""
};

const Comment: FC = () => {
	const [formRef] = Form.useForm<FormState>();
	const [form, setForm] = useState<FormState>(defaultForm);
	const [searchForm, setSearchForm] = useState<SearchFormState>(defaultSearchForm);
	const [tableData, setTableData] = useState<CommentAdminDTO[]>([]);
	const [pagination, setPagination] = useState<IPagination>(initPagination);
	const [query, setQuery] = useState(0);
	const [submitting, setSubmitting] = useState(false);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [modalMode, setModalMode] = useState<ModalMode>("create");
	const [currentComment, setCurrentComment] = useState<CommentAdminDTO | null>(null);
	const { current, pageSize } = pagination;

	const paginationInfo = {
		showSizeChanger: true,
		showTotal: (total: number) => `共 ${total || 0} 条`,
		...pagination,
		onChange: (nextCurrent: number, nextPageSize: number) => {
			setPagination({ current: nextCurrent, pageSize: nextPageSize });
		}
	};

	const refreshList = useCallback(() => {
		setQuery(prev => prev + 1);
	}, []);

	const handleSearchChange = (value: Partial<SearchFormState>) => {
		setSearchForm(prev => ({ ...prev, ...value }));
	};

	const handleSearch = () => {
		setPagination(prev => ({ ...prev, current: 1 }));
		refreshList();
	};

	const closeModal = () => {
		setIsModalOpen(false);
		setCurrentComment(null);
		setForm(defaultForm);
		formRef.resetFields();
	};

	const openCreateModal = () => {
		setModalMode("create");
		setCurrentComment(null);
		setForm(defaultForm);
		formRef.setFieldsValue(defaultForm);
		setIsModalOpen(true);
	};

	const openReplyModal = async (commentId: number) => {
		const { result } = await getCommentDetailApi(commentId);
		const nextForm: FormState = {
			commentId: undefined,
			articleId: result?.articleId,
			parentCommentId: result?.commentId,
			topCommentId: result?.commentType === 1 ? result?.commentId : result?.topCommentId,
			commentContent: ""
		};
		setModalMode("reply");
		setCurrentComment(result || null);
		setForm(nextForm);
		formRef.setFieldsValue(nextForm);
		setIsModalOpen(true);
	};

	const openEditModal = async (commentId: number) => {
		const { result } = await getCommentDetailApi(commentId);
		const nextForm: FormState = {
			commentId: result?.commentId,
			articleId: result?.articleId,
			parentCommentId: result?.parentCommentId,
			topCommentId: result?.topCommentId,
			commentContent: result?.commentContent || ""
		};
		setModalMode("edit");
		setCurrentComment(result || null);
		setForm(nextForm);
		formRef.setFieldsValue(nextForm);
		setIsModalOpen(true);
	};

	const handleDelete = (commentId: number) => {
		Modal.warning({
			title: "确认删除这条评论吗",
			content: "删除后无法恢复，顶级评论删除后整条评论串都会在前台隐藏。",
			maskClosable: true,
			closable: true,
			onOk: async () => {
				const { status } = await deleteCommentApi(commentId);
				const { code, msg } = status || {};
				if (code === 0) {
					message.success("删除成功");
					refreshList();
				} else {
					message.error(msg || "删除失败");
				}
			}
		});
	};

	const handleSubmit = async () => {
		const values = await formRef.validateFields();
		const payload: CommentSaveReq = {
			commentId: modalMode === "edit" ? form.commentId : undefined,
			articleId: Number(values.articleId),
			parentCommentId: Number(values.parentCommentId || 0),
			topCommentId: Number(values.topCommentId || 0),
			commentContent: values.commentContent
		};

		setSubmitting(true);
		try {
			const { status } = await saveCommentApi(payload);
			const { code, msg } = status || {};
			if (code === 0) {
				message.success(modalMode === "edit" ? "评论更新成功" : "评论保存成功");
				closeModal();
				refreshList();
			} else {
				message.error(msg || "保存失败");
			}
		} finally {
			setSubmitting(false);
		}
	};

	useEffect(() => {
		const fetchList = async () => {
			const { result } = await getCommentListApi({
				pageNumber: current,
				pageSize,
				...searchForm
			});
			const list = result?.list || [];
			const pageNum = Number(result?.pageNum || current);
			const resPageSize = Number(result?.pageSize || pageSize);
			const total = Number(result?.total || 0);
			setPagination(prev => ({ ...prev, current: pageNum, pageSize: resPageSize, total }));
			setTableData(list.map(item => ({ ...item, key: item.commentId } as CommentAdminDTO & { key: number })));
		};
		void fetchList();
	}, [query, current, pageSize]);

	const modalTitle = useMemo(() => {
		if (modalMode === "edit") return "编辑评论";
		if (modalMode === "reply") return "回复评论";
		return "新增评论";
	}, [modalMode]);

	const modalContext = useMemo(() => {
		if (!currentComment) {
			return null;
		}
		return (
			<div className="comment-page__context">
				<div className="comment-page__context-title">当前目标</div>
				<div className="comment-page__context-line">
					文章：{currentComment.articleTitle || `文章 ${currentComment.articleId}`}
				</div>
				<div className="comment-page__context-line">评论ID：{currentComment.commentId}</div>
				<div className="comment-page__context-line">原内容：{currentComment.commentContent}</div>
			</div>
		);
	}, [currentComment]);

	const columns: ColumnsType<CommentAdminDTO> = [
		{
			title: "评论ID",
			dataIndex: "commentId",
			key: "commentId",
			width: 96
		},
		{
			title: "文章",
			dataIndex: "articleTitle",
			key: "articleTitle",
			width: 260,
			render: (_, item) => {
				const commentUrl = `${baseDomain}/article/detail/${item.articleId}#comment-${item.commentId}`;
				return (
					<div>
						<a href={commentUrl} target="_blank" rel="noreferrer" className="cell-link">
							{item.articleTitle || `文章 ${item.articleId}`}
						</a>
						<div className="cell-meta">文章ID：{item.articleId}</div>
					</div>
				);
			}
		},
		{
			title: "类型",
			dataIndex: "commentType",
			key: "commentType",
			width: 96,
			render: value => (value === 1 ? <Tag color="blue">顶级评论</Tag> : <Tag color="gold">回复</Tag>)
		},
		{
			title: "内容",
			dataIndex: "commentContent",
			key: "commentContent",
			render: (_, item) => (
				<Tooltip title={item.commentContent}>
					<div>
						<div className="cell-content">{item.commentContent}</div>
						{item.parentCommentId > 0 ? <div className="cell-meta">回复 #{item.parentCommentId}</div> : null}
						{item.parentCommentContent ? <div className="cell-meta">引用：{item.parentCommentContent}</div> : null}
					</div>
				</Tooltip>
			)
		},
		{
			title: "作者",
			dataIndex: "userName",
			key: "userName",
			width: 180,
			render: (_, item) => (
				<div className="cell-user">
					<Avatar src={item.userAvatar}>{item.userName?.slice(0, 2) || "匿"}</Avatar>
					<div>
						<div className="cell-user-name">{item.userName || `用户 ${item.userId}`}</div>
						<div className="cell-meta">UID：{item.userId}</div>
					</div>
				</div>
			)
		},
		{
			title: "统计",
			key: "stat",
			width: 120,
			render: (_, item) => (
				<div>
					<div>回复：{item.replyCount || 0}</div>
					<div className="cell-meta">点赞：{item.praiseCount || 0}</div>
				</div>
			)
		},
		{
			title: "时间",
			dataIndex: "createTime",
			key: "createTime",
			width: 132,
			render: (_, item) => {
				const createTime = item.createTime ? dayjs(item.createTime) : null;
				const updateTime = item.updateTime ? dayjs(item.updateTime) : null;
				return (
					<div>
						<div>{createTime ? createTime.format("MM-DD HH:mm") : "-"}</div>
						<div className="cell-meta">{updateTime ? `改于 ${updateTime.format("MM-DD HH:mm")}` : ""}</div>
					</div>
				);
			}
		},
		{
			title: "操作",
			key: "action",
			width: 180,
			render: (_, item) => (
				<div className="operation-btn">
					<Tooltip title="回复">
						<Button type="primary" icon={<MessageOutlined />} onClick={() => void openReplyModal(item.commentId)} />
					</Tooltip>
					<Tooltip title="编辑">
						<Button type="primary" icon={<EditOutlined />} onClick={() => void openEditModal(item.commentId)} />
					</Tooltip>
					<Tooltip title="删除">
						<Button danger type="primary" icon={<DeleteOutlined />} onClick={() => handleDelete(item.commentId)} />
					</Tooltip>
				</div>
			)
		}
	];

	return (
		<div className="comment-page">
			<ContentWrap>
				<Search handleSearchChange={handleSearchChange} handleSearch={handleSearch} handleCreate={openCreateModal} />
				<ContentInterWrap className="comment-page__table">
					<Table columns={columns} dataSource={tableData} pagination={paginationInfo} rowKey="commentId" />
				</ContentInterWrap>
			</ContentWrap>
			<Modal title={modalTitle} visible={isModalOpen} confirmLoading={submitting} onCancel={closeModal} onOk={handleSubmit}>
				{modalContext}
				<Form form={formRef} labelCol={{ span: 5 }} wrapperCol={{ span: 18 }} autoComplete="off" initialValues={form}>
					<Form.Item label="文章ID" name="articleId" rules={[{ required: true, message: "请输入文章ID" }]}>
						<InputNumber
							min={1}
							controls={false}
							style={{ width: "100%" }}
							disabled={modalMode !== "create"}
							onChange={value => setForm(prev => ({ ...prev, articleId: value ? Number(value) : undefined }))}
						/>
					</Form.Item>
					{modalMode !== "create" ? (
						<Form.Item label="父评论ID" name="parentCommentId">
							<InputNumber controls={false} style={{ width: "100%" }} disabled />
						</Form.Item>
					) : null}
					{modalMode === "reply" ? (
						<Form.Item label="顶级评论ID" name="topCommentId">
							<InputNumber controls={false} style={{ width: "100%" }} disabled />
						</Form.Item>
					) : null}
					<Form.Item
						label="评论内容"
						name="commentContent"
						rules={[
							{ required: true, message: "请输入评论内容" },
							{ max: 512, message: "评论内容不能超过 512 个字符" }
						]}
					>
						<Input.TextArea
							rows={6}
							showCount
							maxLength={512}
							placeholder={modalMode === "reply" ? "请输入回复内容" : "请输入评论内容"}
							onChange={e => setForm(prev => ({ ...prev, commentContent: e.target.value }))}
						/>
					</Form.Item>
				</Form>
			</Modal>
		</div>
	);
};

export default Comment;
