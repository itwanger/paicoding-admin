import { FC, useCallback, useEffect, useState } from "react";
import { connect } from "react-redux";
import { CheckCircleOutlined, CloseCircleOutlined, DeleteOutlined, RedoOutlined } from "@ant-design/icons";
import { Button, Form, Input, message, Modal, Select, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";

import { delCategoryApi, getCategoryListApi, operateCategoryApi } from "@/api/modules/category";
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

const Category: FC<IProps> = props => {
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

	// 获取字典值
	console.log({ props });

	// @ts-ignore
	const { PushStatus } = props || {};

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
			const { status, result } = await getCategoryListApi();
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
			title: "确认删除此分类吗",
			content: "删除此分类后无法恢复，请谨慎操作！",
			maskClosable: true,
			closable: true,
			onOk: async () => {
				// @ts-ignore
				const { status } = await delCategoryApi(categoryId);
				const { code } = status || {};
				console.log();
				if (code === 0) {
					message.success("删除成功");
					onSure();
				}
			}
		});
	};

	// 上线/下线
	const handleOperate = (categoryId: number, pushStatus: number) => {
		const operateDesc = pushStatus === 0 ? "下线" : "上线";
		Modal.warning({
			title: "确认" + operateDesc + "此配置吗",
			content: "对线上会有影响，请谨慎操作！",
			maskClosable: true,
			closable: true,
			onOk: async () => {
				// @ts-ignore
				const { status } = await operateCategoryApi({ categoryId, pushStatus });
				const { code } = status || {};
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
			dataIndex: "categoryId",
			key: "categoryId"
		},
		{
			title: "分类",
			dataIndex: "category",
			key: "category"
		},
		{
			title: "排序",
			dataIndex: "rank",
			key: "rank"
		},
		{
			title: "状态",
			dataIndex: "status",
			key: "status",
			render(status) {
				return PushStatus[status];
			}
		},
		{
			title: "状态",
			dataIndex: "status",
			key: "status",
			render(status) {
				return PushStatus[status];
			}
		},
		{
			title: "操作",
			key: "key",
			width: 400,
			render: (_, item) => {
				// @ts-ignore
				const { categoryId, status } = item;
				const noUp = status === 0;
				const pushStatus = status === 0 ? 1 : 0;
				return (
					<div className="operation-btn">
						<Button type="primary" icon={<RedoOutlined />} style={{ marginRight: "10px" }} onClick={() => setIsModalOpen(true)}>
							编辑
						</Button>
						<Button
							type={noUp ? "primary" : "default"}
							icon={noUp ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
							style={{ marginRight: "10px" }}
							onClick={() => handleOperate(categoryId, pushStatus)}
						>
							{noUp ? "上线" : "下线"}
						</Button>
						<Button type="primary" danger icon={<DeleteOutlined />} onClick={() => handleDel(categoryId)}>
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
		<div className="category">
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

const mapStateToProps = (state: any) => state.disc.disc;
const mapDispatchToProps = {};
export default connect(mapStateToProps, mapDispatchToProps)(Category);
