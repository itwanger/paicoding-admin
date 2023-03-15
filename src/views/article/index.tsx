import { FC, useCallback, useEffect, useState } from "react";
import { connect } from "react-redux";
import { CheckCircleOutlined, CloseCircleOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { Button, Form, Input, message, Modal, Select, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";

import { delArticleApi, examineArticleApi, getArticleListApi, operateArticleApi, updateArticleApi } from "@/api/modules/article";
import { updateTagApi } from "@/api/modules/tag";
import { ContentInterWrap, ContentWrap } from "@/components/common-wrap";
import { initPagination, IPagination, PushStatusEnum, pushStatusInfo, UpdateEnum } from "@/enums/common";
import { MapItem } from "@/typings/common";
import Search from "./components/search";

import "./index.scss";

interface DataType {
	key: string;
	name: string;
	age: number;
	address: string;
	tags: string[];
}

interface IProps {}

interface IInitForm {
	articleId: number;
	title: string;
	shortTitle: string;
	status: number;
}

const defaultInitForm = {
	articleId: -1,
	title: "",
	shortTitle: "",
	status: -1
};

const Article: FC<IProps> = props => {
	const [formRef] = Form.useForm();
	// 搜索
	const [form, setForm] = useState<IInitForm>(defaultInitForm);
	// 弹窗
	const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
	// 列表数据
	const [tableData, setTableData] = useState<DataType[]>([]);
	// 刷新函数
	const [query, setQuery] = useState<number>(0);

	//当前的状态
	const [status, setStatus] = useState<UpdateEnum>(UpdateEnum.Save);

	// 分页
	const [pagination, setPagination] = useState<IPagination>(initPagination);
	const { current, pageSize } = pagination;

	const paginationInfo = {
		showSizeChanger: true,
		showTotal: total => `共 ${total || 0} 条`,
		...pagination,
		onChange: (current, pageSize) => {
			setPagination({ current, pageSize });
		}
	};

	const onSure = useCallback(() => {
		setQuery(prev => prev + 1);
	}, []);

	// @ts-ignore
	const { PushStatus, PushStatusList, ToppingStatus } = props || {};

	// 重置表单
	const resetBarFrom = () => {
		setForm(defaultInitForm);
	};

	const { articleId } = form;

	// 值改变
	const handleChange = (item: MapItem) => {
		setForm({ ...form, ...item });
	};

	// 数据请求
	useEffect(() => {
		const getSortList = async () => {
			// @ts-ignore
			const { status, result } = await getArticleListApi({ pageNumber: current, pageSize });
			const { code } = status || {};
			const { list, pageNum, pageSize: resPageSize, pageTotal, total } = result || {};
			setPagination({ current: pageNum, pageSize: resPageSize, total });
			if (code === 0) {
				const newList = list.map((item: MapItem) => ({ ...item, key: item?.categoryId }));
				setTableData(newList);
			}
		};
		getSortList();
	}, [query, current, pageSize]);

	// 删除
	const handleDel = (articleId: number) => {
		Modal.warning({
			title: "确认删除此文章吗",
			content: "删除此文章后无法恢复，请谨慎操作！",
			maskClosable: true,
			closable: true,
			onOk: async () => {
				// @ts-ignore
				const { status } = await delArticleApi(articleId);
				const { code } = status || {};
				console.log();
				if (code === 0) {
					message.success("删除成功");
					setPagination({ current: 1, pageSize });
					onSure();
				}
			}
		});
	};

	// 上线/下线
	const handleOperate = (articleId: number, operateType: number) => {
		const operateDesc = operateType === 4 ? "取消" : "推荐";
		Modal.warning({
			title: "确认" + operateDesc + "此配置吗",
			content: "对线上会有影响，请谨慎操作！",
			maskClosable: true,
			closable: true,
			onOk: async () => {
				// @ts-ignore
				const { status } = await operateArticleApi({ articleId, operateType });
				const { code } = status || {};
				console.log();
				if (code === 0) {
					message.success("操作成功");
					onSure();
				}
			}
		});
	};

	// 上线/下线
	const handleExamine = (articleId: number, status: number) => {
		const operateDesc = status === 1 ? "通过" : "不通过";
		Modal.warning({
			title: "确认" + operateDesc + "改文章吗",
			content: "对线上会有影响，请谨慎操作！",
			maskClosable: true,
			closable: true,
			onOk: async () => {
				// @ts-ignore
				const { statusRes } = await examineArticleApi({ articleId, status });
				const { code } = statusRes || {};
				console.log();
				if (code === 0) {
					message.success("操作成功");
					onSure();
				}
			}
		});
	};

	// 表头设置
	const columns: ColumnsType<DataType> = [
		{
			title: "ID",
			dataIndex: "articleId",
			key: "articleId"
		},
		{
			title: "标题",
			dataIndex: "title",
			key: "title",
			render(value, item) {
				return (
					<a href={`https://paicoding.com/article/detail/${item?.articleId}`} target="_blank" rel="noreferrer">
						{value}
					</a>
				);
			}
		},
		{
			title: "短标题",
			dataIndex: "shortTitle",
			key: "shortTitle"
		},
		{
			title: "作者",
			dataIndex: "authorName",
			key: "authorName"
		},
		{
			title: "推荐",
			dataIndex: "toppingStat",
			key: "toppingStat",
			render(toppingStat) {
				return <Tag color={toppingStat == 1 ? "#f50" : "cyan"}>{ToppingStatus[toppingStat]}</Tag> || "-";
			}
		},
		{
			title: "状态",
			dataIndex: "status",
			key: "status",
			render(status) {
				return <Tag color={status == 2 ? "red" : "green"}>{PushStatus[status]}</Tag> || "-";
			}
		},
		{
			title: "操作",
			key: "key",
			width: 400,
			render: (_, item) => {
				// @ts-ignore
				const { articleId, toppingStat, status } = item;
				const noUp = toppingStat === 0;
				const topStatus = toppingStat === 0 ? 3 : 4; // 3-推荐；4-取消推荐
				return (
					<div className="operation-btn">
						<Button
							type="primary"
							icon={<EditOutlined />}
							style={{ marginRight: "10px" }}
							onClick={() => {
								setIsModalOpen(true);
								setStatus(UpdateEnum.Edit);

								handleChange({ articleId: articleId, status: String(status), ...item });

								formRef.setFieldsValue({
									...item,
									status: String(status)
								});
							}}
						>
							编辑
						</Button>
						<Button
							type={noUp ? "primary" : "default"}
							icon={noUp ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
							style={{ marginRight: "10px" }}
							onClick={() => handleOperate(articleId, topStatus)}
						>
							{noUp ? "推荐" : "取消"}
						</Button>
						<Button type="primary" danger icon={<DeleteOutlined />} onClick={() => handleDel(articleId)}>
							删除
						</Button>
					</div>
				);
			}
		}
	];

	// 数据提交
	const handleOk = () => {
		console.log("提交");
	};

	const handleSubmit = async () => {
		try {
			const values = await formRef.validateFields();
			const newValues = { ...values, articleId: status === UpdateEnum.Save ? UpdateEnum.Save : articleId };
			// @ts-ignore
			const { status: successStatus } = (await updateArticleApi(newValues)) || {};
			const { code } = successStatus || {};
			if (code === 0) {
				setIsModalOpen(false);
				onSure();
			}
		} catch (errorInfo) {
			console.log("Failed:", errorInfo);
		}
	};

	// 编辑表单
	const reviseModalContent = (
		<Form name="basic" form={formRef} labelCol={{ span: 4 }} wrapperCol={{ span: 16 }} autoComplete="off">
			<Form.Item label="标题" name="title" rules={[{ required: false, message: "请输入标题!" }]}>
				<Input
					allowClear
					onChange={e => {
						handleChange({ tag: e.target.value });
					}}
				/>
			</Form.Item>
			<Form.Item label="短标题" name="shortTitle" rules={[{ required: false, message: "请输入短标题!" }]}>
				<Input
					allowClear
					onChange={e => {
						handleChange({ tag: e.target.value });
					}}
				/>
			</Form.Item>
			<Form.Item label="状态" name="status" rules={[{ required: true, message: "请选择状态!" }]}>
				<Select
					allowClear
					onChange={value => {
						handleChange({ status: value });
					}}
					options={PushStatusList}
				/>
			</Form.Item>
		</Form>
	);

	return (
		<div className="banner">
			<ContentWrap>
				{/* 搜索 */}
				{/*<Search handleChange={handleChange} />*/}
				{/* 表格 */}
				<ContentInterWrap>
					<Table columns={columns} dataSource={tableData} pagination={paginationInfo} />
				</ContentInterWrap>
			</ContentWrap>
			{/* 弹窗 */}
			<Modal title="修改" visible={isModalOpen} onCancel={() => setIsModalOpen(false)} onOk={handleSubmit}>
				{reviseModalContent}
			</Modal>
		</div>
	);
};

const mapStateToProps = (state: any) => state.disc.disc;
const mapDispatchToProps = {};
export default connect(mapStateToProps, mapDispatchToProps)(Article);
