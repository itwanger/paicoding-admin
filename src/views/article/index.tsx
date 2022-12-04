import { FC, useCallback, useEffect, useState } from "react";
import { CheckCircleOutlined, DeleteOutlined, RedoOutlined } from "@ant-design/icons";
import { Button, Form, Input, message, Modal, Select, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";

import { delArticleApi, getArticleListApi } from "@/api/modules/article";
import { ContentInterWrap, ContentWrap } from "@/components/common-wrap";
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
	id: string;
}

const defaultInitForm = {
	id: ""
};

const Article: FC<IProps> = props => {
	// 搜索
	const [form, setForm] = useState<IInitForm>(defaultInitForm);
	// 弹窗
	const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
	// 列表数据
	const [tableData, setTableData] = useState<DataType[]>([]);
	// 刷新函数
	const [query, setQuery] = useState<number>(0);

	const onSure = useCallback(() => {
		setQuery(prev => prev + 1);
	}, []);

	// 重置表单
	const resetBarFrom = () => {
		setForm(defaultInitForm);
	};

	// 值改变
	const handleChange = (item: MapItem) => {
		setForm({ ...form, ...item });
	};

	// 数据请求
	useEffect(() => {
		const getSortList = async () => {
			// @ts-ignore
			const { status, result } = await getArticleListApi();
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
			key: "title"
		},
		{
			title: "作者",
			dataIndex: "authorName",
			key: "authorName"
		},
		{
			title: "操作",
			key: "key",
			width: 400,
			render: (_, item) => {
				// @ts-ignore
				const { articleId } = item;
				return (
					<div className="operation-btn">
						<Button type="primary" icon={<CheckCircleOutlined />} style={{ marginRight: "10px" }}>
							推荐
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

	// 编辑表单
	const reviseModalContent = (
		<Form
			name="basic"
			labelCol={{ span: 4 }}
			wrapperCol={{ span: 16 }}
			initialValues={{ remember: true }}
			// onFinish={onFinish}
			// onFinishFailed={onFinishFailed}
			autoComplete="off"
		>
			<Form.Item label="ID" name="id" rules={[{ required: true, message: "Please input ID!" }]}>
				<Input />
			</Form.Item>

			<Form.Item wrapperCol={{ offset: 4, span: 16 }}>
				<Button type="primary" htmlType="submit">
					Submit
				</Button>
			</Form.Item>
		</Form>
	);

	return (
		<div className="banner">
			<ContentWrap>
				{/* 搜索 */}
				<Search handleChange={handleChange} />
				{/* 表格 */}
				<ContentInterWrap>
					<Table columns={columns} dataSource={tableData} />
				</ContentInterWrap>
			</ContentWrap>
			{/* 弹窗 */}
			<Modal title="Basic Modal" visible={isModalOpen} onOk={handleOk} onCancel={() => setIsModalOpen(false)}>
				{reviseModalContent}
			</Modal>
		</div>
	);
};

export default Article;
