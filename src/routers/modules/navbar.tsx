import { LayoutIndex } from "@/routers/constant";
import { RouteObject } from "@/routers/interface";
import NavbarConfigPage from "@/views/navbar";

const navbarRouter: Array<RouteObject> = [
	{
		element: <LayoutIndex />,
		children: [
			{
				path: "/navbar/index",
				element: <NavbarConfigPage />,
				meta: {
					title: "导航配置",
					key: "navbar"
				}
			}
		]
	}
];

export default navbarRouter;
