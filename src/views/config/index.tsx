import { FC, useCallback, useEffect, useState } from "react";
import { connect } from "react-redux";
import { useLinkClickHandler } from "react-router-dom";
import { CheckCircleOutlined, CloseCircleOutlined, DeleteOutlined, EditOutlined, EyeOutlined } from "@ant-design/icons";
import { Button, Descriptions, Drawer, Form, Input, message, Modal, Select, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import TextArea from "antd/lib/input/TextArea";

import { delConfigApi, getConfigListApi, operateConfigApi, updateConfigApi } from "@/api/modules/config";
import { ContentInterWrap, ContentWrap } from "@/components/common-wrap";
import { initPagination, IPagination, UpdateEnum } from "@/enums/common";
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
	configId: number; // ID
	type: number; // 类型
	name: string; // 图片
	rank: number; // 排序
	tags: number; // 标签
}

const defaultInitForm: IFormType = {
	configId: -1,
	type: -1,
	name: "",
	rank: -1,
	tags: -1
};

const Banner: FC<IProps> = props => {
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
	const { ConfigType, ConfigTypeList, PushStatus, ArticleTag, ArticleTagList } = props || {};

	const { configId, type, name, content, jumpUrl, rank, tags } = form;

	// 值改变
	const handleChange = (item: MapItem) => {
		setForm({ ...form, ...item });
	};

	// 数据请求
	useEffect(() => {
		const getConfigList = async () => {
			// @ts-ignore
			const { status, result } = await getConfigListApi({ pageNumber: current, pageSize });
			const { code } = status || {};
			const { list, pageNum, pageSize: resPageSize, pageTotal, total } = result || {};
			setPagination({ current: pageNum, pageSize: resPageSize, total });
			if (code === 0) {
				const newList = list.map((item: MapItem) => ({ ...item, key: item?.categoryId }));
				setTableData(newList);
			}
		};
		getConfigList();
	}, [query, current, pageSize]);

	// 删除
	const handleDel = (configId: number) => {
		Modal.warning({
			title: "确认删除此配置吗",
			content: "删除此配置后无法恢复，请谨慎操作！",
			maskClosable: true,
			closable: true,
			onOk: async () => {
				// @ts-ignore
				const { status } = await delConfigApi(configId);
				const { code } = status || {};
				if (code === 0) {
					message.success("删除成功");
					onSure();
				}
			}
		});
	};

	// 上线/下线
	const handleOperate = (configId: number, pushStatus: number) => {
		const operateDesc = pushStatus === 0 ? "下线" : "上线";
		Modal.warning({
			title: "确认" + operateDesc + "此配置吗",
			content: "对线上会有影响，请谨慎操作！",
			maskClosable: true,
			closable: true,
			onOk: async () => {
				// @ts-ignore
				const { status } = await operateConfigApi({ configId, pushStatus });
				const { code } = status || {};
				if (code === 0) {
					message.success("操作成功");
					onSure();
				}
			}
		});
	};

	// 重置表单
	const resetForm = () => {
		setForm(defaultInitForm);
		formRef.resetFields();
	};

	// 表头设置
	const columns: ColumnsType<DataType> = [
		{
			title: "ID",
			dataIndex: "id",
			key: "id"
		},
		{
			title: "类型",
			dataIndex: "type",
			key: "type",
			render(type) {
				return ConfigType[type];
			}
		},
		{
			title: "名称",
			dataIndex: "name",
			key: "name"
		},
		{
			title: "标签",
			dataIndex: "tags",
			key: "tags",
			render(tag) {
				return ArticleTag[tag];
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
			title: "排序",
			dataIndex: "rank",
			key: "rank"
		},
		{
			title: "操作",
			key: "key",
			width: 400,
			render: (_, item) => {
				// @ts-ignore
				const { id, type, rank, status } = item;
				console.log({ item });

				const noUp = status === 0;
				const pushStatus = status === 0 ? 1 : 0;
				return (
					<div className="operation-btn">
						<Button
							type="primary"
							icon={<EyeOutlined />}
							style={{ marginRight: "10px" }}
							onClick={() => {
								setIsOpenDrawerShow(true);
								setStatus(UpdateEnum.Edit);
								handleChange({ configId: id, ...item });
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
								handleChange({ configId: id });
								formRef.setFieldsValue({ ...item, type: String(type), status: String(status) });
							}}
						>
							编辑
						</Button>
						<Button
							type={noUp ? "primary" : "default"}
							icon={noUp ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
							style={{ marginRight: "10px" }}
							onClick={() => handleOperate(id, pushStatus)}
						>
							{noUp ? "上线" : "下线"}
						</Button>
						<Button type="primary" danger icon={<DeleteOutlined />} onClick={() => handleDel(id)}>
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
			const newValues = { ...values, configId: status === UpdateEnum.Save ? UpdateEnum.Save : configId };
			// @ts-ignore
			const { status: successStatus } = (await updateConfigApi(newValues)) || {};
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
			<Form.Item label="类型" name="type" rules={[{ required: true, message: "请选择类型!" }]}>
				<Select
					allowClear
					onChange={value => {
						handleChange({ type: value });
					}}
					options={ConfigTypeList}
				/>
			</Form.Item>
			<Form.Item label="名称" name="name" rules={[{ required: true, message: "请输入名称!" }]}>
				<Input
					allowClear
					onChange={e => {
						handleChange({ name: e.target.value });
					}}
				/>
			</Form.Item>
			<Form.Item label="内容" name="content" rules={[{ required: true, message: "请输入内容!" }]}>
				<Input.TextArea
					allowClear
					onChange={e => {
						handleChange({ content: e.target.value });
					}}
				/>
			</Form.Item>
			<Form.Item label="跳转URL" name="jumpUrl" rules={[{ required: true, message: "请输入跳转URL!" }]}>
				<Input
					allowClear
					onChange={e => {
						handleChange({ jumpUrl: e.target.value });
					}}
				/>
			</Form.Item>

			<Form.Item label="标签" name="tags" rules={[{ required: false, message: "请选择标签!" }]}>
				<Select
					allowClear
					onChange={value => {
						handleChange({ tags: value });
					}}
					options={ArticleTagList}
				/>
			</Form.Item>
			<Form.Item label="排序" name="rank" rules={[{ required: true, message: "请输入排序!" }]}>
				<Input
					type="number"
					allowClear
					onChange={e => {
						handleChange({ rank: e.target.value });
					}}
				/>
			</Form.Item>
		</Form>
	);

	const detailInfo = [
		{ label: "类型", title: ConfigType[type] },
		{ label: "名称", title: name },
		{ label: "内容", title: content },
		{ label: "跳转URL", title: jumpUrl },
		{ label: "标签", title: ArticleTag[tags] },
		{ label: "排序", title: rank }
	];

	return (
		<div className="banner">
			<ContentWrap>
				{/* 搜索 */}
				<Search handleChange={handleChange} {...{ setStatus, setIsModalOpen, resetForm }} />
				{/* 表格 */}
				<ContentInterWrap>
					<Table columns={columns} dataSource={tableData} pagination={paginationInfo} />
				</ContentInterWrap>
			</ContentWrap>
			{/* 抽屉 */}
			<Drawer title="详情" placement="right" onClose={() => setIsOpenDrawerShow(false)} visible={isOpenDrawerShow}>
				<Descriptions column={1} labelStyle={{ width: "100px" }}>
					{detailInfo.map(({ label, title }) => (
						<Descriptions.Item label={label} key={label}>
							{title || "-"}
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
export default connect(mapStateToProps, mapDispatchToProps)(Banner);
