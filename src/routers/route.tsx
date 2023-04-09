import React, { FC } from "react";
import {
	BarsOutlined,
	CalendarOutlined,
	FileAddOutlined,
	FilePptOutlined,
	FileTextOutlined,
	HomeOutlined,
	LineChartOutlined,
	ReadOutlined,
	TagsOutlined,
	UserOutlined,
	UserSwitchOutlined
} from "@ant-design/icons";

export const currentMenuList = [
	// { key: "/home/index", icon: <HomeOutlined />, children: undefined, label: "首页" },
	{ key: "/statistics/index", icon: <LineChartOutlined />, children: undefined, label: "数据统计" },
	{ key: "/config/index", icon: <CalendarOutlined />, children: undefined, label: "运营配置" },
	{ key: "/category/index", icon: <BarsOutlined />, children: undefined, label: "分类管理" },
	{ key: "/tag/index", icon: <TagsOutlined />, children: undefined, label: "标签管理" },
	{ key: "/article/index", icon: <FileTextOutlined />, children: undefined, label: "文章管理" },
	{ key: "/auth", icon: <UserOutlined />, children: [
			{ key: "/articleWhiteList/index", icon: <UserSwitchOutlined />, children: undefined, label: "发文白名单" },
		], label: "授权管理" },
	{
		key: "/proTable",
		icon: <ReadOutlined />,
		children: [
			{ key: "/column/index", icon: <FilePptOutlined />, children: undefined, label: "教程配置" },
			{ key: "/columnArticle/index", icon: <FileAddOutlined />, children: undefined, label: "教程文章" }
		],
		label: "教程管理"
	}
];
