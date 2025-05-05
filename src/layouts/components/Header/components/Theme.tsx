import { useState } from "react";
import { FireOutlined, SettingOutlined } from "@ant-design/icons";
import { Divider, Drawer, Switch } from "antd";

import SwitchDark from "@/components/SwitchDark";
import { useAppDispatch, useAppSelector } from "@/hooks/useRTK";
import type { AppDispatch, RootState } from "@/rtk";
import { setThemeConfig, updateCollapse } from "@/rtk";

const Theme = () => {
	const [visible, setVisible] = useState<boolean>(false);
	const global = useAppSelector((state: RootState) => state.global);
	const menu = useAppSelector((state: RootState) => state.menu);
	const { isCollapse } = menu;
	const { themeConfig } = global;
	const { weakOrGray, breadcrumb, tabs, footer } = themeConfig;
	const dispatch: AppDispatch = useAppDispatch();

	const setWeakOrGray = (checked: boolean, theme: string) => {
		dispatch(setThemeConfig({ ...themeConfig, weakOrGray: checked ? theme : "" }));
	};

	const onChange = (checked: boolean, keyName: string) => {
		dispatch(setThemeConfig({ ...themeConfig, [keyName]: !checked }));
	};

	return (
		<>
			<i
				className="icon-style iconfont icon-zhuti"
				onClick={() => {
					setVisible(true);
				}}
			></i>
			<Drawer
				title="布局设置"
				closable={false}
				onClose={() => {
					setVisible(false);
				}}
				visible={visible}
				width={320}
			>
				{/* 全局主题 */}
				<Divider className="divider">
					<FireOutlined />
					全局主题
				</Divider>
				<div className="theme-item">
					<span>暗黑模式</span>
					<SwitchDark />
				</div>
				<div className="theme-item">
					<span>灰色模式</span>
					<Switch
						checked={weakOrGray === "gray"}
						onChange={e => {
							setWeakOrGray(e, "gray");
						}}
					/>
				</div>
				<div className="theme-item">
					<span>色弱模式</span>
					<Switch
						checked={weakOrGray === "weak"}
						onChange={e => {
							setWeakOrGray(e, "weak");
						}}
					/>
				</div>
				<br />
				{/* 界面设置 */}
				<Divider className="divider">
					<SettingOutlined />
					界面设置
				</Divider>
				<div className="theme-item">
					<span>折叠菜单</span>
					<Switch
						checked={isCollapse}
						onChange={e => {
							dispatch(updateCollapse(e));
						}}
					/>
				</div>
				<div className="theme-item">
					<span>面包屑导航</span>
					<Switch
						checked={!breadcrumb}
						onChange={e => {
							onChange(e, "breadcrumb");
						}}
					/>
				</div>
				<div className="theme-item">
					<span>标签栏</span>
					<Switch
						checked={!tabs}
						onChange={e => {
							onChange(e, "tabs");
						}}
					/>
				</div>
				<div className="theme-item">
					<span>页脚</span>
					<Switch
						checked={!footer}
						onChange={e => {
							onChange(e, "footer");
						}}
					/>
				</div>
			</Drawer>
		</>
	);
};

export default Theme;
