import { LayoutIndex } from "@/routers/constant";
import { RouteObject } from "@/routers/interface";
import Label from "@/views/label";

const labelRouter: Array<RouteObject> = [
	{
		element: <LayoutIndex />,
		children: [
			{
				path: "/tag/index",
				element: <Label />,
				meta: {
					// requiresAuth: true,
					title: "标签",
					key: "label"
				}
			}
		]
	}
];

export default labelRouter;
