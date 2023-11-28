/* eslint-disable prettier/prettier */
import { FC, useCallback, useEffect, useState } from "react";
import { connect } from "react-redux";
import { useLocation, useNavigate } from "react-router";
import gfm from '@bytemd/plugin-gfm'
import { Editor } from '@bytemd/react'
import { Button, Drawer, Form, Input, message,Radio, Space, UploadFile } from "antd";
import TextArea from "antd/es/input/TextArea";
import zhHans from 'bytemd/locales/zh_Hans.json';

import { getArticleApi, saveArticleApi } from "@/api/modules/article";
import { ContentInterWrap, ContentWrap } from "@/components/common-wrap";
import { UpdateEnum } from "@/enums/common";
import { MapItem } from "@/typings/common";
import { getCompleteUrl } from "@/utils/util";
import DebounceSelect from "@/views/article/components/debounceselect/index";
import ImgUpload from "@/views/column/setting/components/imgupload";
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

interface TagValue {
	tagId: string;
	tag: string;
}

export interface IFormType {
	articleId: number;// 文章id
	status: number; // 文章状态
	content: string; // 文章内容
	cover: string; // 封面
	tagIds: number[]; // 标签
}

const defaultInitForm: IFormType = {
	articleId: 0,// 后台默认为 0
	status: 0,
	content: "",
	cover: "",
	tagIds: [],
}

