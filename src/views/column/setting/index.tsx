/* eslint-disable prettier/prettier */
import { FC, useCallback, useEffect, useState } from "react";
import { connect } from "react-redux";
import { CheckCircleOutlined, DeleteOutlined, EditOutlined, EyeOutlined, InboxOutlined, SearchOutlined, UploadOutlined } from "@ant-design/icons";
import { Avatar, Button, DatePicker, Descriptions, Divider, Drawer, Form, Image, Input, message, Modal, Select, Space, Table, UploadFile } from "antd";
import type { ColumnsType } from "antd/es/table";
import TextArea from "antd/lib/input/TextArea";
import Dragger from "antd/lib/upload/Dragger";
import Upload from "antd/lib/upload/Upload";
import { on } from "events";
import moment from "moment";

import { delColumnApi, getAuthorListApi,getColumnListApi, updateColumnApi,uploadCoverApi } from "@/api/modules/column";
import { ContentInterWrap, ContentWrap } from "@/components/common-wrap";
import { initPagination, IPagination, UpdateEnum } from "@/enums/common";
import { MapItem } from "@/typings/common";
import { getCompleteUrl } from "@/utils/is";
import Search from "./components/search";

import "./index.scss";

const { RangePicker } = DatePicker;
const { Option } = Select;

interface DataType {
	key: string;
	name: string;
	age: number;
	address: string;
	tags: string[];
}

interface IProps {}

export interface IFormType {
	columnId: number; // 为0时，是保存，非0是更新
	column: string; // 教程名
	author: number; // 作者ID
	introduction: string; // 简介
	cover: string; // 封面 URL
	type: number; // 类型 限时免费 2 登录阅读 1 免费 0
	nums: number; // 连载数量
	freeEndTime: string; // 限时免费开始时间
	freeStartTime: string; // 限时免费结束时间
	state: number; // 状态
	section: number; // 排序
}

const defaultInitForm: IFormType = {
	columnId: -1,
	column: "",
	author: -1,
	introduction: "",
	cover: "",
	type: -1,
	nums: -1,
	freeEndTime: "",
	freeStartTime: "",
	state: -1,
	section: -1
};

// 查询表单接口，定义类型
interface ISearchForm {
	column: string;
}

// 查询表单默认值
const defaultSearchForm = {
	column: "",
};

