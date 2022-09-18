import React, { FC } from "react";
import { AppstoreOutlined, MailOutlined, SettingOutlined } from "@ant-design/icons";

export const menuListTest = [
	{ key: "/home/index", icon: <MailOutlined />, children: undefined, label: "首页", type: undefined },
	{ key: "/dataScreen/index", icon: <MailOutlined />, children: undefined, label: "数据大屏", type: undefined },
	{
		key: "/proTable",
		icon: <MailOutlined />,
		children: [
			{ key: "/proTable/useHooks", icon: <MailOutlined />, children: undefined, label: "二级菜单", type: undefined },
			{ key: "/proTable/useComponent", icon: <MailOutlined />, children: undefined, label: "二级菜单", type: undefined }
		],
		label: "一级菜单",
		type: undefined
	}
];
