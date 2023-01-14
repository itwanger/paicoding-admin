import { FC, useCallback, useEffect, useState } from "react";
import { connect } from "react-redux";
import { CheckCircleOutlined, DeleteOutlined, EditOutlined, EyeOutlined } from "@ant-design/icons";
import { Button, DatePicker, Descriptions, Drawer, Form, Input, message, Modal, Select, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";

import { delColumnApi, getColumnListApi, updateColumnApi } from "@/api/modules/column";
import { ContentInterWrap, ContentWrap } from "@/components/common-wrap";
import { initPagination, IPagination, UpdateEnum } from "@/enums/common";
import { MapItem } from "@/typings/common";
import Search from "./components/search";

import "./index.scss";

const { RangePicker } = DatePicker;

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
	type: number; // 类型
	nums: number; // 连载数量
	freeEndTime: number; // 限时免费开始时间
	freeStartTime: number; // 限时免费结束时间
	state: number; // 状态
	section: number; // 排序
}

const defaultInitForm: IFormType = {
	columnId: -1,
	column: "",
	author: -1,
	introduction: "",
	cover: "",
	type: -1,
	nums: -1,
	freeEndTime: -1,
	freeStartTime: -1,
	state: -1,
	section: -1
};

const Column: FC<IProps> = props => {
	const [formRef] = Form.useForm();
	// form值
	const [form, setForm] = useState<IFormType>(defaultInitForm);
	// 弹窗
	const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
	// 弹窗
	const [isOpenDrawerShow, setIsOpenDrawerShow] = useState<boolean>(false);
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
	const { ColumnStatus, ColumnStatusList, ColumnType, ColumnTypeList } = props || {};

	const { columnId, column, introduction, cover, authorName, state, section, type, nums, freeEndTime, freeStartTime } = form;

	// 值改变
	const handleChange = (item: MapItem) => {
		setForm({ ...form, ...item });
	};

	// 数据请求
	useEffect(() => {
		const getSortList = async () => {
			// @ts-ignore
			const { status, result } = await getColumnListApi({ pageNumber: current, pageSize });
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
			title: "类型",
			dataIndex: "type",
			key: "type",
			render(type) {
				return ColumnType[type];
			}
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
				const { columnId, state } = item;

				return (
					<div className="operation-btn">
						<Button
							type="primary"
							icon={<EyeOutlined />}
							style={{ marginRight: "10px" }}
							onClick={() => {
								setIsOpenDrawerShow(true);
								setStatus(UpdateEnum.Edit);
								handleChange({ ...item });
								// formRef.setFieldsValue({ ...item, type: String(type), status: String(status) });
							}}
						>
							详情
						</Button>
						<Button
							type="primary"
							icon={<EditOutlined />}
							style={{ marginRight: "10px" }}
							onClick={() => {
								setIsModalOpen(true);
								setStatus(UpdateEnum.Edit);
								handleChange({ ...item });
								formRef.setFieldsValue({ ...item, state: String(state) });
							}}
						>
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
			const { freeStartTime, freeEndTime } = form;
			const newValues = {
				...values,
				columnId: status === UpdateEnum.Save ? UpdateEnum.Save : columnId,
				freeStartTime,
				freeEndTime
			};
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
			<Form.Item label="连载数量" name="nums" rules={[{ required: true, message: "请选择连载数量!" }]}>
				<Input
					type="number"
					allowClear
					onChange={e => {
						handleChange({ nums: e.target.value });
					}}
				/>
			</Form.Item>
			<Form.Item label="类型" name="type" rules={[{ required: true, message: "请选择类型!" }]}>
				<Select
					allowClear
					onChange={value => {
						handleChange({ type: value });
					}}
					options={ColumnTypeList}
				/>
			</Form.Item>
			<Form.Item label="开始时间" name="freeStartTime" rules={[{ required: false, message: "请选择连载数量!" }]}>
				<DatePicker
					onChange={e => {
						const freeStartTime = new Date(e).getTime();
						handleChange({ freeStartTime: freeStartTime });
					}}
				/>
			</Form.Item>
			<Form.Item label="结束时间" name="freeEndTime" rules={[{ required: false, message: "请选择结束时间!" }]}>
				<DatePicker
					onChange={e => {
						const freeEndTime = new Date(e).getTime();
						handleChange({ freeEndTime });
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

	const detailInfo = [
		{ label: "教程名", title: column },
		{ label: "简介", title: introduction },
		{ label: "封面URL", title: cover },
		{ label: "作者", title: authorName },
		{ label: "连载数量", title: nums },
		{ label: "类型", title: ColumnType[type] },
		{ label: "开始时间", title: freeStartTime },
		{ label: "结束时间", title: freeEndTime },
		{ label: "状态", title: ColumnStatus[state] },
		{ label: "排序", title: section }
	];

	return (
		<div className="Column">
			<ContentWrap>
				{/* 搜索 */}
				<Search handleChange={handleChange} {...{ setStatus, setIsModalOpen }} />
				{/* 表格 */}
				<ContentInterWrap>
					<Table columns={columns} dataSource={tableData} pagination={paginationInfo} rowKey="columnId" />
				</ContentInterWrap>
			</ContentWrap>
			{/* 抽屉 */}
			<Drawer title="详情" placement="right" onClose={() => setIsOpenDrawerShow(false)} visible={isOpenDrawerShow}>
				<Descriptions column={1} labelStyle={{ width: "100px" }}>
					{detailInfo.map(({ label, title }) => (
						<Descriptions.Item label={label} key={label}>
							{title !== 0 ? title || "-" : 0}
						</Descriptions.Item>
					))}
				</Descriptions>
			</Drawer>
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
