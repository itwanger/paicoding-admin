import { FC, useCallback, useEffect, useState } from "react";
import { connect } from "react-redux";
import { DeleteOutlined, EditOutlined, EyeOutlined } from "@ant-design/icons";
import {
	Avatar,
	Button,
	DatePicker,
	Descriptions,
	Drawer,
	Form,
	Image,
	Input,
	InputNumber,
	message,
	Modal,
	Select,
	Space,
	Table,
	UploadFile
} from "antd";
import type { ColumnsType } from "antd/es/table";
import TextArea from "antd/lib/input/TextArea";
import dayjs, { Dayjs } from "dayjs";

import { delColumnApi, getColumnListApi, updateColumnApi } from "@/api/modules/column";
import { ContentInterWrap, ContentWrap } from "@/components/common-wrap";
import { initPagination, IPagination, UpdateEnum } from "@/enums/common";
import { MapItem } from "@/typings/common";
import { getCompleteUrl } from "@/utils/is";
import AuthorSelect from "./components/authorselect";
import ImgUpload from "./components/imgupload";
import Search from "./components/search";

import "dayjs/locale/zh-cn";
dayjs.locale("zh-cn");

import "./index.scss";

const baseUrl = import.meta.env.VITE_APP_BASE_URL;

interface DataType {
	author: number;
	columnId: number;
	state: number;
	freeEndTime: number;
	freeStartTime: number;
	type: number;
	cover: string;
	authorName: string;
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
	freeEndTime: number; // 限时免费开始时间
	freeStartTime: number; // 限时免费结束时间
	state: number; // 状态
	section: number; // 排序
	authorAvatar: string; // 作者头像
	authorName: string; // 作者名
}

const defaultInitForm: IFormType = {
	columnId: -1,
	column: "",
	author: -1,
	introduction: "",
	cover: "",
	type: -1,
	nums: -1,
	freeEndTime: -1,
	freeStartTime: -1,
	state: -1,
	section: -1,
	authorAvatar: "",
	authorName: ""
};

// 查询表单接口，定义类型
interface ISearchForm {
	column: string;
}

// 查询表单默认值
const defaultSearchForm = {
	column: ""
};

