/* eslint-disable prettier/prettier */
import { FC, useCallback, useEffect, useState } from "react";
import { connect } from "react-redux";
import { DeleteOutlined, EyeOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Descriptions, Drawer, Form, Image,Input, message, Modal, Select, SelectProps, Table } from "antd";
import type { ColumnsType } from "antd/es/table";

import { delColumnArticleApi, getColumnArticleListApi, getColumnByNameListApi, getColumnListApi, updateColumnArticleApi } from "@/api/modules/column";
import { ContentInterWrap, ContentWrap } from "@/components/common-wrap";
import { initPagination, IPagination, UpdateEnum } from "@/enums/common";
import { MapItem } from "@/typings/common";
import { getCompleteUrl } from "@/utils/is";

import "./index.scss";

interface IProps {}

interface DataType {
	key: string;
	name: string;
	age: number;
	address: string;
	tags: string[];
}

interface ValueType {
	key?: string; 
	label: React.ReactNode; 
	value: string | number
}

// 查询表单接口，定义类型
interface ISearchForm {
	articleTitle: string;
	columnId: number;
}

interface IFormType {
	id: number; // 主键id
	articleId: number; // 文章ID
	title: string; // 文章标题
	columnId: number; // 教程ID
	column: string; // 教程名
	sort: number; // 排序
}

const defaultInitForm: IFormType = {
	id: -1,
	articleId: -1,
	title: "",
	columnId: -1,
	column: "",
	sort: -1
};

// 查询表单默认值
const defaultSearchForm = {
	articleTitle: "",
	columnId: -1,
};

const baseUrl = import.meta.env.VITE_APP_BASE_URL;

