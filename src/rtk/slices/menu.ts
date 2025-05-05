/* eslint-disable simple-import-sort/imports */
/* eslint-disable prettier/prettier */
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { MenuState } from "@/redux/interface";
import { getMenuList } from "@/api/modules/login";

export const menuSlice = createSlice({
	name: "menu",

	initialState: {
		isCollapse: false,
		menuList: [] as Menu.MenuOptions[]
	} as MenuState,

	reducers: {
		updateCollapse: (state, action) => {
			// Redux Toolkit 允许我们在 reducers 中编写 mutating 逻辑。
			// 它实际上并没有 mutate state 因为它使用了 Immer 库，
			// 它检测到草稿 state 的变化并产生一个全新的基于这些更改的不可变 state
			state.isCollapse = action.payload;
		},
		setMenuList: (state, action) => {
			state.menuList = action.payload;
		}
	},

	// 处理异步
	extraReducers: builder => {
		builder
			// .addCase(getDiscListAction.pending, (state, action) => {
			// 	// ...
			// })
			.addCase(getMenuListAction.fulfilled, (state, action) => {
				state.menuList = action.payload;
			});
		// .addCase(getDiscListAction.rejected, (state, action) => {
		// 	// ...
		// })
	}
});

// 外部可以直接调用 dispatch(getMenuListAction())
export const getMenuListAction = createAsyncThunk(
	"menu/getMenuList",
	async (_, { rejectWithValue }): Promise<Menu.MenuOptions[]> => {
		try {
			const res = await getMenuList();
			return (res.data as Menu.MenuOptions[]) ?? [];
		} catch (error) {
			rejectWithValue(error);
			return [];
		}
	}
);

// 为每个 case reducer 函数生成 Action creators
export const { updateCollapse, setMenuList } = menuSlice.actions;

export default menuSlice.reducer;
