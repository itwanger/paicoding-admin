import { LayoutIndex } from "@/routers/constant";
import { RouteObject } from "@/routers/interface";
import Article from "@/views/article";
import ArticleEdit from "@/views/article/edit";

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
			},
			{
				path: "/article/edit/index",
				element: <ArticleEdit />,
				meta: {
					title: "文章编辑",
					key: "/article/edit/index"
				}
			}
		]
	}
];

export default articleRouter;
