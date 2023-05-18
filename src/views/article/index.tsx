/* eslint-disable prettier/prettier */
import { FC, useCallback, useEffect, useState } from "react";
import { connect } from "react-redux";
import { CheckCircleOutlined, CloseCircleOutlined, DeleteOutlined, EditOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Form, Input, message, Modal, Radio, Select, Space, Switch, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { set } from "immer/dist/internal";

import { delArticleApi, examineArticleApi, getArticleListApi, operateArticleApi, updateArticleApi } from "@/api/modules/article";
import { updateTagApi } from "@/api/modules/tag";
import { ContentInterWrap, ContentWrap } from "@/components/common-wrap";
import { initPagination, IPagination, PushStatusEnum, pushStatusInfo, UpdateEnum } from "@/enums/common";
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

// 编辑表单接口，定义类型
interface IInitForm {
	articleId: number;
	title: string;
	shortTitle: string;
	status: number;
}

// 查询表单接口，定义类型
interface ISearchForm {
	title: string;
	status: number;
	toppingStat: number;
	officalStat: number;
}

// 编辑表单默认值
const defaultInitForm = {
	articleId: -1,
	title: "",
	shortTitle: "",
	status: -1
};

// 查询表单默认值
const defaultSearchForm = {
	title: "",
	status: -1,
	toppingStat : -1,
	officalStat : -1
};

const Article: FC<IProps> = props => {
	const [formRef] = Form.useForm();
	// 编辑表单
	const [form, setForm] = useState<IInitForm>(defaultInitForm);
	// 查询表单
	const [searchForm, setSearchForm] = useState<ISearchForm>(defaultSearchForm);
	// 搜索，目前是根据标题、状态、置顶、推荐搜索
	const [search, setSearch] = useState<ISearchForm>(defaultSearchForm);
	// 弹窗
	const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
	// 列表数据
	const [tableData, setTableData] = useState<DataType[]>([]);
	// 刷新函数
	const [query, setQuery] = useState<number>(0);

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
	const { PushStatusList, ToppingStatusList, OfficalStatusList} = props || {};

	// 重置表单
	const resetBarFrom = () => {
		setForm(defaultInitForm);
	};

	const { articleId } = form;

	// 编辑表单值改变
	const handleChange = (item: MapItem) => {
		setForm({ ...form, ...item });
	};

	// 查询表单值改变
	const handleSearchChange = (item: MapItem) => {
		// 当 status 的值为 -1 时，重新显示
		setSearchForm({ ...searchForm, ...item });
		console.log("查询条件变化了",searchForm);
	};

	// 当点击查询按钮的时候触发
	const handleSearch = () => {
		// 目前是根据文章标题搜索，后面需要加上其他条件
		console.log("查询条件", searchForm);
		setSearch(searchForm);
	};

	// 数据请求，这是一个钩子，query, current, pageSize, search 有变化的时候就会自动触发
	useEffect(() => {
		const getSortList = async () => {
			// @ts-ignore
			const { status, result } = await getArticleListApi({ 
				pageNumber: current, 
				pageSize,
				...searchForm
			});
			const { code } = status || {};
			const { list, pageNum, pageSize: resPageSize, pageTotal, total } = result || {};
			setPagination({ current: pageNum, pageSize: resPageSize, total });
			if (code === 0) {
				const newList = list.map((item: MapItem) => ({ ...item, key: item?.categoryId }));
				setTableData(newList);
			}
		};
		getSortList();
	}, [query, current, pageSize, search]);

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
				if (code === 0) {
					message.success("删除成功");
					setPagination({ current: 1, pageSize });
					onSure();
				}
			}
		});
	};

	// 置顶和官方
	const handleOperate = async (articleId: number, operateType: number) => {
		let operateDesc = "";
		if (operateType === 4) {
			operateDesc = "取消置顶";
		} else if (operateType === 3) {
			operateDesc = "置顶";
		} else if (operateType === 2) {
			operateDesc = "取消推荐";
		} else if (operateType === 1) {
			operateDesc = "推荐";
		}
		// @ts-ignore
		const { status } = await operateArticleApi({ articleId, operateType });
		const { code } = status || {};
		if (code === 0) {
			message.success(operateDesc + "操作成功");
			onSure();
		}
	};

	// 改变文章状态的操作
	const handleStatusChange = async (articleId: number, status: number) => {
		// 将 articleId 和 status 作为参数传递给 updateArticleApi
		const newValues = { articleId, status };
		// @ts-ignore
		const { status: successStatus } = await updateArticleApi(newValues) || {};
		const { code } = successStatus || {};
		if (code === 0) {
			message.success("状态操作成功");
			console.log("code", code);
			onSure();
		}
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
			key: "title",
			render(value, item) {
				const baseUrl = import.meta.env.VITE_APP_BASE_URL;
				return (
					<a 
						href={`${baseUrl}/article/detail/${item?.articleId}`}
						className="cell-text"
						target="_blank" rel="noreferrer">
						{value}
					</a>
				);
			}
		},
		{
			title: "短标题",
			dataIndex: "shortTitle",
			width: 150,
			key: "shortTitle"
		},
		{
			title: "作者",
			dataIndex: "authorName",
			width: 100,
			key: "authorName"
		},
		{
			title: "置顶",
			dataIndex: "toppingStat",
			key: "toppingStat",
			render(_, item) {
				// @ts-ignore
				const { articleId, toppingStat } = item;
				// 返回的是 0 和 1
				const isTopped = toppingStat === 1;
		
				const topStatus = isTopped ? 4 : 3; // 3-置顶；4-取消置顶
				return <Switch checked={isTopped} onChange={() => handleOperate(articleId, topStatus)} />;
			}
		},
		{
			title: "推荐",
			dataIndex: "officalStat",
			key: "officalStat",
			render(_, item) {
				// 使用 switch 开关
				// @ts-ignore
				const { articleId, officalStat } = item;
				const isOffical = officalStat === 1;
				const officalStatus = isOffical ? 2 : 1; // 1-官方推荐；2-取消官方推荐
				return <Switch checked={isOffical} onChange={() => handleOperate(articleId, officalStatus)} />;
			}
		},
		{
			title: "状态",
			dataIndex: "status",
			key: "status",
			render(_, item) {
				// @ts-ignore
				const { articleId, status } = item;
				
				return <Select 
								// 如果 status 为 1 那么 status 为 warning
								status={status === 1 ? "" : "error"}
								value={status.toString()} 
								style={{ width: 120 }}
								options={PushStatusList}
								onChange={(value) => handleStatusChange(articleId, Number(value))}
							>
							</Select>;
			}
		},
		{
			title: "操作",
			key: "key",
			width: 210,
			render: (_, item) => {
				// @ts-ignore
				const { articleId, status } = item;
				return (
					<div className="operation-btn">
						<Button
							type="primary"
							icon={<EditOutlined />}
							style={{ marginRight: "10px" }}
							onClick={() => {
								setIsModalOpen(true);

								handleChange({ articleId: articleId, status: String(status), ...item });

								formRef.setFieldsValue({
									...item,
									status: String(status)
								});
							}}
						>
							编辑
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

	const handleSubmit = async () => {
		try {
			const values = await formRef.validateFields();
			// 从 form 中取出 status
			const { status } = form;
			const newValues = { ...values, articleId, status };
			console.log("编辑 时提交的 newValues:", newValues);
			// @ts-ignore
			const { status: successStatus } = (await updateArticleApi(newValues)) || {};
			const { code } = successStatus || {};
			if (code === 0) {
				message.success("编辑成功");
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
			<Form.Item label="标题" name="title" rules={[{ required: false, message: "请输入标题!" }]}>
				<Input
					allowClear
					onChange={e => {
						handleChange({ tag: e.target.value });
					}}
				/>
			</Form.Item>
			<Form.Item label="短标题" name="shortTitle" rules={[{ required: false, message: "请输入短标题!" }]}>
				<Input
					allowClear
					onChange={e => {
						handleChange({ tag: e.target.value });
					}}
				/>
			</Form.Item>
		</Form>
	);

	return (
		<div className="banner">
			<ContentWrap>
				{/* 搜索 */}
				<ContentInterWrap className="sort-search__wrap">
					<div className="sort-search__search">
						<div className="sort-search__search-item">
							<span className="sort-search-label">文章标题</span>
							<Input onChange={e => handleSearchChange({ title: e.target.value })} style={{ width: 252 }} />
						</div>
						<div className="sort-search__search-item">
							<Select
								// 可以清空
								allowClear
								// 默认值
								placeholder="选择状态"
								style={{ width: 120 }}
								options={PushStatusList}
								// 触发搜索
								onChange={(value) => handleSearchChange({ status: Number(value || -1) })}
								>
							</Select>
						</div>
						<div className="sort-search__search-item">
							<Select
								// 可以清空
								allowClear
								// 默认值
								placeholder="是否置顶"
								style={{ width: 120 }}
								options={ToppingStatusList}
								// 触发搜索
								onChange={(value) => handleSearchChange({ toppingStat: Number(value || -1) })}
								>
							</Select>
						</div>
						<div className="sort-search__search-item">
							<Select
								// 可以清空
								allowClear
								// 默认值
								placeholder="是否推荐"
								style={{ width: 120 }}
								options={OfficalStatusList}
								// 触发搜索
								onChange={(value) => handleSearchChange({ officalStat: Number(value || -1) })}
								>
							</Select>
						</div>
						<Button 
							type="primary" 
							icon={<SearchOutlined />}
							style={{ marginRight: "10px" }}
							onClick={() => {handleSearch();}}
							>
							搜索
						</Button>
					</div>
				</ContentInterWrap>
				{/* 表格 */}
				<ContentInterWrap>
					<Table columns={columns} dataSource={tableData} pagination={paginationInfo} />
				</ContentInterWrap>
			</ContentWrap>
			{/* 弹窗 */}
			<Modal title="修改" visible={isModalOpen} onCancel={() => setIsModalOpen(false)} onOk={handleSubmit}>
				{reviseModalContent}
			</Modal>
		</div>
	);
};

const mapStateToProps = (state: any) => state.disc.disc;
const mapDispatchToProps = {};
export default connect(mapStateToProps, mapDispatchToProps)(Article);
