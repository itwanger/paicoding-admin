/* eslint-disable prettier/prettier */
import { FC } from "react";
import { ArrowLeftOutlined, FileTextOutlined, FileWordOutlined, RetweetOutlined, SaveOutlined } from "@ant-design/icons";
import { Button } from "antd";

import { ContentInterWrap } from "@/components/common-wrap";
import { UpdateEnum } from "@/enums/common";

import "./index.scss";

interface IProps {
	handleSave: (e: object) => void;
	handleReplaceImgUrl: (e: object) => void;
	handleImportWord: () => void;
	handleImportMarkdown: () => void;
	goBack: () => void;
	status: number;
}

const Search: FC<IProps> = ({ handleSave, goBack, status, handleReplaceImgUrl, handleImportWord, handleImportMarkdown }) => {
	return (
		<div className="article-edit-search">
			{/* 搜索 */}
			<ContentInterWrap className="article-edit-search__wrap">
				<div className="article-edit-search__search">
					<div className="article-edit-search__search-item">
						<Button onClick={goBack}><ArrowLeftOutlined />返回文章列表</Button>
					</div>
					<div className="article-edit-search__search-btn">
						<Button type="default" 
							icon={<FileWordOutlined />} 
							style={{ marginRight: "10px" }} 
							onClick={handleImportWord}>
							导入Word
						</Button>

						<Button type="default" 
							icon={<FileTextOutlined />} 
							style={{ marginRight: "10px" }} 
							onClick={handleImportMarkdown}>
							导入Markdown
						</Button>

						<Button type="primary" 
							icon={<RetweetOutlined />} 
							style={{ marginRight: "10px" }} 
							onClick={handleReplaceImgUrl}>
							转链
						</Button>

						<Button type="primary" icon={<SaveOutlined />} style={{ marginRight: "25px" }} onClick={handleSave}>
							{status === UpdateEnum.Edit ? "更新" : "保存"}
						</Button>
					</div>
				</div>
			</ContentInterWrap>
		</div>
	);
};
export default Search;
