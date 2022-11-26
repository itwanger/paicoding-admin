import { LayoutIndex } from "@/routers/constant";
import { RouteObject } from "@/routers/interface";
import Article from "@/views/article";

const articleRouter: Array<RouteObject> = [
	{
		element: <LayoutIndex />,
		children: [
			{
				path: "/article/index",
				element: <Article />,
				meta: {
					// requiresAuth: true,
					title: "文章",
					key: "article"
				}
			}
		]
	}
];

export default articleRouter;
