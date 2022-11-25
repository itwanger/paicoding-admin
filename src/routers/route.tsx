import React, { FC } from "react";
import { AppstoreOutlined, MailOutlined, SettingOutlined } from "@ant-design/icons";

export const currentMenuList = [
	{ key: "/home/index", icon: <MailOutlined />, children: undefined, label: "首页" },
	{ key: "/sort/index", icon: <MailOutlined />, children: undefined, label: "分类" }
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
