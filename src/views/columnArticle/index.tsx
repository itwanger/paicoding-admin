import { FC, useCallback, useEffect, useState } from "react";
import { connect } from "react-redux";
import { CheckCircleOutlined, DeleteOutlined, EditOutlined, EyeOutlined } from "@ant-design/icons";
import { Button, Form, Input, message, Modal, Select, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";

import { delColumnArticleApi, getColumnArticleListApi, updateColumnArticleApi } from "@/api/modules/column";
import { ContentInterWrap, ContentWrap } from "@/components/common-wrap";
import { UpdateEnum } from "@/enums/common";
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

export interface IFormType {
	id: number; // 文章ID
	title: string; // 文章标题
	columnId: number; // 专栏ID
	column: string; // 专栏名
	sort: number; // 排序
}

const defaultInitForm: IFormType = {
	id: -1,
	title: "",
	columnId: -1,
	column: "",
	sort: -1
};

const ColumnArticle: FC<IProps> = props => {
	const [formRef] = Form.useForm();
	// form值
	const [form, setForm] = useState<IFormType>(defaultInitForm);
	// 弹窗
	const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
	// 列表数据
	const [tableData, setTableData] = useState<DataType[]>([]);
	// 刷新函数
	const [query, setQuery] = useState<number>(0);

	//当前的状态
	const [status, setStatus] = useState<UpdateEnum>(UpdateEnum.Save);

	const onSure = useCallback(() => {
		setQuery(prev => prev + 1);
	}, []);

	// 获取字典值
	console.log({ props });

	// @ts-ignore
	const { ConfigType, ConfigTypeList, ColumnStatus, ColumnStatusList, ArticleTag, ArticleTagList } = props || {};

	const { columnId } = form;

	// 值改变
	const handleChange = (item: MapItem) => {
		setForm({ ...form, ...item });
	};

	// 数据请求
	useEffect(() => {
		const getSortList = async () => {
			// @ts-ignore
			const { status, result } = await getColumnArticleListApi(-1); // TODO: 需要传教程ID
			const { code } = status || {};
			const { list } = result || {};
			if (code === 0) {
				const newList = list.map((item: MapItem) => ({ ...item, key: item?.categoryId }));
				setTableData(newList);
			}
		};
		getSortList();
	}, [query]);

	// 删除
	const handleDel = (categoryId: number) => {
		Modal.warning({
			title: "确认删除此教程文章吗",
			content: "删除此教程文章后无法恢复，请谨慎操作！",
			maskClosable: true,
			closable: true,
			onOk: async () => {
				// @ts-ignore
				const { status } = await delColumnArticleApi(categoryId);
				const { code } = status || {};
				console.log();
				if (code === 0) {
					message.success("删除成功");
					onSure();
				}
			}
		});
	};

	// 表头设置
	const columns: ColumnsType<DataType> = [
		{
			title: "文章ID",
			dataIndex: "id",
			key: "id"
		},
		{
			title: "文章标题",
			dataIndex: "title",
			key: "title"
		},
		{
			title: "专栏名",
			dataIndex: "column",
			key: "column"
		},
		{
			title: "排序",
			dataIndex: "sort",
			key: "sort"
		},
		{
			title: "操作",
			key: "key",
			width: 400,
			render: (_, item) => {
				// @ts-ignore
				const { columnId } = item;
				return (
					<div className="operation-btn">
						<Button type="primary" icon={<EyeOutlined />} style={{ marginRight: "10px" }} onClick={() => setIsModalOpen(true)}>
							详情
						</Button>
						<Button type="primary" icon={<EditOutlined />} style={{ marginRight: "10px" }} onClick={() => setIsModalOpen(true)}>
							编辑
						</Button>
						<Button type="primary" danger icon={<DeleteOutlined />} onClick={() => handleDel(columnId)}>
							删除
						</Button>
					</div>
				);
			}
		}
	];

	const handleSubmit = async () => {
		try {
			const values = await formRef.validateFields();
			const newValues = { ...values, columnId: status === UpdateEnum.Save ? UpdateEnum.Save : columnId };
			// @ts-ignore
			const { status: successStatus } = (await updateColumnArticleApi(newValues)) || {};
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
			<Form.Item label="专栏名" name="column" rules={[{ required: true, message: "请输入专栏名!" }]}>
				<Input
					allowClear
					onChange={e => {
						handleChange({ column: e.target.value });
					}}
				/>
			</Form.Item>
			<Form.Item label="作者ID" name="author" rules={[{ required: true, message: "请输入作者ID!" }]}>
				<Input
					type="number"
					allowClear
					onChange={e => {
						handleChange({ author: e.target.value });
					}}
				/>
			</Form.Item>
			<Form.Item label="封面URL" name="cover" rules={[{ required: true, message: "请输入跳转URL!" }]}>
				<Input
					allowClear
					onChange={e => {
						handleChange({ cover: e.target.value });
					}}
				/>
			</Form.Item>
			<Form.Item label="简介" name="introduction" rules={[{ required: true, message: "请输入简介!" }]}>
				<Input
					allowClear
					onChange={e => {
						handleChange({ introduction: e.target.value });
					}}
				/>
			</Form.Item>
			<Form.Item label="状态" name="state" rules={[{ required: true, message: "请选择状态!" }]}>
				<Select
					allowClear
					onChange={value => {
						handleChange({ state: value });
					}}
					options={ColumnStatusList}
				/>
			</Form.Item>
		</Form>
	);

	return (
		<div className="ColumnArticle">
			<ContentWrap>
				{/* 搜索 */}
				<Search handleChange={handleChange} {...{ setStatus, setIsModalOpen }} />
				{/* 表格 */}
				<ContentInterWrap>
					<Table columns={columns} dataSource={tableData} />
				</ContentInterWrap>
			</ContentWrap>
			{/* 弹窗 */}
			<Modal title="添加/修改" visible={isModalOpen} onCancel={() => setIsModalOpen(false)} onOk={handleSubmit}>
				{reviseModalContent}
			</Modal>
		</div>
	);
};

const mapStateToProps = (state: any) => state.disc.disc;
const mapDispatchToProps = {};
export default connect(mapStateToProps, mapDispatchToProps)(ColumnArticle);