const Column: FC<IProps> = props => {
	// 用户填值的 Form 表单，有些格式可能和后端不一样，需要转换
	const [formRef] = Form.useForm();
	// form值，临时保存一些值
	const [form, setForm] = useState<IFormType>(defaultInitForm);
	// 表格查询表单
	const [searchForm, setSearchForm] = useState<ISearchForm>(defaultSearchForm);

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

	// @ts-ignore
	const { ColumnStatus, ColumnStatusList, ColumnType, ColumnTypeList } = props || {};

	const {
		columnId,
		column,
		authorName,
		introduction,
		cover,
		authorAvatar,
		state,
		section,
		type,
		nums,
		freeEndTime,
		freeStartTime
	} = form;

	// 日期默认值
	const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs().add(-7, "d"), dayjs()]);

	const dateFormat = "YYYY/MM/DD";

	const { RangePicker } = DatePicker;

	const detailInfo = [
		{ label: "教程名", title: column },
		{ label: "简介", title: introduction },
		{ label: "连载数量", title: nums },
		{ label: "类型", title: ColumnType[type] },
		{ label: "开始时间", title: dayjs(freeStartTime).format(dateFormat) },
		{ label: "结束时间", title: dayjs(freeEndTime).format(dateFormat) },
		{ label: "状态", title: ColumnStatus[state] },
		{ label: "排序", title: section }
	].map(({ label, title }) => ({ label, title: title || "-" }));

	const rangePresets: {
		label: string;
		value: [Dayjs, Dayjs];
	}[] = [
		{ label: "最近七天", value: [dayjs().add(-7, "d"), dayjs()] },
		{ label: "最近 14 天", value: [dayjs().add(-14, "d"), dayjs()] },
		{ label: "最近 30 天", value: [dayjs().add(-30, "d"), dayjs()] },
		{ label: "最近 90 天", value: [dayjs().add(-90, "d"), dayjs()] }
	];

	const paginationInfo = {
		showSizeChanger: true,
		showTotal: (total: number) => `共 ${total || 0} 条`,
		...pagination,
		onChange: (current: number, pageSize: number) => {
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
		setForm({ ...form, ...item });
		console.log("handleChange item setForm", item, form);
		// 直接从 item 中取出 freeStartTime 和 freeEndTime, state 更新是异步的
		const { freeStartTime, freeEndTime } = item;
		setDateRange([dayjs(freeStartTime), dayjs(freeEndTime)]);
		// 更新 formRef
		// 如果是时间的时候不更新
		formRef.setFieldsValue({ ...item });
	};

	// 查询表单值改变
	const handleSearchChange = (item: MapItem) => {
		// 当 status 的值为 -1 时，重新显示
		setSearchForm({ ...searchForm, ...item });
		console.log("查询条件变化了", searchForm);
	};

	// 当点击查询按钮的时候触发
	const handleSearch = () => {
		// 目前是根据文章标题搜索，后面需要加上其他条件
		console.log("查询条件", searchForm);
		onSure();
		// 查询的时候重置分页
		setPagination({ current: 1, pageSize });
	};

	// 抽屉关闭
	const handleClose = () => {
		setIsOpenDrawerShow(false);
	};

	const onRangeChange = (dates: null | (Dayjs | null)[]) => {
		// 从 dates 中取出 freeStartTime 和 freeEndTime
		let now = dayjs();
		let freeStartTime = now.valueOf();
		console.log("freeStartTime", freeStartTime);
		let freeEndTime = freeStartTime;

		if (dates) {
			// 从 dates 中取出 freeStartTime 和 freeEndTime
			freeStartTime = dates[0]?.valueOf() ?? 0;
			freeEndTime = dates[1]?.valueOf() ?? 0;
		} else {
			console.log("Clear");
			freeStartTime = now.valueOf();
			freeEndTime = freeStartTime;
		}

		// 更新到 form 中
		setForm({ ...form, freeStartTime: freeStartTime, freeEndTime: freeEndTime });
		setDateRange([dayjs(freeStartTime), dayjs(freeEndTime)]);
	};

	// 重置表单
	const resetFrom = () => {
		setForm(defaultInitForm);
		formRef.resetFields();
		setCoverList([]);
	};

	// 删除
	const handleDel = (columnId: number) => {
		Modal.warning({
			title: "确认删除此专栏吗",
			content: "删除此专栏后无法恢复，请谨慎操作！",
			maskClosable: true,
			closable: true,
			onOk: async () => {
				const { status } = await delColumnApi(columnId);
				const { code, msg } = status || {};
				if (code === 0) {
					message.success("删除成功");
					onSure();
				} else {
					message.error(msg);
				}
			}
		});
	};

	// 编辑或者新增时提交数据到服务器端
	const handleSubmit = async () => {
		// 又从form中获取数据，需要转换格式的数据
		const { freeStartTime, freeEndTime } = form;
		console.log("handleSubmit 时看看form的值", form, formRef);

		// 从formRef中获取数据，用户填上去可以直接提交的数据
		const values = await formRef.validateFields();
		console.log("handleSubmit 时看看form的值 values", values);

		// 新的值传递到后端
		const newValues = {
			...values,
			columnId: status === UpdateEnum.Save ? UpdateEnum.Save : columnId,
			freeStartTime: freeStartTime || "",
			freeEndTime: freeEndTime || ""
		};
		console.log("submit 之前的所有值:", newValues);

		const { status: successStatus } = (await updateColumnApi(newValues)) || {};
		const { code, msg } = successStatus || {};
		if (code === 0) {
			setIsOpenDrawerShow(false);
			setPagination({ current: 1, pageSize });
			message.success("提交成功");
			onSure();
		} else {
			message.error(msg || "提交失败");
		}
	};

	// 列表数据请求
	useEffect(() => {
		const getSortList = async () => {
			const { status, result } = await getColumnListApi({
				pageNumber: current,
				pageSize,
				...searchForm
			});
			const { code } = status || {};
			//@ts-ignore
			const { list, pageNum, pageSize: resPageSize, total } = result || {};
			setPagination({ current: pageNum, pageSize: resPageSize, total });
			if (code === 0) {
				const newList = list.map((item: MapItem) => ({ ...item, key: item?.columnId }));
				setTableData(newList);
			}
		};
		getSortList();
	}, [query, current, pageSize]);

	// 表头设置
	const columns: ColumnsType<DataType> = [
		{
			title: "封面",
			dataIndex: "cover",
			key: "cover",
			width: 100,
			render(value) {
				const coverUrl = getCompleteUrl(value);
				return (
					<div>
						<Image className="cover" src={coverUrl} />
					</div>
				);
			}
		},
		{
			title: "专栏名",
			dataIndex: "column",
			key: "column",
			render(value, item) {
				return (
					<a href={`${baseUrl}/column/${item?.columnId}/1`} className="cell-text" target="_blank" rel="noreferrer">
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
				return (
					<>
						<Avatar style={{ backgroundColor: "#1890ff", color: "#fff" }} size={54}>
							{value.slice(0, 4)}
						</Avatar>
					</>
				);
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
				const { columnId } = item;

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

								// 从列表中获取数据，需要转换一下时间格式
								const { cover } = item;

								// 此时不能直接从 form 中取出来，所以我们从 item 中取出来了。
								let coverUrl = getCompleteUrl(cover);
								// 需要把 cover 放到 coverList 中，默认显示
								setCoverList([
									{
										uid: "-1",
										name: "封面图(建议110px*156px)",
										status: "done",
										thumbUrl: coverUrl,
										url: coverUrl
									}
								]);

								// 设置form的值，主要是时间格式的转换，以及 type
								// 等于说把行的值全部放到 form 中
								handleChange({
									...item
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
			<Form.Item label="专栏名" name="column" rules={[{ required: true, message: "请输入专栏名!" }]}>
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
				<ImgUpload coverList={coverList} setCoverList={setCoverList} handleChange={handleChange} />
			</Form.Item>
			<Form.Item label="作者" name="author" rules={[{ required: true, message: "请选择作者!" }]}>
				<AuthorSelect authorName={authorName} handleChange={handleChange} />
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
				<InputNumber
					onChange={value => {
						handleChange({ nums: value });
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
			<Form.Item label="开始结束日期">
				<RangePicker presets={rangePresets} format={dateFormat} value={dateRange} onChange={onRangeChange} />
			</Form.Item>

			<Form.Item label="排序" name="section" rules={[{ required: true, message: "请输入排序" }]}>
				<InputNumber
					onChange={value => {
						handleChange({ section: value });
					}}
				/>
			</Form.Item>
		</Form>
	);

	return (
		<div className="Column">
			<ContentWrap>
				{/* 搜索 */}
				<Search
					handleSearch={handleSearch}
					handleSearchChange={handleSearchChange}
					setStatus={setStatus}
					setIsOpenDrawerShow={setIsOpenDrawerShow}
				/>
				{/* 表格 */}
				<ContentInterWrap>
					<Table columns={columns} dataSource={tableData} pagination={paginationInfo} rowKey="columnId" />
				</ContentInterWrap>
			</ContentWrap>

			{/* 抽屉 */}
			<Drawer title="详情" placement="right" onClose={() => setIsDetailDrawerShow(false)} open={isDetailDrawerShow}>
				<Descriptions column={1} labelStyle={{ width: "100px" }}>
					<Descriptions.Item label="头像">
						<Avatar size={{ xs: 24, sm: 32, md: 40, lg: 64, xl: 80, xxl: 100 }} src={getCompleteUrl(authorAvatar)} />
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
						<Button onClick={resetFrom}>重置</Button>
						<Button type="primary" onClick={handleSubmit}>
							OK
						</Button>
					</Space>
				}
				onClose={handleClose}
				open={isOpenDrawerShow}
			>
				{reviseModalContent}
			</Drawer>
		</div>
	);
};

const mapStateToProps = (state: any) => state.disc.disc;
const mapDispatchToProps = {};
export default connect(mapStateToProps, mapDispatchToProps)(Column);
