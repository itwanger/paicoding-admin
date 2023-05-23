/* eslint-disable prettier/prettier */
import React, { FC } from "react";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Input } from "antd";

import { UpdateEnum } from "@/enums/common";
import DebounceSelect from "../debounceselect/DebounceSelect";

import "./index.scss";

interface IProps {
	handleSearchChange: (e: object) => void;
	fetchColumnList: (search: string) => Promise<any[]>;
	handleSearch: () => void;
	handleChange: (e: object) => void;
	setStatus: (e: UpdateEnum) => void;
	setIsOpenDrawerShow: (e: boolean) => void;
}

const Search: FC<IProps> = ({ 
	handleSearchChange, 
	fetchColumnList,
	handleSearch,
	handleChange, 
	setStatus, 
	setIsOpenDrawerShow 
}) => {
	return (
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
					onChange={(value, option) => {
						console.log("教程搜索的值改变", value, option);
						if (option) 
							handleSearchChange({ columnId: option.key });
						else 
							handleSearchChange({ columnId: -1 });
					}}
					fetchOptions={fetchColumnList}
				/>
			</div>
			<div className="sort-search__search-item">
				<span className="sort-search-label">教程标题</span>
				<Input 
					allowClear
					onChange={e => handleSearchChange({ articleTitle: e.target.value })} 
					style={{ width: 252 }} 
					/>
			</div>
			<Button
				type="primary"
				icon={<SearchOutlined />}
				style={{ marginRight: "10px" }}
				onClick={() => {
					handleSearch();
				}}
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
	);
};
export default Search;
