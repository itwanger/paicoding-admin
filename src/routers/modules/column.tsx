import { LayoutIndex } from "@/routers/constant";
import { RouteObject } from "@/routers/interface";
import Column from "@/views/column";

const columnRouter: Array<RouteObject> = [
	{
		element: <LayoutIndex />,
		children: [
			{
				path: "/column/index",
				element: <Column />,
				meta: {
					// requiresAuth: true,
					title: "专题",
					key: "column"
				}
			}
		]
	}
];

export default columnRouter;
