/* eslint-disable simple-import-sort/imports */
/* eslint-disable prettier/prettier */
import { createSlice } from "@reduxjs/toolkit";

import { BreadcrumbState } from "@/redux/interface";

export const breadcrumbSlice = createSlice({
	name: "breadcrumb",

	initialState: {
		breadcrumbList: {}
	} as BreadcrumbState,

	reducers: {
		setBreadcrumbList: (state, action) => {
			state.breadcrumbList = action.payload;
		}
	}
});

export const { setBreadcrumbList } = breadcrumbSlice.actions;

export default breadcrumbSlice.reducer;
