import { useAppSelector } from "@/hooks/useRTK";
import type { RootState } from "@/rtk";
import { baseDomain } from "@/utils/util";

import "./index.less";

const LayoutFooter = () => {
	const global = useAppSelector((state: RootState) => state.global);
	const { themeConfig } = global;

	// 定义一个自动获取年份的方法
	const getYear = () => {
		return new Date().getFullYear();
	};

	return (
		<>
			{!themeConfig.footer && (
				<div className="footer">
					<a href={baseDomain} target="_blank" rel="noreferrer">
						{getYear()} © paicoding-admin By 技术派团队.
					</a>
				</div>
			)}
		</>
	);
};

export default LayoutFooter;
