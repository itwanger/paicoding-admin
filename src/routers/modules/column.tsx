import React from "react";

import { LayoutIndex } from "@/routers/constant";
import { RouteObject } from "@/routers/interface";
import Column from "@/views/column/article";
import lazyLoad from "../utils/lazyLoad";

const columnRouter: Array<RouteObject> = [
	{
		element: <LayoutIndex />,
		children: [
			{
				path: "/column",
				meta: {
					// requiresAuth: true,
					title: "专题",
					key: "/column"
				},
				children: [
					{
						path: "/column/setting/index",
						element: lazyLoad(React.lazy(() => import("@/views/column/setting/index"))),
						meta: {
							title: "教程配置",
							key: "/column/setting/index"
						}
					},
					{
						path: "/column/article/index",
						element: lazyLoad(React.lazy(() => import("@/views/column/article/index"))),
						meta: {
							title: "添加文章",
							key: "/column/article/index"
						}
					}
				]
			}
		]
	}
];

export default columnRouter;
