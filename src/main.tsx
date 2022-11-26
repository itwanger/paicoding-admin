import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";

import App from "@/App";
import { persistor, store } from "@/redux";

import "@/styles/reset.less";
import "@/assets/iconfont/iconfont.less";
import "@/assets/fonts/font.less";
import "@/styles/common.less";
import "virtual:svg-icons-register";

// react 17 创建，控制台会报错，暂时不影响使用（菜单折叠时不会出现闪烁）
ReactDOM.render(
	// * react严格模式
	// <React.StrictMode>
	<Provider store={store}>
		<PersistGate persistor={persistor}>
			<App />
		</PersistGate>
	</Provider>,
	// </React.StrictMode>,
	document.getElementById("root")
);
