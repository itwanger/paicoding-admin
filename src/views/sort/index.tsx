import React, { useEffect, useState } from "react";
import { CheckCircleOutlined, DeleteOutlined, RedoOutlined } from "@ant-design/icons";
import { Button, Form, Input, Modal, Select, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";

import { getSortListApi } from "@/api/modules/sort";

import "./index.scss";

interface DataType {
	key: string;
	name: string;
	age: number;
	address: string;
	tags: string[];
}

const data: DataType[] = [
	{
		key: "1",
		name: "John Brown",
		age: 32,
		address: "New York No. 1 Lake Park",
		tags: ["nice", "developer"]
	},
	{
		key: "2",
		name: "Jim Green",
		age: 42,
		address: "London No. 1 Lake Park",
		tags: ["loser"]
	},
	{
		key: "3",
		name: "Joe Black",
		age: 32,
		address: "Sidney No. 1 Lake Park",
		tags: ["cool", "teacher"]
	}
];
interface IProps {}

interface IInitForm {
	id: string;
}
const defaultInitForm = {
	id: ""
};
const Sort: FC<IProps> = props => {
	const [form, setForm] = useState<IInitForm>(defaultInitForm);
	const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
	const { id } = form;
	const resetBarFrom = () => {
		setForm(defaultInitForm);
	};
	const handleChange = item => {
		setForm({ ...form, ...item });
	};
	// 数据请求

	useEffect(() => {
		const getSortList = async () => {
			const res = await getSortListApi();
			console.log({ res });
		};
		console.log("132");

		getSortList();
	}, []);

	// 表头设置
	const columns: ColumnsType<DataType> = [
		{
			title: "ID",
			dataIndex: "name",
			key: "name",
			render: text => <a>{text}</a>
		},
		{
			title: "名称",
			dataIndex: "age",
			key: "age"
		},
		{
			title: "状态",
			dataIndex: "address",
			key: "address"
		},
		{
			title: "创建时间",
			key: "tags",
			dataIndex: "tags",
			render: (_, { tags }) => (
				<>
					{tags.map(tag => {
						let color = tag.length > 5 ? "geekblue" : "green";
						if (tag === "loser") {
							color = "volcano";
						}
						return (
							<Tag color={color} key={tag}>
								{tag.toUpperCase()}
							</Tag>
						);
					})}
				</>
			)
		},
		{
			title: "操作",
			key: "action",
			render: (_, record) => (
				<div className="operation-btn">
					<Button type="primary" icon={<RedoOutlined />} style={{ marginRight: "10px" }} onClick={() => setIsModalOpen(true)}>
						修改
					</Button>
					<Button type="primary" icon={<CheckCircleOutlined />} style={{ marginRight: "10px" }}>
						上线
					</Button>
					<Button type="primary" danger icon={<DeleteOutlined />}>
						删除
					</Button>
				</div>
			)
		}
	];

	// 数据提交
	const handleOk = () => {
		console.log("提交");
	};

	// 修改表单
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
		<div className="sort">
			<div className="common-search-menu">
				<Form layout="inline">
					<Form.Item label="文章标题">
						<Input value={id} onChange={e => handleChange({ id: e.target.value })} />
					</Form.Item>
					<Form.Item>
						<Button type="primary" className="common-search-btn">
							搜索
						</Button>
						<Button onClick={resetBarFrom}>重置</Button>
					</Form.Item>
				</Form>
			</div>
			<Table columns={columns} dataSource={data} />
			<Modal title="Basic Modal" visible={isModalOpen} onOk={handleOk} onCancel={() => setIsModalOpen(false)}>
				{reviseModalContent}
			</Modal>
		</div>
	);
};
export default Sort;
