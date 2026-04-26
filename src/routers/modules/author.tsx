import React from "react";

import { LayoutIndex } from "@/routers/constant";
import { RouteObject } from "@/routers/interface";
import lazyLoad from "../utils/lazyLoad";

const columnRouter: Array<RouteObject> = [
	{
		element: <LayoutIndex />,
		children: [
			{
				path: "/author",
				meta: {
					// requiresAuth: true,
					title: "用户管理",
					key: "/author"
				},
				children: [
					{
						path: "/author/whitelist/index",
						element: lazyLoad(React.lazy(() => import("@/views/author/whitelist/index"))),
						meta: {
							title: "作者白名单",
							key: "/author/whitelist/index"
						}
					},
					{
						path: "/author/zsxqlist/index",
						element: lazyLoad(React.lazy(() => import("@/views/author/zsxqlist/index"))),
						meta: {
							title: "星球白名单",
							key: "/author/zsxqlist/index"
						}
					},
					{
						path: "/author/login-audit/index",
						element: lazyLoad(React.lazy(() => import("@/views/author/loginAudit/index"))),
						meta: {
							title: "登录审计",
							key: "/author/login-audit/index"
						}
					}
				]
			}
		]
	}
];

export default columnRouter;
