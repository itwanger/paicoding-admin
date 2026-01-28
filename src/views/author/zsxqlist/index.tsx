/* eslint-disable prettier/prettier */
import { FC, useCallback, useEffect, useState } from "react";
import { connect } from "react-redux";
import { DeleteOutlined, EditOutlined, UndoOutlined } from "@ant-design/icons";
import { Avatar, Badge, Button, DatePicker, Form, Input, message, Modal, RadioChangeEvent, Select, Table, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import { getZsxqWhiteListApi, operateBatchZsxqWhiteApi, operateZsxqWhiteApi, resetAuthorWhiteApi, updateZsxqWhiteApi } from "@/api/modules/author";
import { ContentInterWrap, ContentWrap } from "@/components/common-wrap";
import { initPagination, IPagination } from "@/enums/common";
import { MapItem } from "@/typings/common";
import { baseDomain } from "@/utils/util";
import Search from "./components/search";

import "./index.scss";

interface DataType {
	id: number;
	userId: number;
	name: string;
	avatar: string;
	userCode: string;
	starNumber: string;
	inviteCode: string;
	inviteNum: number;
	state: number;
	expireTime: string | null; // 后台返回的是Date类型,前端接收为字符串
	lastLoginTime: string | null; // 上次登录时间
	loginType: number; // 登录类型
}

interface IProps {}

// 查询表单接口，定义类型
interface ISearchForm {
	starNumber: string;
	name: string;
	state: number;
	userCode: string;
	starNumberNotEmpty?: boolean; // 星球编号不为空
	lastLoginWithinWeek?: boolean; // 最近一周有登录
}

// 编辑表单接口，定义类型
interface IInitForm {
	id: number;
	name: string;
	starNumber: string;
	state: number;
	expireTime: string | null; // 表单中也使用字符串格式
	userCode: string;
}

// 编辑表单默认值
const defaultInitForm = {
	id: -1,
	name: "",
	starNumber: "",
	state: -1,
	expireTime: null,
	userCode: ""
};

// 查询表单默认值
const defaultSearchForm = {
	starNumber: "",
	name: "",
	userCode: "",
	state: -1,
	starNumberNotEmpty: false,
	lastLoginWithinWeek: false
};

const Zsxqlist: FC<IProps> = props => {
	const [formRef] = Form.useForm();
	// 编辑表单
	const [form, setForm] = useState<IInitForm>(defaultInitForm);
	// 查询表单
	const [searchForm, setSearchForm] = useState<ISearchForm>(defaultSearchForm);
	// 弹窗
	const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
	// 列表数据
	const [tableData, setTableData] = useState<DataType[]>([]);
	// 刷新函数
	const [query, setQuery] = useState<number>(0);

	const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

	const [radioValue, setRadioValue] = useState(-1); // 默认值

	// 分页
	const [pagination, setPagination] = useState<IPagination>(initPagination);
	const { current, pageSize } = pagination;

	const paginationInfo = {
		showSizeChanger: true,
		showTotal: (total: number) => `共 ${total || 0} 条`,
		...pagination,
		onChange: (current: number, pageSize: number) => {
			setPagination({ current, pageSize });
		}
	};

	// 一些配置项，从字典里取出来
	//@ts-ignore
	const { UserAIStatList, UserAiStrategy, UserAiStrategyList, LoginType, LoginTypeList } = props || {};
	console.log("UserAiStrategyList", UserAiStrategyList, LoginTypeList);

	// 格式化日期函数，将Long型时间戳转换为年月日格式
	const formatDate = (dateString: string | null): string => {
		if (!dateString) return '-';
		// 如果后台返回的是Date字符串格式，直接格式化显示
		const date = new Date(dateString);
		return date.toLocaleDateString('zh-CN', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		});
	};

	const colorStrategys = ["#f50", "#2db7f5", "#87d068", "#108ee9"];
	const colorLoginTypes = ["#1890ff", "#7265e6"];
	//@ts-ignore
	const colorStrategyMap = UserAiStrategyList.reduce((acc, strategy, index) => {
    acc[strategy.value] = colorStrategys[index % colorStrategys.length];
    return acc;
	}, {} as { [key: string]: string });
	//@ts-ignore
	const colorLoginTypeMap = LoginTypeList.reduce((acc, loginType, index) => {
    acc[loginType.value] = colorLoginTypes[index % colorLoginTypes.length];
    return acc;
	}, {} as { [key: string]: string });

	const { id } = form;

	const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
		console.log("selectedRowKeys changed: ", newSelectedRowKeys);
		// 如果新选中的数据和之前的数据不同，则设置单选按钮的选中状态
		if (newSelectedRowKeys.length !== selectedRowKeys.length) {
			setRadioValue(-1);
		} else {
			// 长度相等的时候，判断是否相等
			const isSame = newSelectedRowKeys.every((item, index) => item === selectedRowKeys[index]);
			if (isSame) {
				// 如果相等，则不处理
			} else {
				setRadioValue(-1);
			}
		}
		setSelectedRowKeys(newSelectedRowKeys);
	};

	const rowSelection = {
		selectedRowKeys,
		onChange: onSelectChange
	};

	const onSure = useCallback(() => {
		setQuery(prev => prev + 1);
	}, []);

	// 编辑表单值改变
	const handleChange = (item: MapItem) => {
		setForm({ ...form, ...item });
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
		// 查询的时候重置分页
		setPagination({ current: 1, pageSize });
		// 重新请求数据
		onSure();
	};

	// 改变状态的操作
	const handleStatusChange = async (id: number, status: number) => {
		// 将 id 和 status 作为参数传递给 operateZsxqWhiteApi
		const newValues = { id, status };
		const { status: successStatus } = (await operateZsxqWhiteApi(newValues)) || {};
		const { code, msg } = successStatus || {};
		if (code === 0) {
			message.success("状态操作成功");
			console.log("code", code);
			onSure();
		} else {
			message.error(msg || "状态操作失败");
		}
	};

	// 批量改变状态的操作
	const handleBatchStatusChange = (e: RadioChangeEvent) => {
		const { value } = e.target;
		console.log("全部通过还是全部拒绝 checked", value);

		const newValues = { ids: selectedRowKeys, status: value };
		console.log("批量操作的 newValues", newValues);

		// 判断 ids 是否为空
		if (selectedRowKeys.length === 0) {
			message.error("请选择要操作的数据");
			return;
		}

		// 加一个确认对话框
		Modal.confirm({
			title: "确认",
			content: "确认要批量操作吗？",
			okText: "确认",
			cancelText: "取消",
			onOk: async () => {
				// 将 ids 和 status 作为参数传递给 operateZsxqWhiteApi
				const { status: successStatus } = (await operateBatchZsxqWhiteApi(newValues)) || {};
				const { code, msg } = successStatus || {};
				if (code === 0) {
					message.success("批量状态操作成功");
					console.log("code", code);
					onSure();
					// 设置单选按钮的值
					setRadioValue(value);
				} else {
					message.error(msg || "批量状态操作失败");
				}
			},
			onCancel: () => {
				console.log("取消");
				// 单选按钮恢复到默认状态
			}
		});
	};

	// 重置
	const handleReset = (zsxqAId: number) => {
		Modal.warning({
			title: "确认重置此星球用户吗",
			content: "重置此星球用户后无法恢复，请谨慎操作！",
			maskClosable: true,
			closable: true,
			onOk: async () => {
				const { status } = await resetAuthorWhiteApi(zsxqAId);
				const { code, msg } = status || {};
				console.log();
				if (code === 0) {
					message.success("重置成功");
					onSure();
				} else {
					message.error(msg);
				}
			}
		});
	};

	const handleSubmit = async () => {
		const values = await formRef.validateFields();
		const newValues = { ...values, id };
		console.log("编辑 时提交的 newValues:", newValues);

		const { status: successStatus } = (await updateZsxqWhiteApi(newValues)) || {};
		const { code, msg } = successStatus || {};
		if (code === 0) {
			message.success("编辑成功");
			setIsModalOpen(false);
			onSure();
		} else {
			message.error(msg || "编辑失败");
		}
	};

	// 数据请求，这是一个钩子，query, current, pageSize, search 有变化的时候就会自动触发
	useEffect(() => {
		const getSortList = async () => {
			const { status, result } = await getZsxqWhiteListApi({
				pageNumber: current,
				pageSize,
				...searchForm
			});
			const { code } = status || {};
			//@ts-ignore
			const { list, pageNum, pageSize: resPageSize, total } = result || {};
			setPagination({ current: Number(pageNum), pageSize: resPageSize, total });
			if (code === 0) {
				const newList = list.map((item: MapItem) => ({ ...item, key: item?.id }));
				setTableData(newList);
			}
		};
		getSortList();
	}, [query, current, pageSize]);

	// 表头设置
	const columns: ColumnsType<DataType> = [
		{
			title: "用户登录名",
			dataIndex: "userCode",
			key: "userCode",
			width: 110,
			render(value, item) {
				return (
					<a href={`${baseDomain}/user/home?userId=${item?.userId}`} className="cell-text" target="_blank" rel="noreferrer">
						{value}
					</a>
				);
			}
		},
		{
			title: "星球编号",
			width: 80,
			dataIndex: "starNumber",
			key: "starNumber"
		},
		{
			title: "用户头像",
			dataIndex: "avatar",
			key: "avatar",
			width: 80,
			render(value) {
				return (
					<>
						<Avatar src={value} />
					</>
				);
			}
		},
		{
			title: "用户昵称",
			dataIndex: "name",
			width: 120,
			key: "name",
		},
		{
			title: "注册类型",
			dataIndex: "loginType",
			key: "loginType",
			width: 110,
			render(value) {
				return (
					<>
						<Avatar style={{ backgroundColor: colorLoginTypeMap[value], color: "#fff" }} size={50} gap={1}>
							{LoginType[value]?.slice(0, 5) || ''}
						</Avatar>
					</>
				);
			}
		},
		{
			title: "过期时间",
			dataIndex: "expireTime",
			key: "expireTime",
			width: 110,
			render(value) {
				return (
					<span>{formatDate(value)}</span>
				);
			}
		},
		{
			title: "邀请人数",
			dataIndex: "inviteNum",
			key: "inviteNum",
			width: 80,
			render(value) {
				return (
					<>
						<Badge count={value} showZero color="#faad14" />
					</>
				);
			}
		},
		{
			title: "上次登录日期",
			dataIndex: "lastLoginTime",
			key: "lastLoginTime",
			width: 110,
			render(value) {
				return (
					<span>{formatDate(value)}</span>
				);
			}
		},
		{
			title: "状态",
			dataIndex: "state",
			key: "state",
			width: 130,
			render(_, item) {
				const { id, state } = item;
				return (
					<Select
						// 宽度
						style={{ width: "100%" }}
						// 如果 status 为 1 那么 status 为 warning
						status={state === 2 ? "" : "error"}
						value={state.toString()}
						options={UserAIStatList}
						onChange={value => handleStatusChange(id, Number(value))}
					></Select>
				);
			}
		},
		{
			title: "操作",
			key: "key",
			width: 120,
			render: (_, item) => {
				// 从 item 中取出 articleId
				const { id } = item;
				return (
					<div className="operation-btn">
						<Tooltip title="编辑">
							<Button
								type="primary"
								icon={<EditOutlined />}
								style={{ marginRight: "10px" }}
								onClick={() => {
									setIsModalOpen(true);
									handleChange({ ...item });
									const formData = {
										...item,
										expireTime: item.expireTime ? dayjs(item.expireTime) : null
									};
									formRef.setFieldsValue(formData);
									console.log("formRef item", formRef.getFieldsValue());
								}}
							>
							</Button>
						</Tooltip>
						<Tooltip title="重置">
							<Button type="primary" danger icon={<UndoOutlined />} onClick={() => handleReset(id)}>
							</Button>
						</Tooltip>
					</div>
				);
			}
		}
	];

	// 编辑表单
	const reviseModalContent = (
		<Form name="basic" form={formRef} labelCol={{ span: 4 }} wrapperCol={{ span: 16 }} autoComplete="off">
			<Form.Item label="用户昵称" name="name" rules={[{ required: false, message: "请输入用户昵称!" }]}>
				<Input
					allowClear
					onChange={e => {
						handleChange({ name: e.target.value });
					}}
				/>
			</Form.Item>
			<Form.Item label="用户登录名" name="userCode" rules={[{ required: false, message: "请输入用户登录名!" }]}>
				<Input
					allowClear
					onChange={e => {
						handleChange({ userCode: e.target.value });
					}}
				/>
			</Form.Item>
			<Form.Item label="星球编号" name="starNumber" rules={[{ required: false, message: "请输入星球编号!" }]}>
				<Input
					allowClear
					onChange={e => {
						handleChange({ starNumber: e.target.value });
					}}
				/>
			</Form.Item>
			<Form.Item label="过期时间" name="expireTime" rules={[{ required: false, message: "请选择过期时间!" }]}>
				<DatePicker
					style={{ width: "100%" }}
					placeholder="选择过期时间"
					onChange={(date, dateString) => {
						handleChange({ expireTime: dateString || null });
					}}
				/>
			</Form.Item>
		</Form>
	);

	return (
		<div className="article zsxq-list-page">
			<ContentWrap style={{ overflowX: 'hidden', maxWidth: '100%' }}>
				{/* 搜索 */}
				<Search
					handleSearchChange={handleSearchChange}
					handleSearch={handleSearch}
					UserAIStatList={UserAIStatList}
					handleBatchStatusChange={handleBatchStatusChange}
					radioValue={radioValue}
				/>
				{/* 表格 - 桌面端 */}
				<ContentInterWrap className="desktop-table">
					<Table rowSelection={rowSelection} columns={columns} dataSource={tableData} pagination={paginationInfo} />
				</ContentInterWrap>
				{/* 卡片列表 - 移动端 */}
				<div className="mobile-card-list">
					{tableData.map((item) => (
						<div key={item.id} className="user-card">
							<div className="card-header">
								<Avatar src={item.avatar} size={48} />
								<div className="user-info">
									<div className="user-name">{item.name}</div>
									<a href={`${baseDomain}/user/home?userId=${item?.userId}`} className="user-code" target="_blank" rel="noreferrer">
										{item.userCode}
									</a>
								</div>
								<div className="user-status">
									<Select
										size="small"
										status={item.state === 2 ? "" : "error"}
										value={item.state.toString()}
										options={UserAIStatList}
										onChange={value => handleStatusChange(item.id, Number(value))}
										style={{ width: 100 }}
									></Select>
								</div>
							</div>
							<div className="card-body">
								<div className="info-row">
									<span className="label">星球编号:</span>
									<span className="value">{item.starNumber || '-'}</span>
								</div>
								<div className="info-row">
									<span className="label">注册类型:</span>
									<span className="value">
										<Avatar style={{ backgroundColor: colorLoginTypeMap[item.loginType], color: "#fff" }} size={40} gap={1}>
											{LoginType[item.loginType]?.slice(0, 5) || ''}
										</Avatar>
									</span>
								</div>
								<div className="info-row">
									<span className="label">过期时间:</span>
									<span className="value">{formatDate(item.expireTime)}</span>
								</div>
								<div className="info-row">
									<span className="label">邀请人数:</span>
									<span className="value">
										<Badge count={item.inviteNum} showZero color="#faad14" />
									</span>
								</div>
								<div className="info-row">
									<span className="label">上次登录:</span>
									<span className="value">{formatDate(item.lastLoginTime)}</span>
								</div>
							</div>
							<div className="card-footer">
								<Button
									type="primary"
									icon={<EditOutlined />}
									size="small"
									onClick={() => {
										setIsModalOpen(true);
										handleChange({ ...item });
										const formData = {
											...item,
											expireTime: item.expireTime ? dayjs(item.expireTime) : null
										};
										formRef.setFieldsValue(formData);
									}}
								>
									编辑
								</Button>
								<Button type="primary" danger icon={<UndoOutlined />} size="small" onClick={() => handleReset(item.id)}>
									重置
								</Button>
							</div>
						</div>
					))}
					{/* 移动端分页 */}
					{tableData.length > 0 && (
						<div className="mobile-pagination">
							<div className="pagination-info">
								共 {pagination.total || 0} 条
							</div>
							<div className="pagination-controls">
								<Button 
									size="small" 
									disabled={current === 1}
									onClick={() => setPagination({ ...pagination, current: current - 1 })}
								>
									上一页
								</Button>
								<span className="current-page">{current} / {Math.ceil((pagination.total || 0) / pageSize)}</span>
								<Button 
									size="small"
									disabled={current >= Math.ceil((pagination.total || 0) / pageSize)}
									onClick={() => setPagination({ ...pagination, current: current + 1 })}
								>
									下一页
								</Button>
							</div>
						</div>
					)}
				</div>
			</ContentWrap>
			{/* 弹窗 */}
			<Modal title="修改" visible={isModalOpen} onCancel={() => setIsModalOpen(false)} onOk={handleSubmit}>
				{reviseModalContent}
			</Modal>
		</div>
	);
};

const mapStateToProps = (state: any) => state.disc.disc;
const mapDispatchToProps = {};
export default connect(mapStateToProps, mapDispatchToProps)(Zsxqlist);
