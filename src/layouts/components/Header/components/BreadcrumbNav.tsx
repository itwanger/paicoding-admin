import { useLocation } from "react-router-dom";
import { Breadcrumb } from "antd";

import { HOME_URL } from "@/config/config";
import { useAppSelector } from "@/hooks/useRTK";
import type { RootState } from "@/rtk";

const BreadcrumbNav = () => {
	const { pathname } = useLocation();
	const global = useAppSelector((state: RootState) => state.global);
	const { themeConfig } = global;
	const breadcrumb = useAppSelector((state: RootState) => state.breadcrumb);
	const breadcrumbList = breadcrumb.breadcrumbList[pathname] || [];
	console.log({ breadcrumbList });

	return (
		<>
			{!themeConfig.breadcrumb && (
				<Breadcrumb>
					<Breadcrumb.Item href={`#${HOME_URL}`}>首页</Breadcrumb.Item>
					{breadcrumbList.map((item: string) => {
						return <Breadcrumb.Item key={item}>{item !== "首页" ? item : null}</Breadcrumb.Item>;
					})}
				</Breadcrumb>
			)}
		</>
	);
};

export default BreadcrumbNav;
