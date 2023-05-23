/* eslint-disable prettier/prettier */
import React, { FC, useEffect, useState } from "react";
import { Avatar,Button, Checkbox, Divider, Input, Select, Table } from "antd";
import type { ColumnsType } from "antd/es/table";

import { initArticlePagination,IPagination } from "@/enums/common";
import { MapItem } from "@/typings/common";
import { getArticleListApi } from "@/api/modules/article";

const { Option } = Select;

// 教程文章的数据类型
interface DataType {
	articleId: number;
	title: string;
	authorName: string;
}

interface ValueType {
	key?: string; 
	label: React.ReactNode; 
	value: string | number
}

interface IProps {
	isArticleSelectOpen: boolean;
	setIsArticleSelectOpen: (e: boolean) => void;
	handleChange: (e: object) => void;
}

// 查询表单接口，定义类型
interface ISearchArticleForm {
	title: string;
	userName: string;
	status: number;
	toppingStat: number;
	officalStat: number;
}

// 查询表单默认值
const defaultArticleSearchForm = {
	title: "",
	userName: "",
	status: -1,
	toppingStat : -1,
	officalStat : -1
};

const TableSelect: FC<IProps> = ({
	isArticleSelectOpen,
	setIsArticleSelectOpen,
	handleChange,
}) => {
	// 文章下拉框显示的值
	const [articleSelectValue, setArticleSelectValue] = useState<ValueType>();
	// 查询文章表单
	const [searchArticleForm, setSearchArticleForm] = useState<ISearchArticleForm>(defaultArticleSearchForm);
	// 文章搜索，目前是根据标题、状态、置顶、推荐搜索
	const [searchArticle, setSearchArticle] = useState<ISearchArticleForm>(defaultArticleSearchForm);
	// 文章列表数据
	const [tableArticleData, setTableArticleData] = useState<DataType[]>([]);

	// 文章分页
	const [paginationArticle, setPaginationArticle] = useState<IPagination>(initArticlePagination);
	const { current: currentArticle, pageSize: pageSizeArticle } = paginationArticle;

	const paginationArticleInfo = {
		showSizeChanger: false,
		showTotal: (total: number) => `共 ${total || 0} 条`,
		...paginationArticle,
		onChange: (current: number, pageSize: number) => {
			setPaginationArticle({ current, pageSize });
		}
	};
	
	// 文章查询表单值改变
	const handleSearchArticleChange = (item: MapItem) => {
		// 当 status 的值为 -1 时，重新显示
		setSearchArticleForm({ ...searchArticleForm, ...item });
		console.log("文章查询条件变化了",searchArticleForm);
	};

	// 当点击文章筛选按钮的时候触发
	const handleArticleSearch = () => {
		// 目前是根据文章标题搜索，后面需要加上其他条件
		console.log("查询条件", searchArticleForm);
		setSearchArticle(searchArticleForm);
	};

	// 文章数据请求，这是一个钩子，query, current, pageSize, search 有变化的时候就会自动触发
	useEffect(() => {
		const getArticleSortList = async () => {
			console.log("文章查询条件", paginationArticle);
			const { status, result } = await getArticleListApi({ 
				pageNumber: currentArticle, 
				pageSize: pageSizeArticle,
				...searchArticleForm
			});
			const { code } = status || {};
			// @ts-ignore
			const { list, pageNum, pageSize: resPageSize, pageTotal, total } = result || {};
			setPaginationArticle({ current: pageNum, pageSize: resPageSize, total });
			if (code === 0) {
				const newList = list.map((item: MapItem) => ({ ...item, key: item?.categoryId }));
				setTableArticleData(newList);
			}
		};
		getArticleSortList();
	}, [currentArticle, pageSizeArticle, searchArticle]);
	
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

	return (
		<Select
			placeholder="请选择教程"
			labelInValue={true}
			open={isArticleSelectOpen}
			showSearch={false}
			// 复选框选中的时候回显
			value={articleSelectValue}
			// 下拉框展开时触发，同时上层抽屉关闭时需要关闭
			onDropdownVisibleChange={() => {
				console.log("下拉框展开");
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
							{/* 增加一个作者的查询条件 */}
							<Input
								placeholder="请输入作者名"
								allowClear
								style={{ flex: "auto", marginRight: 8 }}
								onChange={e => {
									handleSearchArticleChange({ userName: e.target.value });
								}}
							/>
							
							<Input
								placeholder="请输入教程名"
								allowClear
								style={{ flex: "auto" }}
								onChange={e => {
									handleSearchArticleChange({ title: e.target.value });
								}}
							/>
							<Button
								type="primary"
								style={{ marginLeft: 8 }}
								onClick={() => {
									handleArticleSearch();
								}}
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
	);
};

export default TableSelect;
