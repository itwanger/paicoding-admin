/* eslint-disable react/jsx-no-comment-textnodes */
/* eslint-disable prettier/prettier */
import { FC, useCallback, useEffect, useState } from "react";
import { connect } from "react-redux";
import { DeleteOutlined, EyeOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { Avatar, Button, Checkbox, Descriptions, Divider, Drawer, Form, Image,Input, message, Modal, Select, Space, Table } from "antd";
import type { ColumnsType } from "antd/es/table";

import { getArticleListApi } from "@/api/modules/article";
import { delColumnArticleApi, getColumnArticleListApi, getColumnByNameListApi, updateColumnArticleApi } from "@/api/modules/column";
import { ContentInterWrap, ContentWrap } from "@/components/common-wrap";
import { initArticlePagination, initPagination, IPagination, UpdateEnum } from "@/enums/common";
import { MapItem } from "@/typings/common";
import { getCompleteUrl } from "@/utils/is";
import DebounceSelect from "./components/debounceselect/DebounceSelect";

import "./index.scss";

interface IProps {}

// 教程文章的数据类型
interface DataType {
	id: number;
	articleId: string;
	title: string;
	shortTitle: string;
	columnId: number;
	column: string;
	sort: number;
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

// 查询表单接口，定义类型
interface ISearchArticleForm {
	title: string;
	status: number;
	toppingStat: number;
	officalStat: number;
}

interface IFormType {
	id: number; // 主键id
	articleId: number; // 文章ID
	title: string; // 文章标题
	shortTitle: string; // 文章短标题
	columnId: number; // 教程ID
	column: string; // 教程名
	sort: number; // 排序
}

const defaultInitForm: IFormType = {
	id: -1,
	articleId: -1,
	title: "",
	shortTitle: "",
	columnId: -1,
	column: "",
	sort: -1
};

// 查询表单默认值
const defaultSearchForm = {
	articleTitle: "",
	columnId: -1,
};

// 查询表单默认值
const defaultArticleSearchForm = {
	title: "",
	status: -1,
	toppingStat : -1,
	officalStat : -1
};

// Usage of DebounceSelect
interface ColumnValue {
	key: string;
	label: string;
	value: string;
}

const baseUrl = import.meta.env.VITE_APP_BASE_URL;

const ColumnArticle: FC<IProps> = props => {

	const [formRef] = Form.useForm();
	// form值（详情和新增的时候会用到）
	const [form, setForm] = useState<IFormType>(defaultInitForm);

	// 查询表单
	const [searchForm, setSearchForm] = useState<ISearchForm>(defaultSearchForm);
	// 搜索，目前是根据文章标题、教程 ID 搜索
	const [search, setSearch] = useState<ISearchForm>(defaultSearchForm);
	// 查询文章表单
	const [searchArticleForm, setSearchArticleForm] = useState<ISearchArticleForm>(defaultArticleSearchForm);
	// 文章搜索，目前是根据标题、状态、置顶、推荐搜索
	const [searchArticle, setSearchArticle] = useState<ISearchArticleForm>(defaultArticleSearchForm);
	// 修改添加抽屉
	const [isOpenDrawerShow, setIsOpenDrawerShow] = useState<boolean>(false);
	// 详情抽屉
	const [isDetailDrawerShow, setIsDetailDrawerShow] = useState<boolean>(false);
	// 文章选择下拉框是否打开
	const [isArticleSelectOpen, setIsArticleSelectOpen] = useState<boolean>(false);
	// 文章下拉框显示的值
	const [articleSelectValue, setArticleSelectValue] = useState<ValueType>();

	// 列表数据
	const [tableData, setTableData] = useState<DataType[]>([]);
	// 刷新函数
	const [query, setQuery] = useState<number>(0);

	//当前的状态
	const [status, setStatus] = useState<UpdateEnum>(UpdateEnum.Save);

	// 分页
	const [pagination, setPagination] = useState<IPagination>(initPagination);
	const { current, pageSize } = pagination;

	// 文章列表数据
	const [tableArticleData, setTableArticleData] = useState<DataType[]>([]);

	// 文章分页
	const [paginationArticle, setPaginationArticle] = useState<IPagination>(initArticlePagination);
	const { current: currentArticle, pageSize: pageSizeArticle } = paginationArticle;

	// 详情信息
	const { id, articleId, title, shortTitle, columnId, column, sort } = form;

	const detailInfo = [
		{ label: "专栏ID", title: columnId },
		{ label: "专栏名", title: column },
		{ label: "文章ID", title: articleId },
		{ label: "文章标题", title: title },
		{ label: "教程ID", title: id },
		{ label: "教程标题", title: shortTitle },
		{ label: "排序", title: sort }
	];

	const paginationArticleInfo = {
		showSizeChanger: false,
		showTotal: (total: number) => `共 ${total || 0} 条`,
		...paginationArticle,
		onChange: (current: number, pageSize: number) => {
			setPaginationArticle({ current, pageSize });
		}
	};

	const paginationInfo = {
		showSizeChanger: true,
		showTotal: (total: any) => `共 ${total || 0} 条`,
		...pagination,
		onChange: (current: number, pageSize: number) => {
			setPagination({ current, pageSize });
		}
	};

	const onSure = useCallback(() => {
		setQuery(prev => prev + 1);
	}, []);

	// 值改变（新增教程文章时）
	const handleChange = (item: MapItem) => {
		setForm({ ...form, ...item });
	};

	// 查询表单值改变
	const handleSearchChange = (item: MapItem) => {
		// 当 status 的值为 -1 时，重新显示
		setSearchForm({ ...searchForm, ...item });
		console.log("查询条件变化了",searchForm);
	};

	// 文章查询表单值改变
	const handleSearchArticleChange = (item: MapItem) => {
		// 当 status 的值为 -1 时，重新显示
		setSearchArticleForm({ ...searchArticleForm, ...item });
		console.log("文章查询条件变化了",searchArticleForm);
	};

	// 当点击查询按钮的时候触发
	const handleSearch = () => {
		// 目前是根据文章标题搜索，后面需要加上其他条件
		console.log("查询条件", searchForm);
		setSearch(searchForm);
	};

	// 当点击文章筛选按钮的时候触发
	const handleArticleSearch = () => {
		// 目前是根据文章标题搜索，后面需要加上其他条件
		console.log("查询条件", searchArticleForm);
		setSearchArticle(searchArticleForm);
	};

	// 关闭抽屉时触发
	const handleCloseDrawer = () => {
		// 关闭文章的下拉框
		setIsArticleSelectOpen(false);
		setIsOpenDrawerShow(false);
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

	// 添加教程文章
	const handleSubmit = async () => {
		try {
			const values = await formRef.validateFields();
			const newValues = {
				columnId : form.columnId, 
				articleId: form.articleId,
				shortTitle: form.shortTitle,
				id: status === UpdateEnum.Save ? UpdateEnum.Save : id 
			};
			console.log("提交的值:", newValues);
			// columnId 不允许为空
			if (!newValues.columnId || newValues.columnId === -1) {
				message.error("请选择专栏");
				return;
			}
			// 教程标题不能为空
			if (!newValues.shortTitle) {
				message.error("教程标题不能为空");
				return;
			}
			// articleId 不允许为空
			if (!newValues.articleId || newValues.columnId === -1) {
				message.error("请选择教程");
				return;
			}
			// @ts-ignore
			const { status: successStatus } = (await updateColumnArticleApi(newValues)) || {};
			const { code, msg } = successStatus || {};
			if (code === 0) {
				setIsOpenDrawerShow(false);
				onSure();
			} else {
				message.error(msg);
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
			console.log("查询教程列表之前的所有值:", newValues);
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

	// 文章数据请求，这是一个钩子，query, current, pageSize, search 有变化的时候就会自动触发
	useEffect(() => {
		const getArticleSortList = async () => {
			// @ts-ignore
			const { status, result } = await getArticleListApi({ 
				pageNumber: currentArticle, 
				pageSize: pageSizeArticle,
				...searchArticleForm
			});
			const { code } = status || {};
			const { list, pageNum, pageSize: resPageSize, pageTotal, total } = result || {};
			setPaginationArticle({ current: pageNum, pageSize: resPageSize, total });
			if (code === 0) {
				const newList = list.map((item: MapItem) => ({ ...item, key: item?.categoryId }));
				setTableArticleData(newList);
			}
		};
		getArticleSortList();
	}, [currentArticle, pageSizeArticle, searchArticle]);

	async function fetchColumnList(key: string): Promise<ColumnValue[]> {
		console.log('fetching user', key);

		const { status, result } = await getColumnByNameListApi(key);
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
			return newList;
		}
		return [];
		
	};

	// 表头设置
	const columns: ColumnsType<DataType> = [
		{
			title: "专栏名称",
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
			title: "教程标题",
			dataIndex: "shortTitle",
			key: "shortTitle",
			render(value, item) {
				return (
					<a 
						href={`${baseUrl}/column/${item?.columnId}/${item?.sort}`}
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
								setIsDetailDrawerShow(true);
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

	// 表头设置
	const columnsArticle: ColumnsType<DataType> = [
		{
			title: "教程标题",
			dataIndex: "shortTitle",
			key: "shortTitle",
			render(value, item) {
				return (
					<span className="cell-text-article">
						{/* 全部改用 title，shortTitle 在选中的时候带回到输入框 */}
						{item?.title}
					</span>
				);
			}
		},
		{
			title: "作者",
			dataIndex: "authorName",
			key: "authorName",
			render(value) {
				return <>
					<Avatar style={{ backgroundColor: '#87d068' }} size={"small"}>
						{value.slice(0, 3)}
					</Avatar>
				</>;
			}
		},
		{
			title: "操作",
			key: "key",
			render: (_, item) => {
				{/* 用 checkbox 来负责选中当前行，把选中行的 articleId 带回到下拉框中 */}
				return (
						<Checkbox
							checked={articleSelectValue?.value === item?.articleId}
							onChange={(e) => {
								const { checked } = e.target;
								console.log("选中的状态", checked);
								if (checked) {
									// @ts-ignore
									const { articleId, shortTitle, title } = item;
									console.log("文章当前的 ID", articleId, shortTitle, title);

									// 选中当前行，把当前行的 articleId 和 title 传给 form 表单
									handleChange({
										articleId: articleId,
										shortTitle: shortTitle
									});
		
									// 把当前行的 articleId 和 title 传给下拉框
									setArticleSelectValue({value : articleId, label : title});
									console.log("选中的文章", articleSelectValue);
									// 关闭下拉框
									setIsArticleSelectOpen(false);
								}
							}}
						/>
				);
			}
		}
	];

	// 编辑表单
	const reviseDrawerContent = (
		<Form 
			name="basic" 
			form={formRef} 
			labelCol={{ span: 4 }} 
			wrapperCol={{ span: 16 }} 
			autoComplete="off">
			<Form.Item label="专栏">
				{/*用下拉框做一个教程的选择 */}
				<DebounceSelect
					allowClear
					filterOption={false}
					placeholder="选择专栏"
					// optionLabelProp：回填到选择框的 Option 的属性值，默认是 Option 的子元素。
					// 比如在子元素需要高亮效果时，此值可以设为 value
					optionLabelProp="value"
					// 是否在输入框聚焦时自动调用搜索方法
					showSearch={true}
					onChange={
						(value, option) => {
							console.log("添加教程文章时教程搜索的值改变", value, option)
						if(option)
							handleChange({ columnId: option.key })
						else
							handleChange({ columnId: -1 })
						}
					}
					fetchOptions={fetchColumnList}
				/>
			</Form.Item>

			<Form.Item label="教程标题">
				<Input
					allowClear
					placeholder="请输入教程标题"
					value={shortTitle}
					onChange={e => handleChange({ shortTitle: e.target.value })}
				/>
			</Form.Item>
			
			<Form.Item label="教程">
				<Select
					placeholder="请选择教程"
					labelInValue={true}
					open={isArticleSelectOpen}
					showSearch={false}
					value={articleSelectValue}
					// 下拉框展开时触发
					onDropdownVisibleChange={() => {
						console.log("下拉框展开")
						setIsArticleSelectOpen(true);
					}}
					// render
					dropdownRender={menu => {
						return (
							<div>
								<div
									style={{
										display: "flex",
										flexWrap: "nowrap",
										padding: 8
									}}
								>
									<Input
										placeholder="请输入你想要查找的教程名"
										allowClear
										style={{ flex: "auto" }}
										onChange={e => {
											handleSearchArticleChange({title : e.target.value});
										}}
									/>
									<Button
										type="primary"
										style={{ marginLeft: 8 }}
										onClick={() => {handleArticleSearch();}}
									>
										筛选
									</Button>
								</div>
								{/* 添加一个分割线 */}
								<Divider style={{ margin: "4px 0" }} />
								{/* 添加一个Table */}
								<Table 
										columns={columnsArticle} 
										dataSource={tableArticleData} 
										pagination={paginationArticleInfo} />
							</div>
						);
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
							<span className="sort-search-label">专栏</span>
							{/*用下拉框做一个教程的选择 */}
							<DebounceSelect
								allowClear
								style={{ width: 252 }}
								filterOption={false}
								placeholder="选择专栏"
								// 回填到选择框的 Option 的属性值，默认是 Option 的子元素。
								// 比如在子元素需要高亮效果时，此值可以设为 value
								optionLabelProp="value"
								// 是否在输入框聚焦时自动调用搜索方法
								showSearch={true}
								onChange={
									(value, option) => {
										console.log("教程搜索的值改变", value, option)
									if(option)
										handleSearchChange({ columnId: option.key })
									else
										handleSearchChange({ columnId: -1 })
									}
								}
								fetchOptions={fetchColumnList}
							/>

						</div>
						<div className="sort-search__search-item">
							<span className="sort-search-label">教程标题</span>
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
						<Button
							type="primary"
							icon={<PlusOutlined />}
							style={{ marginRight: "10px" }}
							onClick={() => {
								setIsOpenDrawerShow(true);
								setStatus(UpdateEnum.Save);
							}}
						>
							添加
						</Button>
					</div>
				</ContentInterWrap>
				{/* 表格 */}
				<ContentInterWrap>
					<Table columns={columns} dataSource={tableData} pagination={paginationInfo} />
				</ContentInterWrap>
			</ContentWrap>
			{/* 抽屉 */}
			<Drawer 
				title="详情" 
				placement="right" 
				onClose={() => setIsDetailDrawerShow(false)} 
				open={isDetailDrawerShow}>
				<Descriptions column={1} labelStyle={{ width: "100px" }}>
					{detailInfo.map(({ label, title }) => (
						<Descriptions.Item label={label} key={label}>
							{title !== 0 ? title || "-" : 0}
						</Descriptions.Item>
					))}
				</Descriptions>
			</Drawer>
			{/* 把弹窗修改为抽屉 */}
			<Drawer 
				title="添加" 
				size="large"
				placement="right"
				extra={
          <Space>
            <Button onClick={handleCloseDrawer}>取消</Button>
            <Button type="primary" onClick={handleSubmit}>
              OK
            </Button>
          </Space>
        }
				onClose={handleCloseDrawer} 
				open={isOpenDrawerShow}>
				{reviseDrawerContent}
			</Drawer>
		</div>
	);
};

const mapStateToProps = (state: any) => state.disc.disc;
const mapDispatchToProps = {};
export default connect(mapStateToProps, mapDispatchToProps)(ColumnArticle);