const Column: FC<IProps> = props => {
	// 用户填值的 Form 表单，有些格式可能和后端不一样，需要转换
	const [formRef] = Form.useForm();
	// form值，临时保存一些值
	const [form, setForm] = useState<IFormType>(defaultInitForm);
	// 表格查询表单
	const [searchForm, setSearchForm] = useState<ISearchForm>(defaultSearchForm);
	// 触发表格的搜索
	const [search, setSearch] = useState<ISearchForm>(defaultSearchForm);
	// 作者列表的查询条件
	const [authorSearchKey, setAuthorSearchKey] = useState<string>("");
	// 触发作者列表的搜索，查询条件为作者名
	const [authorSearch, setAuthorSearch] = useState<string>("");
	// 抽屉
	const [isOpenDrawerShow, setIsOpenDrawerShow] = useState<boolean>(false);
	// 详情抽屉
	const [isDetailDrawerShow, setIsDetailDrawerShow] = useState<boolean>(false);
	// 列表数据
	const [tableData, setTableData] = useState<DataType[]>([]);
	// 刷新函数
	const [query, setQuery] = useState<number>(0);

	//当前的状态，用于新增还是更新，新增的时候不传递 id，更新的时候传递 id
	const [status, setStatus] = useState<UpdateEnum>(UpdateEnum.Save);

	// 分页
	const [pagination, setPagination] = useState<IPagination>(initPagination);
	const { current, pageSize } = pagination;
	// 声明一个 coverList
	const [coverList, setCoverList] = useState<UploadFile[]>([]);
	// authorList，从后台返回作者列表
	const [authorList, setAuthorList] = useState<MapItem[]>([]);

	// @ts-ignore
	const { ColumnStatus, ColumnStatusList, ColumnType, ColumnTypeList } = props || {};

	const { columnId, column, introduction, cover, authorName,authorAvatar, state, section, type, nums, freeEndTime, freeStartTime } = form;

	const detailInfo = [
		{ label: "教程名", title: column },
		{ label: "简介", title: introduction },
		{ label: "连载数量", title: nums },
		{ label: "类型", title: ColumnType[type] },
		{ label: "开始时间", title: moment(freeStartTime).format("YYYY-MM-DD HH:mm:ss") },
		{ label: "结束时间", title: moment(freeEndTime).format("YYYY-MM-DD HH:mm:ss") },
		{ label: "状态", title: ColumnStatus[state] },
		{ label: "排序", title: section }
	].map(({ label, title }) => ({ label, title: title || "-" }));
	
	const paginationInfo = {
		showSizeChanger: true,
		showTotal: total => `共 ${total || 0} 条`,
		...pagination,
		onChange: (current, pageSize) => {
			setPagination({ current, pageSize });
		}
	};

	const onSure = useCallback(() => {
		setQuery(prev => prev + 1);
	}, []);

	/**
	 * 在这个 handleChange 函数中，你正在尝试更新 form 状态，
	 * 并打印更新之前和之后的 form 状态。
	 * 然而，你可能会发现更新之后打印的 form 状态并没有改变，
	 * 这是因为 setState 是一个异步操作。
	 * 当你调用 setForm 函数更新状态后，React 会将这个更新任务放入队列中，
	 * 然后在未来的某个时间点执行。
	 * 这意味着在调用 setForm 之后立即打印 form，你将看到的是旧的状态。
	 * 
	 * @param item
	 * @returns
	 */
	const handleChange = (item: MapItem) => {
		console.log("handleChange setform before", item);
		setForm({ ...form, ...item });
		console.log("handleChange setform after", form);
	};

	// 作者列表查询条件变化
	const handleAuthorSearchChange = (value: string) => {
		console.log("作者列表查询条件变化", value);
		setAuthorSearchKey(value);
	};

	// 查询表单值改变
	const handleSearchChange = (item: MapItem) => {
		// 当 status 的值为 -1 时，重新显示
		setSearchForm({ ...searchForm, ...item });
		console.log("查询条件变化了",searchForm);
	};

	// 删除
	const handleDel = (columnId: number) => {
		Modal.warning({
			title: "确认删除此教程吗",
			content: "删除此教程后无法恢复，请谨慎操作！",
			maskClosable: true,
			closable: true,
			onOk: async () => {
				// @ts-ignore
				const { status } = await delColumnApi(columnId);
				const { code } = status || {};
				if (code === 0) {
					message.success("删除成功");
					setPagination({ current: 1, pageSize });
					onSure();
				}
			}
		});
	};

	// 当点击查询按钮的时候触发
	const handleSearch = () => {
		// 目前是根据文章标题搜索，后面需要加上其他条件
		console.log("查询条件", searchForm);
		setSearch(searchForm);
	};

	// 编辑或者新增时提交数据到服务器端
	const handleSubmit = async () => {
		try {
			// 从formRef中获取数据，用户填上去可以直接提交的数据
			const values = await formRef.validateFields();
			// 又从form中获取数据，需要转换格式的数据
			const { freeStartTime, freeEndTime, cover, author } = form;
			console.log("handleSubmit 时看看form的值", form);

			// 如果 cover 为空，提示用户上传封面
			if (!cover) {
				message.error("请上传封面");
				return;
			}

			// 新的值传递到后端
			const newValues = {
				...values,
				cover: cover || "",
				// author 转换为数字
				author: Number(author) || "",
				columnId: status === UpdateEnum.Save ? UpdateEnum.Save : columnId,
				freeStartTime: moment(freeStartTime).valueOf() || "",
				freeEndTime: moment(freeEndTime).valueOf() || ""
			};
			console.log("submit 之前的所有值:", newValues);
			// @ts-ignore 调用后端的 API
			const { status: successStatus } = (await updateColumnApi(newValues)) || {};
			const { code } = successStatus || {};
			if (code === 0) {
				setIsOpenDrawerShow(false);
				onSure();
			}
		} catch (errorInfo) {
			console.log("Failed:", errorInfo);
		}
	};

	const customCoverUpload = async (options: any) => {
		const { onSuccess, onProgress, onError, file } = options;
		console.log("上传图片", options);
		// 限制图片大小，不超过 5M
		if (file.size > 5 * 1024 * 1024) {
			onError("图片大小不能超过 5M");
			return;
		}

		const formData = new FormData();
		formData.append("image", file);

		const { status, result } = await uploadCoverApi(formData);
		const { code, msg } = status || {};
		const { imagePath } = result || {};
		console.log("上传图片",status, result, code, msg, imagePath);

		if (code === 0) {
			console.log("上传图片成功，回调 onsuccess", imagePath);
			onSuccess(imagePath);
		} else {
			onError("上传失败");
		}
	};

	// 列表数据请求
	useEffect(() => {
		const getSortList = async () => {
			// @ts-ignore
			const { status, result } = await getColumnListApi({ 
				pageNumber: current, 
				pageSize,
				...searchForm
			});
			const { code } = status || {};
			const { list, pageNum, pageSize: resPageSize, pageTotal, total } = result || {};
			setPagination({ current: pageNum, pageSize: resPageSize, total });
			if (code === 0) {
				const newList = list.map((item: MapItem) => ({ ...item, key: item?.categoryId }));
				setTableData(newList);
			}
		};
		getSortList();
	}, [query, current, pageSize, search]);

	// 获取作者列表
	useEffect(() => {
		const getAuthorList = async () => {
			// @ts-ignore
			const { status, result } = await getAuthorListApi(authorSearchKey);
			const { code } = status || {};
			const { items } = result || {};
			if (code === 0) {
				const newList = items.map((item: MapItem) => ({ ...item, key: item?.userId }));
				setAuthorList(newList);
			}
		};
		getAuthorList();
	}, [authorSearch]);

	// 表头设置
	const columns: ColumnsType<DataType> = [
		{
			title: "封面",
			dataIndex: "cover",
			key: "cover",
			width: 100,
			render(value) {
				const coverUrl = getCompleteUrl(value);
				return <div>
						<Image
							className="cover"
							src={coverUrl}
						/>
					</div>
			}
		},
		{
			title: "教程名",
			dataIndex: "column",
			key: "column",
			render(value, item) {
				const baseUrl = import.meta.env.VITE_APP_BASE_URL;
				return (
					<a 
						href={`${baseUrl}/column/${item?.columnId}/1`}
						className="cell-text"
						target="_blank" rel="noreferrer">
						{value}
					</a>
				);
			}
		},
		
		{
			title: "作者",
			dataIndex: "authorName",
			key: "authorName",
			render(value) {
				return <>
					<Avatar style={{ backgroundColor: '#87d068' }} size="large">
						{value.slice(0, 3)}
					</Avatar>
				</>;
			}
		},
		{
			title: "类型",
			dataIndex: "type",
			key: "type",
			render(type) {
				return ColumnType[type];
			}
		},
		{
			title: "状态",
			dataIndex: "state",
			key: "state",
			render(state) {
				return ColumnStatus[state];
			}
		},
		{
			title: "数量",
			dataIndex: "nums",
			key: "nums"
		},
		{
			title: "排序",
			dataIndex: "section",
			key: "section"
		},
		{
			title: "操作",
			key: "key",
			width: 300,
			render: (_, item) => {
				// @ts-ignore
				const { columnId, state } = item;
				
				return (
					<div className="operation-btn">
						<Button
							type="primary"
							icon={<EyeOutlined />}
							style={{ marginRight: "10px" }}
							onClick={() => {
								setIsDetailDrawerShow(true);
								setStatus(UpdateEnum.Edit);
								// 把行的值赋给 form，这样详情的时候就可以展示了
								handleChange({ ...item });
							}}
							>
							详情
						</Button>
						<Button
							type="primary"
							icon={<EditOutlined />}
							style={{ marginRight: "10px" }}
							onClick={() => {
								// 打开抽屉
								setIsOpenDrawerShow(true);
								// 设置为更新的状态
								setStatus(UpdateEnum.Edit);
								console.log("item", item);

								// 从列表中获取数据，需要转换一下时间格式
								const { freeEndTime, freeStartTime, type, cover } = item;
								const newFreeStartTime = moment(freeStartTime);
								const newFreeEndTime = moment(freeEndTime);

								// 此时不能直接从 form 中取出来，所以我们从 item 中取出来了。
								let coverUrl = getCompleteUrl(cover);
								
								// 需要把 cover 放到 coverList 中，默认显示
								setCoverList([{ uid: "-1", name: "封面图(建议110px*156px)", status: "done", thumbUrl: coverUrl, url: coverUrl }]);
								console.log("coverList", coverList);

								// 设置form的值，主要是时间格式的转换，以及 type
								// 等于说把行的值全部放到 form 中
								handleChange({ ...item, type: String(type), freeEndTime: newFreeEndTime, freeStartTime: newFreeStartTime });

								// formRef 为转换格式后的值
								formRef.setFieldsValue({
									...item,
									state: String(state),
									type: String(type),
									freeEndTime: newFreeEndTime,
									freeStartTime: newFreeStartTime
								});
							}}
						>
							编辑
						</Button>
						<Button type="primary" danger icon={<DeleteOutlined />} onClick={() => handleDel(columnId)}>
							删除
						</Button>
					</div>
				);
			}
		}
	];

	// 编辑表单
	const reviseModalContent = (
		<Form name="basic" form={formRef} labelCol={{ span: 4 }} wrapperCol={{ span: 16 }} autoComplete="off">
			<Form.Item label="教程名" name="column" rules={[{ required: true, message: "请输入教程名!" }]}>
				<Input
					allowClear
					onChange={e => {
						handleChange({ column: e.target.value });
					}}
				/>
			</Form.Item>
			<Form.Item label="简介" name="introduction" rules={[{ required: true, message: "请输入简介!" }]}>
				<TextArea
					allowClear
					// 行数
					rows={3}
					onChange={e => {
						handleChange({ introduction: e.target.value });
					}}
				/>
			</Form.Item>
			<Form.Item label="封面" name="cover" rules={[{ required: true, message: "请上传封面!" }]}>
				<Upload
					customRequest={customCoverUpload}
					multiple={false}
					listType="picture"
					maxCount={1}
					defaultFileList={[...coverList]}
					accept="image/*"
					onRemove={() => {
						console.log("删除封面");
						// 删除封面的时候，清空 cover
						handleChange({ cover: "" });
						// 清空 coverList
						setCoverList([]);
					}}
					onChange={info => {
						// clear 的时候记得清空 cover
						// submit 的时候要判断 cover 是否为空，空的话提示用户上传
						const { status, name, response } = info.file;
						console.log("上传封面 onchange info", status, name, response);

						if (status !== 'uploading') {
							console.log("上传封面 onchange !uploading");
						}
						if (status === 'done') {
							// 把 data 的值赋给 form 的 cover，传递给后端
							handleChange({ cover: response });
							const coverUrl = getCompleteUrl(response);
							// 更新 coverList
							setCoverList([{ 
								uid: "-1", 
								name: "封面图(建议110px*156px)", 
								status: "done", 
								thumbUrl: coverUrl, 
								url: coverUrl
							}]);
							message.success(`${name} 封面上传成功.`);
						} else if (status === 'error') {
							message.error(`封面上传失败，原因：${info.file.error}`);
						}
					}}
				>
					<Button icon={<UploadOutlined />}>Upload</Button>
				</Upload>
			</Form.Item>
			<Form.Item label="作者" name="authorName" rules={[{ required: true, message: "请选择作者!" }]}>
				{/* 使用 select 选择器实现一个可以查找的作者列表供选择 */}
				<Select
					// value 会从 item 中的 name 中取出来，所以这里不需要设置
					placeholder="请选择作者"
					size="large"
					onChange={(value, option) => {
						// 需要把作者 ID 传递给后端
						console.log("选择的作者", option);
						console.log("选择的作者 value", value);
						// 取出 key
						const { key } = option || {};
						handleChange({ author: key });
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
									<Input
										placeholder="请输入你想要查找的作者名"
										allowClear
										style={{ flex: "auto" }}
										onChange={e => {
											handleAuthorSearchChange(e.target.value);
										}}
									/>
									<Button
										type="primary"
										style={{ marginLeft: 8 }}
										// 触发搜索authorSearch
										onClick={() => {
											setAuthorSearch(authorSearchKey);
										}}
									>
										筛选
									</Button>
								</div>
								{/* 添加一个分割线 */}
								<Divider style={{ margin: "4px 0" }} />
								{menu}
							</div>
						);
					}}
					// 下拉框展开时触发
					onDropdownVisibleChange={() => {
						console.log("下拉框展开")
					}}
				>
					{authorList.map(item => {
						return (
							// 如果当前Option key = 作者 ID，那么就选中这个 Option
							<Option
								key={item.userId} 
								value={item.name}
								>
								{/* 作者头像和作者名字 */}
								<img src={item.avatar} alt="avatar" className="avatar" />
								{item.name}
							</Option>
						);
					})}
				</Select>
			</Form.Item>
			<Form.Item label="状态" name="state" rules={[{ required: true, message: "请选择状态!" }]}>
				<Select
					allowClear
					onChange={value => {
						handleChange({ state: value });
					}}
					options={ColumnStatusList}
				/>
			</Form.Item>
			<Form.Item label="连载数量" name="nums" rules={[{ required: true, message: "请选择连载数量!" }]}>
				<Input
					type="number"
					allowClear
					onChange={e => {
						handleChange({ nums: e.target.value });
					}}
				/>
			</Form.Item>
			<Form.Item label="类型" name="type" rules={[{ required: true, message: "请选择类型!" }]}>
				<Select
					allowClear
					onChange={value => {
						handleChange({ type: value });
					}}
					options={ColumnTypeList}
				/>
			</Form.Item>
			<Form.Item label="开始时间" name="freeStartTime" rules={[{ required: false, message: "请选择开始时间!" }]}>
				<DatePicker
					onChange={e => {
						const freeStartTime = moment(e).valueOf();
						handleChange({ freeStartTime: freeStartTime });
					}}
				/>
			</Form.Item>
			<Form.Item label="结束时间" name="freeEndTime" rules={[{ required: false, message: "请选择结束时间!" }]}>
				<DatePicker
					onChange={e => {
						const freeEndTime = moment(e).valueOf();
						handleChange({ freeEndTime });
					}}
				/>
			</Form.Item>
			
			<Form.Item label="排序" name="section" rules={[{ required: true, message: "请输入排序" }]}>
				<Input
					type="number"
					allowClear
					onChange={e => {
						handleChange({ section: e.target.value });
					}}
				/>
			</Form.Item>
		</Form>
	);

	return (
		<div className="Column">
			<ContentWrap>
				{/* 搜索 */}
				<ContentInterWrap className="sort-search__wrap">
					<div className="sort-search__search">
						<div className="sort-search__search-item">
							<span className="sort-search-label">教程名称</span>
							<Input onChange={e => handleSearchChange({ column: e.target.value })} style={{ width: 252 }} />
						</div>
					</div>
					<Button 
							type="primary" 
							icon={<SearchOutlined />}
							style={{ marginRight: "10px" }}
							onClick={() => {handleSearch}}
							>
							搜索
						</Button>
				</ContentInterWrap>
				{/* 表格 */}
				<ContentInterWrap>
					<Table columns={columns} dataSource={tableData} pagination={paginationInfo} rowKey="columnId" />
				</ContentInterWrap>
			</ContentWrap>

			{/* 抽屉 */}
			<Drawer 
				title="详情" 
				placement="right" 
				onClose={() => setIsDetailDrawerShow(false)} 
				open={isDetailDrawerShow}>
				<Descriptions column={1} labelStyle={{ width: "100px" }}>
				<Descriptions.Item label="作者头像">
						<Avatar 
							size={{ xs: 24, sm: 32, md: 40, lg: 64, xl: 80, xxl: 100 }}
						 	src={getCompleteUrl(authorAvatar)} 
						/>
					</Descriptions.Item>
					<Descriptions.Item label="教程封面">
						<Image src={getCompleteUrl(cover)} />
					</Descriptions.Item>
					{detailInfo.map(({ label, title }) => (
						<Descriptions.Item label={label} key={label}>
							{title !== 0 ? title || "-" : 0}
						</Descriptions.Item>
					))}
				</Descriptions>
			</Drawer>

			{/* 把弹窗修改为抽屉 */}
			<Drawer 
				title="添加/修改" 
				placement="right" 
				size="large"
				extra={
          <Space>
            <Button onClick={() => setIsOpenDrawerShow(false)}>取消</Button>
            <Button type="primary" onClick={handleSubmit}>
              OK
            </Button>
          </Space>
        }
				onClose={() => setIsOpenDrawerShow(false)} 
				open={isOpenDrawerShow}>
				{reviseModalContent}
			</Drawer>
		</div>
	);
};

const mapStateToProps = (state: any) => state.disc.disc;
const mapDispatchToProps = {};
export default connect(mapStateToProps, mapDispatchToProps)(Column);

