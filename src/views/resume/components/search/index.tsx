/* eslint-disable prettier/prettier */
import { FC } from "react";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Input, Select } from "antd";

import { ContentInterWrap } from "@/components/common-wrap";

import "./index.scss";

interface IProps {
	handleSearch: (e: object) => void;
	handleSearchChange: (e: object) => void;
}

const Search: FC<IProps> = ({ handleSearch, handleSearchChange }) => {
	return (
		<div className="tag-search">
			<ContentInterWrap className="tag-search__wrap">
				<div className="tag-search__search">
					<div className="tag-search__search-wrap">
						<div className="tag-search__search-item">
							<label className="tag-search-label">用户</label>
							<Input
								allowClear
								style={{ width: 252 }}
								placeholder="请输入用户名"
								onChange={e => handleSearchChange({ uname: e.target.value })}
							/>
						</div>
						<div className="config-search__search-item">
							<label className="config-search-label">状态</label>
							<Select
								allowClear
								style={{ width: 152 }}
								defaultValue={"0"}
								onChange={value => {
									console.log("查询类型", value);
									handleSearchChange({ type: Number(value) });
								}}
								placeholder="请选择类型"
								options={[
									{ value: "0", label: "未处理" },
									{ value: "1", label: "处理中" },
									{ value: "2", label: "已回复" }
								]}
							/>
						</div>
					</div>
					<div className="tag-search__search-btn">
						<Button type="primary" icon={<SearchOutlined />} style={{ marginRight: "10px" }} onClick={handleSearch}>
							搜索
						</Button>
					</div>
				</div>
			</ContentInterWrap>
		</div>
	);
};
export default Search;
