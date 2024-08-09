import { LayoutIndex } from "@/routers/constant";
import { RouteObject } from "@/routers/interface";
import Label from "@/views/resume";

const labelRouter: Array<RouteObject> = [
	{
		element: <LayoutIndex />,
		children: [
			{
				path: "/resume/index",
				element: <Label />,
				meta: {
					// requiresAuth: true,
					title: "简历",
					key: "resume"
				}
			}
		]
	}
];

export default labelRouter;
