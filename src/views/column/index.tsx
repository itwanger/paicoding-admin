import { FC, useCallback, useEffect, useState } from "react";
import { connect } from "react-redux";
import { CheckCircleOutlined, DeleteOutlined, EditOutlined, EyeOutlined } from "@ant-design/icons";
import { Button, Form, Input, message, Modal, Select, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";

import { delColumnApi, getColumnListApi, updateColumnApi } from "@/api/modules/column";
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
	columnId: number; // 为0时，是保存，非0是更新
	column: string; // 教程名
	author: number; // 作者ID
	introduction: string; // 简介
	cover: string; // 封面 URL
	state: number; // 状态
	section: number; // 排序
}

const defaultInitForm: IFormType = {
	columnId: -1,
	column: "",
	author: -1,
	introduction: "",
	cover: "",
	state: -1,
	section: -1
};

const Column: FC<IProps> = props => {
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
	const { ColumnStatus, ColumnStatusList } = props || {};

	const { columnId } = form;

	// 值改变
	const handleChange = (item: MapItem) => {
		setForm({ ...form, ...item });
	};

	// 数据请求
	useEffect(() => {
		const getSortList = async () => {
			// @ts-ignore
			const { status, result } = await getColumnListApi();
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
	const handleDel = (columnId: number) => {
		Modal.warning({
			title: "确认删除此教程吗",
			content: "删除此教程后无法恢复，请谨慎操作！",
			maskClosable: true,
			closable: true,
			onOk: async () => {
				// @ts-ignore
				const { status } = await delColumnApi(columnId);
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
			title: "教程ID",
			dataIndex: "columnId",
			key: "columnId"
		},
		{
			title: "教程名",
			dataIndex: "column",
			key: "column"
		},
		{
			title: "作者",
			dataIndex: "authorName",
			key: "authorName"
		},
		{
			title: "状态",
			dataIndex: "state",
			key: "state",
			render(state) {
				return ColumnStatus[state];
			}
		},
		{
			title: "排序",
			dataIndex: "section",
			key: "section"
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
			const { status: successStatus } = (await updateColumnApi(newValues)) || {};
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
			<Form.Item label="教程名" name="column" rules={[{ required: true, message: "请输入教程名!" }]}>
				<Input
					allowClear
					onChange={e => {
						handleChange({ column: e.target.value });
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
			<Form.Item label="封面URL" name="cover" rules={[{ required: true, message: "请输入跳转URL!" }]}>
				<Input
					allowClear
					onChange={e => {
						handleChange({ cover: e.target.value });
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
			<Form.Item label="状态" name="state" rules={[{ required: true, message: "请选择状态!" }]}>
				<Select
					allowClear
					onChange={value => {
						handleChange({ state: value });
					}}
					options={ColumnStatusList}
				/>
			</Form.Item>
			<Form.Item label="排序" name="section" rules={[{ required: true, message: "请输入排序" }]}>
				<Input
					type="number"
					allowClear
					onChange={e => {
						handleChange({ section: e.target.value });
					}}
				/>
			</Form.Item>
		</Form>
	);

	return (
		<div className="Column">
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
export default connect(mapStateToProps, mapDispatchToProps)(Column);