const ArticleEdit: FC<IProps> = props => {
	const [formRef] = Form.useForm();

	const [form, setForm] = useState<IFormType>(defaultInitForm);

	// 抽屉
	const [isOpenDrawerShow, setIsOpenDrawerShow] = useState<boolean>(false);
	// 文章内容
	const [content, setContent] = useState<string>('');

	// 刷新函数
	const [query, setQuery] = useState<number>(0);

	// 定义一个常量，用于封面
	const coverName = "建议 180*100，仅在首页信息流中展示";

	const location = useLocation();
	const navigate = useNavigate();
	// 取出来 articleId 和 status
	// 当前的状态，用于新增还是更新，新增的时候不传递 id，更新的时候传递 id
  const { articleId, status } = location.state || {};
	console.log("看看前面是否把参数传递了过来", articleId, status);

	// 声明一个 coverList，封面
	const [coverList, setCoverList] = useState<UploadFile[]>([]);

	//@ts-ignore
	const { CategoryTypeList, CategoryType} = props || {};
	console.log("CategoryTypeList", CategoryTypeList, CategoryType);

	const onSure = useCallback(() => {
		setQuery(prev => prev + 1);
	}, []);

	const handleChange = (item: MapItem) => {
		// 把变化的值放到 form 表单中，item 可以是 table 的一行数据（详情、编辑），也可以是单独的表单值发生变化
		setForm({ ...form, ...item });
		console.log("handleChange 时看看form的值", item);
	};

	const handleFormRefChange = (item: MapItem) => {
		// 当自定义组件更新时，对 formRef 也进行更新
		console.log("handleFormRefChange 时看看form的值", item);
		formRef.setFieldsValue({ ...item });
	};

	// 抽屉关闭
	const handleClose = () => {
		setIsOpenDrawerShow(false);
	};

	const goBack = () => {
    // 跳转到文章列表页
		navigate("/article/list/index");   
  };

	// 重置表单
	const resetFrom = () => {
		setForm(defaultInitForm);
		formRef.resetFields();
		setCoverList([]);
	};

	// 保存或者更新
	const handleSaveOrUpdate = async () => {
		// 弹出抽屉
		setIsOpenDrawerShow(true);
	};

	// 编辑或者新增时提交数据到服务器端
	const handleSubmit = async () => {
		// 又从form中获取数据，需要转换格式的数据
		const { articleId, content, cover, tagIds } = form;
		console.log("handleSubmit 时看看form的值", form);
		// content 为空的时候，提示用户
		if (!content) {
			message.error("请输入文章内容");
			return;
		}

		// tags 不能超过 3 个
		if (tagIds.length > 3) {
			message.error("标签不能超过 3 个");
			return;
		}

		const values = await formRef.validateFields();
		console.log("handleSubmit 时看看form的值 values", values);

		// 新的值传递到后端
		const newValues = {
			...values,
			content: content,
			tagIds: tagIds,
			cover: cover,
			// 确定的参数
			articleType: "BLOG",
			source: 2,
			// 草稿还是发布
			actionType: "post",
			articleId: status === UpdateEnum.Save ? UpdateEnum.Save : articleId,
		};
		console.log("submit 之前的所有值:", newValues);

		const { status: successStatus } = (await saveArticleApi(newValues)) || {};
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
			console.log("此时是否还有 ", articleId, status);
			const { status: resultStatus, result } = await getArticleApi(
				articleId
			);
			const { code } = resultStatus || {};
			if (code === 0 && status === UpdateEnum.Edit) { 
				console.log("result", result);

				// 如果 status 为编辑，就请求数据
				// 设置文章内容，编辑器使用
				setContent(result?.content);

				// 此时不能直接从 form 中取出来，所以我们从 item 中取出来了。
				let coverUrl = getCompleteUrl(result?.cover);
				// 需要把 cover 放到 coverList 中，默认显示
				setCoverList([
					{
						uid: "-1",
						name: coverName,
						status: "done",
						thumbUrl: coverUrl,
						url: coverUrl
					}
				]);
				// 填充表单
				formRef.setFieldsValue({
					title: result?.title,
					summary: result?.summary,
					cover: coverUrl,
					categoryId: result?.category?.categoryId,
					tagName: result?.tags?.map((item: TagValue) => ({
						key: item?.tagId,
						label: item?.tag,
						value: item?.tag
					}))
				});

				// 保存的时候需要
				handleChange({
					content: result?.content,
					articleId: result?.articleId,
				});
			 }
		};
	
		getArticle();
	}, []);

	// 标题、分类、标签、封面、简介
	const drawerContent = (
		<Form name="basic" form={formRef} labelCol={{ span: 4 }} wrapperCol={{ span: 16 }} autoComplete="off">
			<Form.Item label="标题" name="title" rules={[{ required: true, message: "请输入标题!" }]}>
				<Input
					allowClear
					minLength={5}
					maxLength={120}
					onChange={e => {
						handleChange({ title: e.target.value });
					}}
				/>
			</Form.Item>
			<Form.Item label="简介" name="summary" rules={[{ required: true, message: "请输入简介!" }]}>
				<TextArea
					allowClear
					// 行数
					rows={4}
					onChange={e => {
						handleChange({ summary: e.target.value });
					}}
				/>
			</Form.Item>
			<Form.Item label="封面" name="cover">
				<ImgUpload
					coverList={coverList}
					coverName={coverName}
					setCoverList={setCoverList}
					handleChange={handleChange}
					handleFormRefChange={handleFormRefChange}
				/>
			</Form.Item>
			<Form.Item
        name="categoryId"
        label="分类"
        rules={[{ required: true, message: '请选择一个分类' }]}
      >
        <Radio.Group 
					className="custom-radio-group"
					optionType="button" 
					buttonStyle="solid"
					options={CategoryTypeList}>
        </Radio.Group>
      </Form.Item>
			<Form.Item 
				label="标签" 
				name="tagName" 
				rules={[{ required: true, message: "请选择标签!" }]}>
				{/*用下拉框做一个教程的选择 */}
				<DebounceSelect
					onChange={
						(selectedValues) => {
							console.log('选中的值:', selectedValues);
							// @ts-ignore
							const keys = selectedValues.map(item => Number(item.key));

							console.log('keysString', keys);
							handleChange({ tagIds: keys });
						}
					}
				/>
			</Form.Item>
		</Form>
	);

	return (
		<div className="ArticleEdit">
			<ContentWrap>
				<Search
					status={status}
					handleSave={handleSaveOrUpdate}
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
			{/* 保存或者更新时打开的抽屉 */}
			<Drawer
				title={status === UpdateEnum.Edit ? "更新文章" : "保存文章"}
				placement="right"
				width={600}
				open={isOpenDrawerShow}
				onClose={handleClose}
				extra={
					<Space>
						<Button onClick={resetFrom}>重置</Button>
						<Button type="primary" onClick={handleSubmit}>
							{status === UpdateEnum.Edit ? "确认更新" : "确认保存"}
						</Button>
					</Space>
				}
			>
				{drawerContent}
			</Drawer>
		</div>
	);
};

const mapStateToProps = (state: any) => state.disc.disc;
const mapDispatchToProps = {};
export default connect(mapStateToProps, mapDispatchToProps)(ArticleEdit);
