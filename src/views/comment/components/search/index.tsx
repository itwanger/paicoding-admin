import { FC } from "react";
import { PlusCircleOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Input, InputNumber, Select, Tooltip } from "antd";

import { ContentInterWrap } from "@/components/common-wrap";

import "./index.scss";

interface IProps {
	handleSearchChange: (value: Record<string, any>) => void;
	handleSearch: () => void;
	handleCreate: () => void;
}

const commentTypeOptions = [
	{ label: "全部类型", value: -1 },
	{ label: "顶级评论", value: 1 },
	{ label: "回复", value: 2 }
];

const Search: FC<IProps> = ({ handleSearchChange, handleSearch, handleCreate }) => {
	return (
		<div className="comment-search">
			<ContentInterWrap className="comment-search__wrap">
				<div className="comment-search__search">
					<div className="comment-search__search-item">
						<InputNumber
							placeholder="文章ID"
							min={1}
							controls={false}
							style={{ width: 130 }}
							onChange={value => handleSearchChange({ articleId: value ? Number(value) : undefined })}
						/>
					</div>
					<div className="comment-search__search-item">
						<Input
							allowClear
							placeholder="文章标题"
							style={{ width: 180 }}
							onChange={e => handleSearchChange({ articleTitle: e.target.value })}
						/>
					</div>
					<div className="comment-search__search-item">
						<Input
							allowClear
							placeholder="用户名"
							style={{ width: 150 }}
							onChange={e => handleSearchChange({ userName: e.target.value })}
						/>
					</div>
					<div className="comment-search__search-item">
						<Input
							allowClear
							placeholder="评论内容"
							style={{ width: 220 }}
							onChange={e => handleSearchChange({ content: e.target.value })}
						/>
					</div>
					<div className="comment-search__search-item">
						<Select
							allowClear
							placeholder="评论类型"
							options={commentTypeOptions}
							style={{ width: 130 }}
							onChange={value => handleSearchChange({ commentType: Number(value || -1) })}
						/>
					</div>
					<div className="comment-search__search-btn">
						<Tooltip title="按条件搜索">
							<Button type="primary" icon={<SearchOutlined />} style={{ marginRight: "10px" }} onClick={handleSearch} />
						</Tooltip>
						<Tooltip title="新增评论">
							<Button type="primary" icon={<PlusCircleOutlined />} onClick={handleCreate} />
						</Tooltip>
					</div>
				</div>
			</ContentInterWrap>
		</div>
	);
};

export default Search;
