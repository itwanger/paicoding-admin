import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";

import { useAppDispatch, useAppSelector } from "@/hooks/useRTK";
import type { AppDispatch, RootState } from "@/rtk";
import { updateCollapse } from "@/rtk";

const CollapseIcon = () => {
	const menu = useAppSelector((state: RootState) => state.menu);
	const { isCollapse } = menu;
	const dispatch: AppDispatch = useAppDispatch();
	return (
		<div
			className="collapsed"
			onClick={() => {
				dispatch(updateCollapse(!isCollapse));
			}}
		>
			{isCollapse ? <MenuUnfoldOutlined id="isCollapse" /> : <MenuFoldOutlined id="isCollapse" />}
		</div>
	);
};

export default CollapseIcon;
