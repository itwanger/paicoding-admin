import { FC, useCallback, useEffect, useState } from "react";
import { connect } from "react-redux";
import { CheckCircleOutlined, CloseCircleOutlined, DeleteOutlined, RedoOutlined } from "@ant-design/icons";
import { Button, Form, Input, message, Modal, Select, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";

import { delCategoryApi, getCategoryListApi, operateCategoryApi, updateCategoryApi } from "@/api/modules/category";
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

interface IFormType {
	categoryId: number; // 为0时，是保存，非0是更新
	category: string; // 分类名
	rank: number; // 排名
}

const defaultInitForm: IFormType = {
	categoryId: -1,
	category: "",
	rank: -1
};

const Category: FC<IProps> = props => {
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
	const { PushStatus } = props || {};

	const { categoryId } = form;

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
						<Button
							type="primary"
							icon={<RedoOutlined />}
							style={{ marginRight: "10px" }}
							onClick={() => {
								setIsModalOpen(true);
								setStatus(UpdateEnum.Edit);
								handleChange({ categoryId: categoryId });
								formRef.setFieldsValue({ ...item });
							}}
						>
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

	const handleSubmit = async () => {
		try {
			const values = await formRef.validateFields();
			const newValues = { ...values, categoryId: status === UpdateEnum.Save ? UpdateEnum.Save : categoryId };
			// @ts-ignore
			const { status: successStatus } = (await updateCategoryApi(newValues)) || {};
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
			<Form.Item label="分类" name="category" rules={[{ required: true, message: "请输入分类!" }]}>
				<Input
					allowClear
					onChange={e => {
						handleChange({ category: e.target.value });
					}}
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
		<div className="category">
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
export default connect(mapStateToProps, mapDispatchToProps)(Category);
