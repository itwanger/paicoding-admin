import { connect } from "react-redux";
import { HashRouter } from "react-router-dom";
import { ConfigProvider } from "antd";

import useTheme from "@/hooks/useTheme";
import Router from "@/routers/index";
import AuthRouter from "@/routers/utils/authRouter";

import "./index.scss";

import "moment/dist/locale/zh-cn";

const App = (props: any) => {
	const { assemblySize, themeConfig } = props;

	// 全局使用主题
	useTheme(themeConfig);

	return (
		<HashRouter>
			<ConfigProvider componentSize={assemblySize}>
				<AuthRouter>
					<Router />
				</AuthRouter>
			</ConfigProvider>
		</HashRouter>
	);
};

const mapStateToProps = (state: any) => state.global;
const mapDispatchToProps = {};
export default connect(mapStateToProps, mapDispatchToProps)(App);
