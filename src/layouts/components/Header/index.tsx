import { connect } from "react-redux";
import { Layout } from "antd";

import { loginUserInfo } from "@/api/modules/login";
import { setToken, setUserInfo } from "@/redux/modules/global/action";
import AssemblySize from "./components/AssemblySize";
import AvatarIcon from "./components/AvatarIcon";
import BreadcrumbNav from "./components/BreadcrumbNav";
import CollapseIcon from "./components/CollapseIcon";
import Fullscreen from "./components/Fullscreen";
import Theme from "./components/Theme";

import "./index.less";

const LayoutHeader = (props: any) => {
	let { userInfo } = props || {};
	if (!userInfo || JSON.stringify(userInfo) === "{}") {
		let fetchUsrInfo = async () => {
			const { status, result } = await loginUserInfo();
			if (status && status.code == 0 && result && result?.userId > 0) {
				// fixme 拿登录的用户名、用户头像来替换默认的用户名头像
				setToken(result?.userId);

				setUserInfo(result);
				userInfo = result;
			}
		};
		// 未拿到用户信息时，主动去拿一下
		fetchUsrInfo();
	}
	const { userName } = userInfo || {};
	console.log("userInfo:", userInfo, userName);

	const { Header } = Layout;

	return (
		<Header>
			<div className="header-lf">
				<CollapseIcon />
				<BreadcrumbNav />
			</div>
			<div className="header-ri">
				<AssemblySize />
				<Theme />
				<Fullscreen />
				<span className="username">{userName || "技术派"}</span>
				<AvatarIcon userInfo={userInfo} />
			</div>
		</Header>
	);
};

const mapStateToProps = (state: any) => state.global;
const mapDispatchToProps = {};
export default connect(mapStateToProps, mapDispatchToProps)(LayoutHeader);
