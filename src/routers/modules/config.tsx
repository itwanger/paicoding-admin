import { LayoutIndex } from "@/routers/constant";
import { RouteObject } from "@/routers/interface";
import Banner from "@/views/config";

const configRouter: Array<RouteObject> = [
	{
		element: <LayoutIndex />,
		children: [
			{
				path: "/config/index",
				element: <Banner />,
				meta: {
					// requiresAuth: true,
					title: "Banner",
					key: "banner"
				}
			}
		]
	}
];

export default configRouter;