const ColumnArticle: FC<IProps> = props => {

	const [formRef] = Form.useForm();
	// form值
	const [form, setForm] = useState<IFormType>(defaultInitForm);

	// 查询表单
	const [searchForm, setSearchForm] = useState<ISearchForm>(defaultSearchForm);
	// 搜索，目前是根据文章标题、教程 ID 搜索
	const [search, setSearch] = useState<ISearchForm>(defaultSearchForm);

	// 弹窗
	const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
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

	// 教程下拉框选项
	const [options, setOptions] = useState<ValueType[]>([]);
	// 教程查询
	const [columnSearch, setColumnSearch] = useState<String>("");
	// 教程列表的查询条件
	const [columnSearchKey, setColumnSearchKey] = useState<string>("");

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

	const { id, articleId, title, columnId, column, sort } = form;

	const detailInfo = [
		{ label: "文章ID", title: articleId },
		{ label: "文章标题", title: title },
		{ label: "教程ID", title: columnId },
		{ label: "教程名", title: column },
		{ label: "排序", title: sort }
	];

	// 值改变
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

	// 删除
	const handleDel = (id: number) => {
		Modal.warning({
			title: "确认删除此教程文章吗",
			content: "删除此教程文章后无法恢复，请谨慎操作！",
			maskClosable: true,
			closable: true,
			onOk: async () => {
				// @ts-ignore
				const { status } = await delColumnArticleApi(id);
				const { code } = status || {};
				console.log();
				if (code === 0) {
					message.success("删除成功");
					setPagination({ current: 1, pageSize });
					onSure();
				}
			}
		});
	};

	const handleSubmit = async () => {
		try {
			const values = await formRef.validateFields();
			const newValues = { ...values, id: status === UpdateEnum.Save ? UpdateEnum.Save : id };
			// @ts-ignore
			const { status: successStatus } = (await updateColumnArticleApi(newValues)) || {};
			const { code } = successStatus || {};
			if (code === 0) {
				setIsModalOpen(false);
				onSure();
			}
		} catch (errorInfo) {
			console.log("Failed:", errorInfo);
		}
	};

	// 数据请求
	useEffect(() => {
		const getSortList = async () => {
			const newValues = {
				...searchForm,
				pageNumber: current, 
				pageSize,
				columnId: searchForm.columnId
			};
			console.log("submit 之前的所有值:", newValues);
			// @ts-ignore
			const { status, result } = await getColumnArticleListApi(newValues);
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

	// 获取教程列表
	useEffect(() => {
		const getColumnList = async () => {
			// @ts-ignore
			const { status, result } = await getColumnByNameListApi(columnSearchKey);
			const { code } = status || {};
			const { items } = result || {};
			if (code === 0) {
				const newList = items.map((item: MapItem) => ({
					key: item?.columnId,
					// label 这里我想把教程封面也加上
					label: <div>
						<Image
							className="cover-select"
							src={getCompleteUrl(item?.cover)}
						/>
						<span>{item?.column}</span>
					</div>,
					value: item?.column
				}));
				console.log("教程列表", newList);
				setOptions(newList);
			}
		};
		getColumnList();
	}, [columnSearch]);

	// 表头设置
	const columns: ColumnsType<DataType> = [
		{
			title: "教程封面",
			dataIndex: "columnCover",
			key: "columnCover",
			width: 100,
			render(value) {
				const coverUrl = getCompleteUrl(value);
				return <div>
						<Image
							className="cover"
							src={coverUrl}
						/>
					</div>
			}
		},
		{
			title: "教程名称",
			dataIndex: "column",
			key: "column",
			render(value, item) {
				return (
					<a 
						href={`${baseUrl}/column/${item?.columnId}/1`}
						className="cell-text"
						target="_blank" rel="noreferrer">
						{value}
					</a>
				);
			}
		},
		{
			title: "文章标题",
			dataIndex: "title",
			key: "title",
			render(value, item) {
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
			title: "排序",
			dataIndex: "sort",
			key: "sort"
		},
		{
			title: "操作",
			key: "key",
			width: 220,
			render: (_, item) => {
				// @ts-ignore
				const { id } = item;
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
							}}
						>
							详情
						</Button>
						<Button 
							type="primary" 
							danger 
							icon={<DeleteOutlined />} 
							onClick={() => handleDel(id)}>
							删除
						</Button>
					</div>
				);
			}
		}
	];

	// 编辑表单
	const reviseModalContent = (
		<Form name="basic" form={formRef} labelCol={{ span: 4 }} wrapperCol={{ span: 16 }} autoComplete="off">
			<Form.Item label="文章ID" name="articleId" rules={[{ required: true, message: "请输入文章ID!" }]}>
				<Input
					type="number"
					allowClear
					onChange={e => {
						handleChange({ articleId: e.target.value });
					}}
				/>
			</Form.Item>
			<Form.Item label="教程ID" name="columnId" rules={[{ required: true, message: "请输入教程ID!" }]}>
				<Input
					type="number"
					allowClear
					onChange={e => {
						handleChange({ columnId: e.target.value });
					}}
				/>
			</Form.Item>
			<Form.Item label="排序" name="sort" rules={[{ required: true, message: "请输入排序!" }]}>
				<Input
					type="number"
					allowClear
					onChange={e => {
						handleChange({ sort: e.target.value });
					}}
				/>
			</Form.Item>
		</Form>
	);

	return (
		<div className="ColumnArticle">
			<ContentWrap>
				{/* 搜索 */}
				<ContentInterWrap className="sort-search__wrap">
					<div className="sort-search__search">
						<div className="sort-search__search-item">
							<span className="sort-search-label">教程</span>
							{/*用下拉框做一个教程的选择 */}
							<Select
								allowClear
								style={{ width: 252 }}
								filterOption={false}
								placeholder="选择教程"
								optionLabelProp="value"
								onChange={
									(value, option) => {
									if(option)
										handleSearchChange({ columnId: option.key })
									else
										handleSearchChange({ columnId: -1 })
									}
								}
								options={options}
							/>

						</div>
						<div className="sort-search__search-item">
							<span className="sort-search-label">文章标题</span>
							<Input onChange={e => handleSearchChange({ articleTitle: e.target.value })} style={{ width: 252 }} />
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
export default connect(mapStateToProps, mapDispatchToProps)(ColumnArticle);
