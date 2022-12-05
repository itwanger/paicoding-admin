import { FC, useCallback, useEffect, useState } from "react";
import { connect } from "react-redux";
import { CheckCircleOutlined, CloseCircleOutlined, DeleteOutlined, RedoOutlined } from "@ant-design/icons";
import { Button, Form, Input, message, Modal, Select, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import TextArea from "antd/lib/input/TextArea";

import { delConfigApi, getConfigListApi, updateConfigApi } from "@/api/modules/config";
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
	configId: number; // 为0时，是保存，非0是更新
	type: number; // ConfigType
	name: string; // 图片 url
	// bannerUrl: string; // 图片链接
	jumpUrl: string; // 跳转链接
	content: string; // 内容
	rank: number; // 排序
	tags: number; // 标签
}

const defaultInitForm: IFormType = {
	configId: -1,
	type: -1,
	name: "",
	jumpUrl: "",
	content: "",
	rank: -1,
	tags: -1
};

const Banner: FC<IProps> = props => {
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

	const { ConfigType, ConfigTypeList, PushStatus, ArticleTag, ArticleTagList } = props || {};

	const { configId, type, name, jumpUrl, content, rank, tags } = form;

	// 值改变
	const handleChange = (item: MapItem) => {
		setForm({ ...form, ...item });
	};

	// 数据请求
	useEffect(() => {
		const getConfigList = async () => {
			// @ts-ignore
			const { status, result } = await getConfigListApi();
			const { code } = status || {};
			const { list } = result || {};
			if (code === 0) {
				const newList = list.map((item: MapItem) => ({ ...item, key: item?.categoryId }));
				setTableData(newList);
			}
		};
		getConfigList();
	}, [query]);

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
			title: "内容",
			dataIndex: "content",
			key: "content"
		},
		{
			title: "跳转URL",
			dataIndex: "jumpUrl",
			key: "jumpUrl"
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
				const noUp = status === 0;
				return (
					<div className="operation-btn">
						<Button
							type="primary"
							icon={<RedoOutlined />}
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

			<Form.Item label="标签" name="tags" rules={[{ required: true, message: "请选择标签!" }]}>
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

	return (
		<div className="banner">
			<ContentWrap>
				{/* 搜索 */}
				<Search handleChange={handleChange} {...{ setStatus, setIsModalOpen }} />
				{/* 表格 */}
				<ContentInterWrap>
					<Table columns={columns} dataSource={tableData} />
				</ContentInterWrap>
			</ContentWrap>
			{/* 弹窗 */}
			<Modal title="添加" visible={isModalOpen} onCancel={() => setIsModalOpen(false)} onOk={handleSubmit}>
				{reviseModalContent}
			</Modal>
		</div>
	);
};

const mapStateToProps = (state: any) => state.disc.disc;
const mapDispatchToProps = {};
export default connect(mapStateToProps, mapDispatchToProps)(Banner);
