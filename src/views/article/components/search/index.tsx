import React, { FC } from "react";
import { Input } from "antd";

import { ContentInterWrap } from "@/components/common-wrap";

import "./index.scss";

interface IProps {
	handleChange: (e: object) => void;
}

const Search: FC<IProps> = ({ handleChange }) => {
	return (
		<div className="sort-search">
			<ContentInterWrap className="sort-search__wrap">
				<div className="sort-search__search">
					<div className="sort-search__search-item">
						<span className="sort-search-label">用户</span>
						<Input onChange={e => handleChange({ id: e.target.value })} style={{ width: 252 }} />
					</div>
				</div>
			</ContentInterWrap>
		</div>
	);
};
export default Search;
