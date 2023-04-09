import {FC, useCallback, useEffect, useState} from "react";
import {connect} from "react-redux";
import {DeleteOutlined} from "@ant-design/icons";
import {Button, Form, Input, message, Modal, Table} from "antd";
import type {ColumnsType} from "antd/es/table";

import {addAuthor, getWhiteListApi, removeAuthor} from "@/api/modules/authorArticleWhiteList";
import {ContentInterWrap, ContentWrap} from "@/components/common-wrap";
import {initPagination, IPagination, UpdateEnum} from "@/enums/common";
import {MapItem} from "@/typings/common";
import Search from "./components/search";

import "./index.scss";

interface DataType {
	key: string;
	name: string;
	age: number;
	address: string;
	tags: string[];
}

interface IProps {
}

export interface IFormType {
	tagId: number; // 为0时，是保存，非0是更新
	tag: string; // 标签名
	categoryId: number; // 分类ID
}

const defaultInitForm: IFormType = {
	tagId: -1,
	tag: "",
	categoryId: -1
};

const Label: FC<IProps> = props => {
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

	// 分页
	const [pagination, setPagination] = useState<IPagination>(initPagination);
	const {current, pageSize} = pagination;

	const paginationInfo = {
		showSizeChanger: true,
		showTotal: total => `共 ${total || 0} 条`,
		...pagination,
		onChange: (current, pageSize) => {
			setPagination({current, pageSize});
		}
	};

	const onSure = useCallback(() => {
		setQuery(prev => prev + 1);
	}, []);

	// 获取字典值
	console.log({props});

	// @ts-ignore
	const {PushStatus, CategoryType, CategoryTypeList} = props || {};

	const {tagId} = form;

	// 值改变
	const handleChange = (item: MapItem) => {
		setForm({...form, ...item});
	};

	// 数据请求
	useEffect(() => {
		const getSortList = async () => {
			// @ts-ignore
			const {status, result} = await getWhiteListApi({pageNumber: current, pageSize});
			const {code} = status || {};
			const {list, pageNum, pageSize: resPageSize, pageTotal, total} = result || {};
			setPagination({current: pageNum, pageSize: resPageSize, total});
			if (code === 0) {
				const newList = list.map((item: MapItem) => ({...item, key: item?.tagId}));
				setTableData(newList);
			}
		};
		getSortList();
	}, [query, current, pageSize]);

	// 删除
	const handleDel = (tagId: number) => {
		Modal.warning({
			title: "确认移除白名单么？",
			content: "移除之后他发布文章需要进入审核哦！",
			maskClosable: true,
			closable: true,
			onOk: async () => {
				// @ts-ignore
				const {status} = await removeAuthor(tagId);
				const {code} = status || {};
				console.log();
				if (code === 0) {
					message.success("删除成功");
					setPagination({current: 1, pageSize});
					onSure();
				}
			}
		});
	};

	// 表头设置
	const columns: ColumnsType<DataType> = [
		{
			title: "userId",
			dataIndex: "userId",
			key: "userId"
		},
		{
			title: "用户名",
			dataIndex: "userName",
			key: "userName"
		},
		{
			title: "简介",
			dataIndex: "profile",
			key: "profile"
		},
		{
			title: "操作",
			key: "key",
			width: 400,
			render: (_, item) => {
				// @ts-ignore
				const {userId} = item;
				return (
					<div className="operation-btn">
						<Button type="primary" danger icon={<DeleteOutlined/>} onClick={() => handleDel(userId)}>
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
			const newValues = {...values, tagId: status === UpdateEnum.Save ? UpdateEnum.Save : tagId};
			// @ts-ignore
			const {status: successStatus} = (await addAuthor(newValues)) || {};
			const {code} = successStatus || {};
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
		<Form name="basic" form={formRef} labelCol={{span: 4}} wrapperCol={{span: 16}} autoComplete="off">
			<Form.Item label="标签" name="tag" rules={[{required: true, message: "请输入名称!"}]}>
				<Input
					allowClear
					onChange={e => {
						handleChange({tag: e.target.value});
					}}
				/>
			</Form.Item>
		</Form>
	);

	return (
		<div className="banner">
			<ContentWrap>
				{/* 搜索 */}
				<Search handleChange={handleChange} {...{setStatus, setIsModalOpen}} />
				{/* 表格 */}
				<ContentInterWrap>
					<Table columns={columns} dataSource={tableData} pagination={paginationInfo}/>
				</ContentInterWrap>
			</ContentWrap>
			{/* 弹窗 */}
			<Modal title="详情" visible={isModalOpen} onCancel={() => setIsModalOpen(false)} onOk={handleSubmit}>
				{reviseModalContent}
			</Modal>
			<Modal title="添加/修改" visible={isModalOpen} onCancel={() => setIsModalOpen(false)} onOk={handleSubmit}>
				{reviseModalContent}
			</Modal>
		</div>
	);
};

const mapStateToProps = (state: any) => state.disc.disc;
const mapDispatchToProps = {};
export default connect(mapStateToProps, mapDispatchToProps)(Label);
