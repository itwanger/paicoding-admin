import { LayoutIndex } from "@/routers/constant";
import { RouteObject } from "@/routers/interface";
import Banner from "@/views/banner";

const bannerRouter: Array<RouteObject> = [
	{
		element: <LayoutIndex />,
		children: [
			{
				path: "/banner/index",
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

export default bannerRouter;
