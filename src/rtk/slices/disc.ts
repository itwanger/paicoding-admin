/* eslint-disable simple-import-sort/imports */
/* eslint-disable prettier/prettier */
import { toPairs } from "lodash";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { MapItem } from "@/typings/common";
import { DiscState } from "@/redux/interface";
import { getDiscListApi } from "@/api/modules/common";

export const discSlice = createSlice({
	name: "disc",

	initialState: {
		disc: {} as MapItem
	} as DiscState,

	reducers: {
		// setDiscList: (state, action) => {
		// 	state.disc = action.payload;
		// }
	},

	// 处理异步
	extraReducers: builder => {
		builder
			// .addCase(getDiscListAction.pending, (state, action) => {
			// 	// ...
			// })
			.addCase(getDiscListAction.fulfilled, (state, action) => {
				state.disc = action.payload;
			});
		// .addCase(getDiscListAction.rejected, (state, action) => {
		// 	// ...
		// })
	}
});

const dictTransform = (dict = {}, keys = ["id", "title"]) => {
	console.log("字典 d", dict);

	return toPairs(dict).map(item => {
		return {
			[keys[0]]: item[0],
			[keys[1]]: item[1]
		};
	});
};

// 获取字典数据
// 异步 action creator
// 外部可以直接调用 dispatch(getDiscListAction())
export const getDiscListAction = createAsyncThunk("disc/getDiscList", async (_, { rejectWithValue }): Promise<MapItem> => {
	try {
		const { result } = (await getDiscListApi()) || {};
		console.log("获取字典，getDiscListAction");

		let dictionaryMap = {};
		for (const key in result as object) {
			if (Object.getOwnPropertyDescriptor(result, key)) {
				// @ts-ignore
				dictionaryMap[key] = result[key];
				// @ts-ignore
				dictionaryMap[`${key}List`] = dictTransform(result[key], ["value", "label"]);
			}
		}

		console.log("字典", dictionaryMap);

		return dictionaryMap as MapItem;
	} catch (error) {
		rejectWithValue(error);
		return {} as MapItem;
	}
});

export default discSlice.reducer;
