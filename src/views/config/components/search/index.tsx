import React, { FC } from "react";
import { PlusOutlined } from "@ant-design/icons";
import { Button, Input } from "antd";

import { ContentInterWrap } from "@/components/common-wrap";
import { UpdateEnum } from "@/enums/common";

import "./index.scss";

interface IProps {
	handleChange: (e: object) => void;
	setStatus: (e: UpdateEnum) => void;
	setIsModalOpen: (e: boolean) => void;
	resetForm: any;
}

const Search: FC<IProps> = ({ handleChange, setStatus, setIsModalOpen, resetForm }) => {
	return (
		<div className="config-search">
			<ContentInterWrap className="config-search__wrap">
				<div className="config-search__search ">
					<div className="config-search__search-wrap">
						<div className="config-search__search-item">
							<span className="config-search-label">类型</span>
							<Input onChange={e => handleChange({ id: e.target.value })} style={{ width: 252 }} />
						</div>
						<div className="config-search__search-item">
							<span className="config-search-label">名称</span>
							<Input onChange={e => handleChange({ id: e.target.value })} style={{ width: 252 }} />
						</div>
						<div className="config-search__search-item">
							<span className="config-search-label">标签</span>
							<Input onChange={e => handleChange({ id: e.target.value })} style={{ width: 252 }} />
						</div>
					</div>
					<Button
						type="primary"
						icon={<PlusOutlined />}
						style={{ marginRight: "10px" }}
						onClick={() => {
							resetForm();
							setStatus(UpdateEnum.Save);
							setIsModalOpen(true);
						}}
					>
						添加
					</Button>
				</div>
			</ContentInterWrap>
		</div>
	);
};
export default Search;
