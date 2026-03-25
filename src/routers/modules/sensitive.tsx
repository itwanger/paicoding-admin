import { LayoutIndex } from "@/routers/constant";
import { RouteObject } from "@/routers/interface";
import Sensitive from "@/views/sensitive";

const sensitiveRouter: Array<RouteObject> = [
	{
		element: <LayoutIndex />,
		children: [
			{
				path: "/sensitive/index",
				element: <Sensitive />,
				meta: {
					title: "敏感词管理",
					key: "sensitive"
				}
			}
		]
	}
];

export default sensitiveRouter;
