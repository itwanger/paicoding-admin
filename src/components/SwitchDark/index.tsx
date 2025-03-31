/* eslint-disable simple-import-sort/imports */
import { Switch } from "antd";

import { useAppDispatch, useAppSelector } from "@/hooks/useRTK";
import type { AppDispatch, RootState } from "@/rtk";
import { setThemeConfig } from "@/rtk";

const SwitchDark = () => {
	const global = useAppSelector((state: RootState) => state.global);
	const { themeConfig } = global;
	const dispatch: AppDispatch = useAppDispatch();

	const onChange = (checked: boolean) => {
		dispatch(setThemeConfig({ ...themeConfig, isDark: checked }));
	};

	return (
		<Switch
			className="dark"
			defaultChecked={themeConfig.isDark}
			checkedChildren={<>🌞</>}
			unCheckedChildren={<>🌜</>}
			onChange={onChange}
		/>
	);
};

export default SwitchDark;
