import React, { FC } from "react";
import {
	BookOutlined,
	LineChartOutlined,
	CalendarOutlined,
	HomeOutlined,
	BarsOutlined,
	FileDoneOutlined,
	TagsOutlined
} from "@ant-design/icons";

export const currentMenuList = [
	{ key: "/home/index", icon: <HomeOutlined />, children: undefined, label: "首页" },
	{ key: "/statistics/index", icon: <LineChartOutlined />, children: undefined, label: "数据统计" },
	{ key: "/config/index", icon: <CalendarOutlined />, children: undefined, label: "运营配置" },
	{ key: "/category/index", icon: <BarsOutlined />, children: undefined, label: "分类管理" },
	{ key: "/tag/index", icon: <TagsOutlined />, children: undefined, label: "标签管理" },
	{ key: "/article/index", icon: <FileDoneOutlined />, children: undefined, label: "文章管理" },
	{ key: "/column/index", icon: <BookOutlined />, children: undefined, label: "教程管理" }

	// {
	// 	key: "/proTable",
	// 	icon: <MailOutlined />,
	// 	children: [
	// 		{ key: "/proTable/useHooks", icon: <MailOutlined />, children: undefined, label: "二级菜单" },
	// 		{ key: "/proTable/useComponent", icon: <MailOutlined />, children: undefined, label: "二级菜单" }
	// 	],
	// 	label: "一级菜单"
	// }
];
