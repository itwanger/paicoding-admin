import { combineReducers, configureStore, Store } from "@reduxjs/toolkit";
import { persistReducer, persistStore } from "redux-persist";
import storage from "redux-persist/lib/storage";

import auth from "@/rtk/slices/auth";
import breadcrumb from "@/rtk/slices/breadcrumb";
import disc from "@/rtk/slices/disc";
import global from "@/rtk/slices/global";
import menu from "@/rtk/slices/menu";
import tabs from "@/rtk/slices/tabs";

// 对标 @/redux/index.ts
// 创建reducer(拆分reducer)
const reducer = combineReducers({
	global,
	menu,
	tabs,
	auth,
	breadcrumb,
	disc
});

// redux 持久化配置
const persistConfig = {
	key: "rtk-state",
	storage // 默认使用 localStorage
};
const persistReducerConfig = persistReducer(persistConfig, reducer);

// 创建 store
const store: Store = configureStore({
	reducer: persistReducerConfig,
	// RTK 在开发环境默认开启 redux-devtools
	devTools: {
		name: "技术派 Store", // 在 DevTools 中显示的名称
		// maxAge: 30, // 限制历史记录条数
		trace: true // 启用 action 堆栈跟踪
	}
});

export type RootState = ReturnType<typeof store.getState>;

// 定义自定义的 dispatch 类型
export type AppDispatch = typeof store.dispatch;

// 创建持久化 store
const persistor = persistStore(store);

export { persistor, store };
