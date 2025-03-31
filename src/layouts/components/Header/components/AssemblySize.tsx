import { Dropdown, Menu } from "antd";

import { useAppDispatch, useAppSelector } from "@/hooks/useRTK";
import type { AppDispatch, RootState } from "@/rtk";
import { setAssemblySize } from "@/rtk";

const AssemblySize = () => {
	const global = useAppSelector((state: RootState) => state.global);
	const { assemblySize } = global;
	const dispatch: AppDispatch = useAppDispatch();

	// 切换组件大小
	const onClick = (e: MenuInfo) => {
		dispatch(setAssemblySize(e.key));
	};

	const menu = (
		<Menu
			items={[
				{
					key: "middle",
					disabled: assemblySize == "middle",
					label: <span>默认</span>,
					onClick
				},
				{
					disabled: assemblySize == "large",
					key: "large",
					label: <span>大型</span>,
					onClick
				},
				{
					disabled: assemblySize == "small",
					key: "small",
					label: <span>小型</span>,
					onClick
				}
			]}
		/>
	);
	return (
		<Dropdown overlay={menu} placement="bottom" trigger={["click"]} arrow={true}>
			<i className="icon-style iconfont icon-contentright"></i>
		</Dropdown>
	);
};

export default AssemblySize;
