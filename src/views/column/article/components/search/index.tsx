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
}

const Search: FC<IProps> = ({ handleChange, setStatus, setIsModalOpen }) => {
	return (
		<div className="sort-search">
			<ContentInterWrap className="sort-search__wrap">
				<div className="sort-search__search">
					<Button
						type="primary"
						icon={<PlusOutlined />}
						style={{ marginRight: "1px" }}
						onClick={() => {
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
