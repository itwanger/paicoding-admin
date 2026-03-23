import { LayoutIndex } from "@/routers/constant";
import { RouteObject } from "@/routers/interface";
import WxMenuPage from "@/views/wxMenu";

const wxMenuRouter: Array<RouteObject> = [
	{
		element: <LayoutIndex />,
		children: [
			{
				path: "/wx/menu/index",
				element: <WxMenuPage />,
				meta: {
					title: "微信配置",
					key: "wx-menu"
				}
			}
		]
	}
];

export default wxMenuRouter;
