/* eslint-disable simple-import-sort/imports */
/* eslint-disable prettier/prettier */
import { createSlice } from "@reduxjs/toolkit";

import { GlobalState, ThemeConfigProp } from "@/redux/interface";

export const globalSlice = createSlice({
	name: "global",

	initialState: {
		token: "",
		userInfo: {},
		assemblySize: "middle",
		themeConfig: {
			// 默认 primary 主题颜色
			primary: "#1890ff",
			// 深色模式
			isDark: false,
			// 色弱模式(weak) || 灰色模式(gray)
			weakOrGray: "",
			// 面包屑导航
			breadcrumb: true,
			// 标签页
			tabs: true,
			// 页脚
			footer: true
		} as ThemeConfigProp
	} as GlobalState,

	reducers: {
		setToken: (state, action) => {
			// Redux Toolkit 允许我们在 reducers 中编写 mutating 逻辑。
			// 它实际上并没有 mutate state 因为它使用了 Immer 库，
			// 它检测到草稿 state 的变化并产生一个全新的基于这些更改的不可变 state
			state.token = action.payload;
		},
		setUserInfo: (state, action) => {
			state.userInfo = action.payload;
		},
		setAssemblySize: (state, action) => {
			state.assemblySize = action.payload;
		},
		setThemeConfig: (state, action) => {
			state.themeConfig = action.payload;
		}
	}
});

// 为每个 case reducer 函数生成 Action creators
export const { setToken, setUserInfo, setAssemblySize, setThemeConfig } = globalSlice.actions;

export default globalSlice.reducer;
