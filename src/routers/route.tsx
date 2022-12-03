import React, { FC } from "react";
import {
	BookOutlined,
	FileOutlined,
	FundProjectionScreenOutlined,
	HomeOutlined,
	LinkOutlined,
	MenuOutlined,
	TagOutlined
} from "@ant-design/icons";

export const currentMenuList = [
	{ key: "/home/index", icon: <HomeOutlined />, children: undefined, label: "首页" },
	{ key: "/config/index", icon: <LinkOutlined />, children: undefined, label: "配置" },
	{ key: "/category/index", icon: <MenuOutlined />, children: undefined, label: "分类" },
	{ key: "/tag/index", icon: <TagOutlined />, children: undefined, label: "标签" },
	{ key: "/article/index", icon: <FileOutlined />, children: undefined, label: "文章" },
	{ key: "/column/index", icon: <BookOutlined />, children: undefined, label: "专栏" },
	{ key: "/statistics/index", icon: <FundProjectionScreenOutlined />, children: undefined, label: "数据统计" }

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
