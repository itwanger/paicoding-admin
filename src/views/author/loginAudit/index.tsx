import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SearchOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Col, Form, Input, InputNumber, Modal, Row, Select, Space, Table, Tag, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import {
	forbidUserApi,
	getLoginAuditListApi,
	getUserShareRiskListApi,
	LoginAuditQuery,
	UserLoginAuditItem,
	UserShareRiskItem,
	unforbidUserApi
} from "@/api/modules/user";
import { ContentWrap } from "@/components/common-wrap";
import { initPagination, IPagination } from "@/enums/common";

import "./index.scss";

interface LoginAuditFilterForm {
	starNumber?: string;
	deviceId?: string;
	ip?: string;
	eventType?: string;
}

interface ShareRiskFilterForm {
	loginName?: string;
	recentDays?: number;
	minKickoutCount?: number;
	minDeviceCount?: number;
	minIpCount?: number;
}

const defaultLoginAuditFilter: LoginAuditFilterForm = {
	starNumber: "",
	deviceId: "",
	ip: "",
	eventType: undefined
};

const defaultShareRiskFilter: ShareRiskFilterForm = {
	loginName: "",
	recentDays: 7,
	minKickoutCount: 2,
	minDeviceCount: 2,
	minIpCount: 2
};

const loginAuditEventOptions = [
	{ value: "LOGIN_SUCCESS", label: "登录成功" },
	{ value: "LOGIN_FAIL", label: "登录失败" },
	{ value: "LOGOUT", label: "主动退出" },
	{ value: "SESSION_KICKOUT", label: "被踢下线" },
	{ value: "ACCOUNT_FORBID", label: "账号禁用" },
	{ value: "ACCOUNT_UNFORBID", label: "解除禁用" }
];

const riskTagTextMap: Record<string, string> = {
	NEW_DEVICE: "新设备登录",
	DEVICE_LIMIT_REPLACED: "触发设备上限，替换旧会话"
};

const reasonTextMap: Record<string, string> = {
	DEVICE_LIMIT_KICKOUT: "超过设备上限，当前会话被系统挤下线",
	USER_LOGOUT: "用户主动退出登录",
	FORCE_KICKOUT: "管理员或系统强制下线",
	ACCOUNT_SUSPENDED: "账号已被禁用，系统强制下线"
};

const getRiskTagText = (riskTag?: string) => {
	if (!riskTag) {
		return "-";
	}
	return riskTagTextMap[riskTag] || riskTag;
};

const getReasonText = (reason?: string) => {
	if (!reason) {
		return "-";
	}
	return reasonTextMap[reason] || reason;
};

const formatDateTime = (value?: string) => {
	if (!value) {
		return "-";
	}
	const time = dayjs(value);
	return time.isValid() ? time.format("YYYY-MM-DD HH:mm") : value;
};

