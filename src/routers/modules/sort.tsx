// import React from "react";
// import lazyLoad from "@/routers/util/lazyLoad";
import { LayoutIndex } from "@/routers/constant";
import { RouteObject } from "@/routers/interface";
import Sort from "@/views/sort";

// 首页模块
const sortRouter: Array<RouteObject> = [
	{
		element: <LayoutIndex />,
		children: [
			{
				path: "/sort/index",
				// element: lazyLoad(React.lazy(() => import("@/views/home/index"))),
				element: <Sort />,
				meta: {
					// requiresAuth: true,
					title: "分类",
					key: "sort"
				}
			}
		]
	}
];

export default sortRouter;
