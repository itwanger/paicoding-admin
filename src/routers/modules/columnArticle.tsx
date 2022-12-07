import { LayoutIndex } from "@/routers/constant";
import { RouteObject } from "@/routers/interface";
import ColumnArticle from "@/views/columnArticle";

const columnRouter: Array<RouteObject> = [
	{
		element: <LayoutIndex />,
		children: [
			{
				path: "/columnArticle/index",
				element: <ColumnArticle />,
				meta: {
					// requiresAuth: true,
					title: "专题文章",
					key: "columnArticle"
				}
			}
		]
	}
];

export default columnRouter;
