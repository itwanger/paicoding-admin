import { LayoutIndex } from "@/routers/constant";
import { RouteObject } from "@/routers/interface";
import AiConfigPage from "@/views/aiConfig";

const aiConfigRouter: Array<RouteObject> = [
	{
		element: <LayoutIndex />,
		children: [
			{
				path: "/ai/config/index",
				element: <AiConfigPage />,
				meta: {
					title: "AI模型配置",
					key: "ai-config"
				}
			}
		]
	}
];

export default aiConfigRouter;
