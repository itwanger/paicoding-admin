import { FC, useEffect, useState } from "react";
import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, LinkOutlined, PlusOutlined, SaveOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Input, message, Popconfirm, Select, Space, Switch, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";

import { getNavbarConfigApi, NavbarItem, saveNavbarConfigApi } from "@/api/modules/navbar";
import { ContentWrap } from "@/components/common-wrap";

import "./index.scss";

const { Text, Title } = Typography;
const MAX_ITEMS = 8;

const fixedItems = [
	{ name: "首页", url: "/" },
	{ name: "教程", url: "/column" }
];

const NavbarConfigPage: FC = () => {
	const [items, setItems] = useState<NavbarItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);

	const loadConfig = async () => {
		setLoading(true);
		try {
			const { result } = await getNavbarConfigApi();
			setItems(result?.items || []);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadConfig();
	}, []);

	const updateItem = (id: string, patch: Partial<NavbarItem>) => {
		setItems(current => current.map(item => (item.id === id ? { ...item, ...patch } : item)));
	};

	const moveItem = (index: number, offset: number) => {
		const nextIndex = index + offset;
		if (nextIndex < 0 || nextIndex >= items.length) return;
		setItems(current => {
			const next = [...current];
			[next[index], next[nextIndex]] = [next[nextIndex], next[index]];
			return next;
		});
	};

	const addItem = () => {
		if (items.length >= MAX_ITEMS) {
			message.warning(`最多配置 ${MAX_ITEMS} 个自定义入口`);
			return;
		}
		setItems(current => [
			...current,
			{
				id: `nav-${Date.now()}`,
				name: "",
				url: "",
				enabled: true,
				openInNewWindow: true
			}
		]);
	};

	const validate = (configItems: NavbarItem[]) => {
		const names = new Set<string>();
		for (const item of configItems) {
			const name = item.name.trim();
			const url = item.url.trim();
			if (!name || name.length > 12) return "入口名称需为 1-12 个字符";
			if (name === "首页" || name === "教程") return "首页和教程是固定入口，无需重复添加";
			if (names.has(name.toLowerCase())) return `入口名称不能重复：${name}`;
			names.add(name.toLowerCase());
			if (!url || url.length > 500) return `请填写“${name}”的有效链接`;
			if (url === "/" || url === "/column" || url.startsWith("/column/")) {
				return "首页和教程是固定入口，无需重复添加";
			}
			if (!(url.startsWith("/") && !url.startsWith("//")) && !/^https?:\/\/[^\s]+$/i.test(url)) {
				return `“${name}”只支持站内 /path 或 http(s) 地址`;
			}
		}
		return "";
	};

	const saveConfig = async () => {
		const normalized = items.map(item => ({
			...item,
			name: item.name.trim(),
			url: item.url.trim()
		}));
		const error = validate(normalized);
		if (error) {
			message.error(error);
			return;
		}

		setSaving(true);
		try {
			await saveNavbarConfigApi({ items: normalized });
			setItems(normalized);
			message.success("导航配置已保存并生效");
		} finally {
			setSaving(false);
		}
	};

	const columns: ColumnsType<NavbarItem> = [
		{
			title: "顺序",
			width: 116,
			render: (_, __, index) => (
				<Space size={4}>
					<Button aria-label="上移" disabled={index === 0} icon={<ArrowUpOutlined />} onClick={() => moveItem(index, -1)} />
					<Button
						aria-label="下移"
						disabled={index === items.length - 1}
						icon={<ArrowDownOutlined />}
						onClick={() => moveItem(index, 1)}
					/>
				</Space>
			)
		},
		{
			title: "入口名称",
			dataIndex: "name",
			width: 180,
			render: (value, item) => (
				<Input
					maxLength={12}
					placeholder="例如：派简历"
					value={value}
					onChange={event => updateItem(item.id, { name: event.target.value })}
				/>
			)
		},
		{
			title: "跳转链接",
			dataIndex: "url",
			render: (value, item) => (
				<Input
					prefix={<LinkOutlined />}
					placeholder="https://example.com/ 或 /path"
					value={value}
					onChange={event => updateItem(item.id, { url: event.target.value })}
				/>
			)
		},
		{
			title: "打开方式",
			width: 140,
			render: (_, item) => (
				<Select
					value={item.openInNewWindow ? "new" : "current"}
					options={[
						{ value: "current", label: "当前页" },
						{ value: "new", label: "新窗口" }
					]}
					onChange={value => updateItem(item.id, { openInNewWindow: value === "new" })}
				/>
			)
		},
		{
			title: "显示",
			width: 90,
			render: (_, item) => <Switch checked={item.enabled} onChange={enabled => updateItem(item.id, { enabled })} />
		},
		{
			title: "操作",
			width: 84,
			render: (_, item) => (
				<Popconfirm
					title={`删除“${item.name || "未命名入口"}”？`}
					onConfirm={() => setItems(current => current.filter(currentItem => currentItem.id !== item.id))}
				>
					<Button danger icon={<DeleteOutlined />} />
				</Popconfirm>
			)
		}
	];

	return (
		<div className="navbar-config-page">
			<ContentWrap>
				<div className="navbar-config-page__header">
					<div>
						<Title level={3}>顶部导航配置</Title>
						<Text type="secondary">保存后同步更新桌面导航和移动端“导航”菜单。</Text>
					</div>
					<Space>
						<Button icon={<PlusOutlined />} disabled={items.length >= MAX_ITEMS} onClick={addItem}>
							新增入口
						</Button>
						<Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={saveConfig}>
							保存配置
						</Button>
					</Space>
				</div>

				<Card className="navbar-config-page__fixed" title="固定入口" size="small">
					{fixedItems.map(item => (
						<div className="navbar-config-page__fixed-item" key={item.url}>
							<Tag color="blue">固定</Tag>
							<strong>{item.name}</strong>
							<Text type="secondary">{item.url}</Text>
						</div>
					))}
				</Card>

				<Alert showIcon type="info" message="下表顺序会接在“首页 / 教程”之后；关闭“显示”可临时下线入口而不丢失配置。" />

				<Table
					className="navbar-config-page__table"
					columns={columns}
					dataSource={items}
					loading={loading}
					pagination={false}
					rowKey="id"
					scroll={{ x: 980 }}
					locale={{ emptyText: "暂无自定义入口，点击“新增入口”开始配置" }}
				/>
			</ContentWrap>
		</div>
	);
};

export default NavbarConfigPage;
