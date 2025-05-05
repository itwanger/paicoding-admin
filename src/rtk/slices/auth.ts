/* eslint-disable simple-import-sort/imports */
/* eslint-disable prettier/prettier */
import { createSlice } from "@reduxjs/toolkit";

import { AuthState } from "@/redux/interface";

export const authSlice = createSlice({
	name: "auth",

	initialState: {
		authButtons: {},
		authRouter: []
	} as AuthState,

	reducers: {
		setAuthButtons: (state, action) => {
			state.authButtons = action.payload;
		},
		setAuthRouter: (state, action) => {
			state.authRouter = action.payload;
		}
	}
});

export const { setAuthButtons, setAuthRouter } = authSlice.actions;

export default authSlice.reducer;
