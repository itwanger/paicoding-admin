/* eslint-disable simple-import-sort/imports */
/* eslint-disable prettier/prettier */
import { createSlice } from "@reduxjs/toolkit";

import { TabsState } from "@/redux/interface";
import { HOME_URL } from "@/config/config";

export const tabsSlice = createSlice({
	name: "tabs",

	initialState: {
		// tabsActive 其实没啥用，使用 pathname 就可以了😂
		tabsActive: HOME_URL,
		tabsList: [{ title: "首页", path: HOME_URL }] as Menu.MenuOptions[]
	} as TabsState,

	reducers: {
		setTabsList: (state, action) => {
			state.tabsList = action.payload;
		},
		setTabsActive: (state, action) => {
			state.tabsActive = action.payload;
		}
	}
});

export const { setTabsList, setTabsActive } = tabsSlice.actions;

export default tabsSlice.reducer;