const LoginAuditPage: FC = () => {
	const [auditFormRef] = Form.useForm<LoginAuditFilterForm>();
	const [shareRiskFormRef] = Form.useForm<ShareRiskFilterForm>();
	const [auditLoading, setAuditLoading] = useState(false);
	const [shareRiskLoading, setShareRiskLoading] = useState(false);
	const [auditFilters, setAuditFilters] = useState<LoginAuditFilterForm>(defaultLoginAuditFilter);
	const [shareRiskFilters, setShareRiskFilters] = useState<ShareRiskFilterForm>(defaultShareRiskFilter);
	const [auditPagination, setAuditPagination] = useState<IPagination>(initPagination);
	const [shareRiskPagination, setShareRiskPagination] = useState<IPagination>({ ...initPagination, pageSize: 5 });
	const [auditList, setAuditList] = useState<UserLoginAuditItem[]>([]);
	const [shareRiskList, setShareRiskList] = useState<UserShareRiskItem[]>([]);
	const [actionUserId, setActionUserId] = useState<number>();
	const auditSectionRef = useRef<HTMLDivElement | null>(null);

	const auditSummary = useMemo(() => {
		const loginSuccess = auditList.filter(item => item.eventType === "LOGIN_SUCCESS").length;
		const loginFail = auditList.filter(item => item.eventType === "LOGIN_FAIL").length;
		const kickout = auditList.filter(item => item.eventType === "SESSION_KICKOUT").length;
		return { loginSuccess, loginFail, kickout };
	}, [auditList]);

	const highRiskAccountCount = useMemo(() => shareRiskList.filter(item => item.riskLevel === "HIGH").length, [shareRiskList]);

	const auditPaginationInfo = {
		showSizeChanger: true,
		showTotal: (total: number) => `共 ${total || 0} 条`,
		...auditPagination,
		onChange: (current: number, pageSize: number) => {
			setAuditPagination({ current, pageSize });
		}
	};

	const shareRiskPaginationInfo = {
		showSizeChanger: true,
		showTotal: (total: number) => `共 ${total || 0} 个疑似账号`,
		...shareRiskPagination,
		onChange: (current: number, pageSize: number) => {
			setShareRiskPagination({ current, pageSize });
		}
	};

	const fetchLoginAudit = useCallback(async () => {
		setAuditLoading(true);
		try {
			const params: LoginAuditQuery = {
				...auditFilters,
				pageNumber: auditPagination.current,
				pageSize: auditPagination.pageSize
			};
			const { status, result } = await getLoginAuditListApi(params);
			if (status?.code !== 0) return;
			const { list = [], pageNum = auditPagination.current, pageSize = auditPagination.pageSize, total = 0 } = result || {};
			setAuditList((list as UserLoginAuditItem[]).map(item => ({ ...item, key: item.id })));
			setAuditPagination(prev => ({ ...prev, current: Number(pageNum), pageSize: Number(pageSize), total: Number(total) }));
		} finally {
			setAuditLoading(false);
		}
	}, [auditFilters, auditPagination.current, auditPagination.pageSize]);

	const fetchShareRisk = useCallback(async () => {
		setShareRiskLoading(true);
		try {
			const params = {
				...shareRiskFilters,
				pageNumber: shareRiskPagination.current,
				pageSize: shareRiskPagination.pageSize
			};
			const { status, result } = await getUserShareRiskListApi(params);
			if (status?.code !== 0) return;
			const {
				list = [],
				pageNum = shareRiskPagination.current,
				pageSize = shareRiskPagination.pageSize,
				total = 0
			} = result || {};
			setShareRiskList(
				(list as UserShareRiskItem[]).map((item, index) => ({
					...item,
					key: `${item.userId || item.loginName || "risk"}-${index}`
				}))
			);
			setShareRiskPagination(prev => ({ ...prev, current: Number(pageNum), pageSize: Number(pageSize), total: Number(total) }));
		} finally {
			setShareRiskLoading(false);
		}
	}, [shareRiskFilters, shareRiskPagination.current, shareRiskPagination.pageSize]);

	useEffect(() => {
		void fetchLoginAudit();
	}, [fetchLoginAudit]);

	useEffect(() => {
		void fetchShareRisk();
	}, [fetchShareRisk]);

	const shareRiskLevelMap: Record<string, { color: string; text: string }> = {
		HIGH: { color: "error", text: "高风险" },
		MEDIUM: { color: "warning", text: "中风险" },
		LOW: { color: "processing", text: "低风险" }
	};

	const auditColumns: ColumnsType<UserLoginAuditItem> = [
		{
			title: "时间",
			dataIndex: "createTime",
			key: "createTime",
			width: 150,
			render: value => <div className="login-audit__multiline">{formatDateTime(value)}</div>
		},
		{
			title: "星球编号",
			dataIndex: "starNumber",
			key: "starNumber",
			width: 120,
			render: (_, item) => (
				<div>
					<div className="login-audit__multiline">{item.starNumber || "-"}</div>
					<div className="login-audit__subtext">登录名: {item.loginName || "-"}</div>
				</div>
			)
		},
		{
			title: "事件",
			dataIndex: "eventTypeDesc",
			key: "eventTypeDesc",
			width: 80,
			render: (_, item) => {
				const colorMap: Record<string, string> = {
					LOGIN_SUCCESS: "success",
					LOGIN_FAIL: "error",
					LOGOUT: "default",
					SESSION_KICKOUT: "warning",
					ACCOUNT_FORBID: "error",
					ACCOUNT_UNFORBID: "success"
				};
				return <Tag color={colorMap[item.eventType || ""] || "processing"}>{item.eventTypeDesc || item.eventType || "-"}</Tag>;
			}
		},
		{
			title: "设备",
			dataIndex: "deviceName",
			key: "deviceName",
			width: 180,
			render: (_, item) => (
				<div>
					<div>{item.deviceName || "-"}</div>
					<div className="login-audit__subtext">{item.deviceId || "-"}</div>
				</div>
			)
		},
		{
			title: "IP / 地区",
			dataIndex: "ip",
			key: "ip",
			width: 120,
			render: (_, item) => (
				<div>
					<div className="login-audit__multiline">{item.ip || "-"}</div>
					<div className="login-audit__subtext">{item.region || "-"}</div>
				</div>
			)
		},
		{
			title: "风险标记",
			dataIndex: "riskTag",
			key: "riskTag",
			width: 150,
			render: value =>
				value ? (
					<Tag className="login-audit__tag" color="processing">
						{getRiskTagText(value)}
					</Tag>
				) : (
					"-"
				)
		},
		{
			title: "原因",
			width: 150,
			dataIndex: "reason",
			key: "reason",
			render: value => <div className="login-audit__multiline">{getReasonText(value)}</div>
		}
	];

	const shareRiskColumns: ColumnsType<UserShareRiskItem> = [
		{
			title: "星球编号",
			dataIndex: "starNumber",
			key: "starNumber",
			width: 140,
			render: (_, item) => (
				<div>
					<div className="login-audit__multiline">{item.starNumber || "-"}</div>
					<div className="login-audit__subtext">登录名: {item.loginName || "-"}</div>
				</div>
			)
		},
		{
			title: "被踢次数",
			dataIndex: "kickoutCount",
			key: "kickoutCount",
			width: 100,
			render: value => value || 0
		},
		{
			title: "设备数",
			dataIndex: "deviceCount",
			key: "deviceCount",
			width: 90,
			render: value => value || 0
		},
		{
			title: "IP数",
			dataIndex: "ipCount",
			key: "ipCount",
			width: 90,
			render: value => value || 0
		},
		{
			title: "最后异常 / 禁用截止",
			dataIndex: "lastKickoutTime",
			key: "lastKickoutTime",
			width: 180,
			render: (_, item) => (
				<div>
					<div className="login-audit__multiline">{formatDateTime(item.lastKickoutTime)}</div>
					{item.forbidden && item.forbidUntil ? (
						<div className="login-audit__subtext">禁用至: {formatDateTime(item.forbidUntil)}</div>
					) : null}
				</div>
			)
		},
		{
			title: "风险等级",
			dataIndex: "riskLevel",
			key: "riskLevel",
			width: 100,
			render: value => {
				const level = shareRiskLevelMap[value || "LOW"] || shareRiskLevelMap.LOW;
				return <Tag color={level.color}>{level.text}</Tag>;
			}
		},
		{
			title: "处理状态",
			key: "forbidden",
			width: 80,
			render: (_, item) => (item.forbidden ? <Tag color="error">已禁用</Tag> : <Tag color="success">正常</Tag>)
		},
		{
			title: "判断依据",
			dataIndex: "riskReason",
			key: "riskReason",
			render: value => <div className="login-audit__multiline">{value || "-"}</div>
		},
		{
			title: "操作",
			key: "action",
			width: 200,
			render: (_, item) => (
				<Space wrap size={0}>
					<Button type="link" onClick={() => handleInspectRisk(item)}>
						查看明细
					</Button>
					{item.forbidden ? (
						<Button type="link" onClick={() => handleUnforbid(item)} loading={actionUserId === item.userId}>
							解除禁用
						</Button>
					) : (
						<Button danger type="link" onClick={() => handleForbid(item)} loading={actionUserId === item.userId}>
							禁用30天
						</Button>
					)}
				</Space>
			)
		}
	];

	const handleAuditSearch = async () => {
		const values = await auditFormRef.validateFields();
		setAuditPagination(prev => ({ ...prev, current: 1 }));
		setAuditFilters({ ...defaultLoginAuditFilter, ...values });
	};

	const handleAuditReset = () => {
		auditFormRef.resetFields();
		setAuditPagination(prev => ({ ...prev, current: 1 }));
		setAuditFilters(defaultLoginAuditFilter);
	};

	const handleShareRiskSearch = async () => {
		const values = await shareRiskFormRef.validateFields();
		setShareRiskPagination(prev => ({ ...prev, current: 1 }));
		setShareRiskFilters({ ...defaultShareRiskFilter, ...values });
	};

	const handleShareRiskReset = () => {
		shareRiskFormRef.resetFields();
		setShareRiskPagination(prev => ({ ...prev, current: 1 }));
		setShareRiskFilters(defaultShareRiskFilter);
	};

	const handleInspectRisk = (item: UserShareRiskItem) => {
		const starNumber = item.starNumber || "";
		if (!starNumber) {
			message.warning("当前记录缺少星球编号，无法联动查询");
			return;
		}
		const auditValues = {
			starNumber,
			deviceId: "",
			ip: "",
			eventType: undefined
		};
		auditFormRef.setFieldsValue(auditValues);
		setAuditPagination(prev => ({ ...prev, current: 1 }));
		setAuditFilters(auditValues);
		message.success(`已切换到 ${starNumber || "当前账号"} 的登录审计明细`);
		requestAnimationFrame(() => {
			auditSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
		});
	};

	const handleForbid = (item: UserShareRiskItem) => {
		if (!item.userId) {
			message.error("缺少用户ID，无法禁用");
			return;
		}
		const userId = item.userId;
		Modal.confirm({
			title: `确认禁用账号 ${item.loginName || item.userId} 30 天？`,
			content: "系统会立即踢下当前会话，并继续保留登录审计记录。",
			okText: "确认禁用",
			okButtonProps: { danger: true },
			cancelText: "取消",
			onOk: async () => {
				setActionUserId(userId);
				try {
					await forbidUserApi({
						userId,
						days: 30,
						reason: "疑似共享账号，管理员禁用30天"
					});
					message.success("账号已禁用 30 天");
					await Promise.all([fetchShareRisk(), fetchLoginAudit()]);
				} catch (error) {
					console.error(error);
				} finally {
					setActionUserId(undefined);
				}
			}
		});
	};

	const handleUnforbid = (item: UserShareRiskItem) => {
		if (!item.userId) {
			message.error("缺少用户ID，无法解除禁用");
			return;
		}
		const userId = item.userId;
		Modal.confirm({
			title: `确认解除账号 ${item.loginName || item.userId} 的禁用状态？`,
			okText: "确认解除",
			cancelText: "取消",
			onOk: async () => {
				setActionUserId(userId);
				try {
					await unforbidUserApi({ userId });
					message.success("已解除禁用");
					await Promise.all([fetchShareRisk(), fetchLoginAudit()]);
				} catch (error) {
					console.error(error);
				} finally {
					setActionUserId(undefined);
				}
			}
		});
	};

	return (
		<div className="login-audit">
			<ContentWrap>
				<Row gutter={[16, 16]} className="login-audit__meta">
					<Col xs={24} md={6}>
						<Alert
							showIcon
							type={shareRiskList.length ? "warning" : "success"}
							message={`当前命中疑似共享账号 ${shareRiskPagination.total || 0} 个`}
						/>
					</Col>
					<Col xs={24} md={6}>
						<Alert
							showIcon
							type={highRiskAccountCount ? "error" : "info"}
							message={`当前页高风险账号 ${highRiskAccountCount} 个`}
						/>
					</Col>
					<Col xs={24} md={6}>
						<Alert showIcon type="info" message={`当前页登录成功 ${auditSummary.loginSuccess} 次`} />
					</Col>
					<Col xs={24} md={6}>
						<Alert
							showIcon
							type={auditSummary.loginFail ? "warning" : "success"}
							message={`当前页登录失败 ${auditSummary.loginFail} 次`}
						/>
					</Col>
				</Row>

				<Card className="login-audit__card" title="疑似共享账号">
					<Form form={shareRiskFormRef} layout="vertical" initialValues={defaultShareRiskFilter} className="login-audit__filter">
						<Row gutter={16}>
							<Col xs={24} md={6}>
								<Form.Item label="星球编号" name="starNumber">
									<Input allowClear placeholder="输入星球编号查找" />
								</Form.Item>
							</Col>
							<Col xs={24} md={4}>
								<Form.Item label="统计周期" name="recentDays">
									<Select
										options={[
											{ value: 3, label: "近3天" },
											{ value: 7, label: "近7天" },
											{ value: 15, label: "近15天" },
											{ value: 30, label: "近30天" }
										]}
									/>
								</Form.Item>
							</Col>
							<Col xs={24} md={4}>
								<Form.Item label="最少被踢次数" name="minKickoutCount">
									<InputNumber min={1} max={99} style={{ width: "100%" }} />
								</Form.Item>
							</Col>
							<Col xs={24} md={4}>
								<Form.Item label="最少设备数" name="minDeviceCount">
									<InputNumber min={1} max={99} style={{ width: "100%" }} />
								</Form.Item>
							</Col>
							<Col xs={24} md={4}>
								<Form.Item label="最少IP数" name="minIpCount">
									<InputNumber min={1} max={99} style={{ width: "100%" }} />
								</Form.Item>
							</Col>
						</Row>
						<Space wrap>
							<Button type="primary" icon={<SearchOutlined />} loading={shareRiskLoading} onClick={handleShareRiskSearch}>
								查询疑似账号
							</Button>
							<Button onClick={handleShareRiskReset}>重置</Button>
						</Space>
					</Form>

					<Table
						rowKey={item => `${item.userId || item.loginName || "risk"}`}
						size="small"
						columns={shareRiskColumns}
						dataSource={shareRiskList}
						pagination={shareRiskPaginationInfo}
						loading={shareRiskLoading}
						scroll={{ x: 1100 }}
					/>
				</Card>

				<div ref={auditSectionRef}>
					<Card className="login-audit__card" title="登录轨迹">
						<Form form={auditFormRef} layout="vertical" initialValues={defaultLoginAuditFilter} className="login-audit__filter">
							<Row gutter={16}>
								<Col xs={24} md={6}>
									<Form.Item label="星球编号" name="starNumber">
										<Input allowClear placeholder="输入星球编号查找" />
									</Form.Item>
								</Col>
								<Col xs={24} md={6}>
									<Form.Item label="设备 ID" name="deviceId">
										<Input allowClear placeholder="f-device" />
									</Form.Item>
								</Col>
								<Col xs={24} md={6}>
									<Form.Item label="IP" name="ip">
										<Input allowClear placeholder="127.0.0.1" />
									</Form.Item>
								</Col>
								<Col xs={24} md={6}>
									<Form.Item label="事件类型" name="eventType">
										<Select allowClear placeholder="全部事件" options={loginAuditEventOptions} />
									</Form.Item>
								</Col>
							</Row>
							<Space wrap>
								<Button type="primary" icon={<SearchOutlined />} loading={auditLoading} onClick={handleAuditSearch}>
									查询轨迹
								</Button>
								<Button onClick={handleAuditReset}>重置</Button>
							</Space>
						</Form>

						<Table
							rowKey="id"
							size="small"
							columns={auditColumns}
							dataSource={auditList}
							pagination={auditPaginationInfo}
							loading={auditLoading}
							scroll={{ x: 1200 }}
						/>
					</Card>
				</div>
			</ContentWrap>
		</div>
	);
};

export default LoginAuditPage;
