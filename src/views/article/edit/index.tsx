/* eslint-disable prettier/prettier */
import { FC, useCallback, useEffect, useState } from "react";
import { connect } from "react-redux";
import { useLocation, useNavigate } from "react-router";
import gfm from '@bytemd/plugin-gfm'
import { Editor, Viewer } from '@bytemd/react'
import { Form, message } from "antd";
import zhHans from 'bytemd/locales/zh_Hans.json';

import { getArticleApi, updateArticleApi } from "@/api/modules/article";
import { ContentInterWrap, ContentWrap } from "@/components/common-wrap";
import { UpdateEnum } from "@/enums/common";
import { MapItem } from "@/typings/common";
import Search from "./search";

import 'bytemd/dist/index.css';
import 'juejin-markdown-themes/dist/juejin.css';
import "./index.scss";

const plugins = [
	gfm({
	}),
	// Add more plugins here
]

interface IProps {}

export interface IFormType {
	articleId: number;// 文章id
	content: string; // 文章内容
}

const defaultInitForm: IFormType = {
	articleId: -1,
	content: "",
}

const ArticleEdit: FC<IProps> = props => {
	const [formRef] = Form.useForm();

	const [form, setForm] = useState<IFormType>(defaultInitForm);

	// 文章内容
	const [content, setContent] = useState<string>('');

	// 刷新函数
	const [query, setQuery] = useState<number>(0);

	//当前的状态，用于新增还是更新，新增的时候不传递 id，更新的时候传递 id
	const [status, setStatus] = useState<UpdateEnum>(UpdateEnum.Save);

	const location = useLocation();
	const navigate = useNavigate();
  const { articleId } = location.state || {};

	const onSure = useCallback(() => {
		setQuery(prev => prev + 1);
	}, []);

	const handleChange = (item: MapItem) => {
		// 把变化的值放到 form 表单中，item 可以是 table 的一行数据（详情、编辑），也可以是单独的表单值发生变化
		setForm({ ...form, ...item });
		console.log("handleChange 时看看form的值", item);
	};

	const goBack = () => {
    navigate(-1); // 返回上一个页面
  };

	// 编辑或者新增时提交数据到服务器端
	const handleSubmit = async () => {
		// 又从form中获取数据，需要转换格式的数据
		const { articleId, content } = form;
		console.log("handleSubmit 时看看form的值", form);

		// 新的值传递到后端
		const newValues = {
			content: content,
			articleId: status === UpdateEnum.Save ? UpdateEnum.Save : articleId,
		};
		console.log("submit 之前的所有值:", newValues);

		const { status: successStatus } = (await updateArticleApi(newValues)) || {};
		const { code, msg } = successStatus || {};
		if (code === 0) {
			message.success("成功");
			// 返回文章列表页
			goBack();
		} else {
			message.error(msg || "失败");
		}
	};

	// 数据请求，这是一个钩子，query, current, pageSize, search 有变化的时候就会自动触发
	useEffect(() => {
		const getArticle = async () => {
			const { status, result } = await getArticleApi(
				articleId
			);
			const { code } = status || {};
			//@ts-ignore
			const { content } = result || {};
			if (code === 0) { 
				console.log("result", result);
				setContent(content);
			 }
		};
		getArticle();
	}, [query]);

	return (
		<div className="ArticleEdit">
			<ContentWrap>
				<Search
					handleSave={handleSubmit}
					goBack={goBack}
				/>
				<ContentInterWrap>
					<Editor
						value={content}
						plugins={plugins}
						locale={zhHans}
						onChange={(v) => {
							handleChange({ content: v });
						}}
					/>
				</ContentInterWrap>
			</ContentWrap>
		</div>
	);
};

const mapStateToProps = (state: any) => state.disc.disc;
const mapDispatchToProps = {};
export default connect(mapStateToProps, mapDispatchToProps)(ArticleEdit);
