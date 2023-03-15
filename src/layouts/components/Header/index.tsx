import { connect } from "react-redux";
import { Layout } from "antd";

import { store } from "@/redux";
import AssemblySize from "./components/AssemblySize";
import AvatarIcon from "./components/AvatarIcon";
import BreadcrumbNav from "./components/BreadcrumbNav";
import CollapseIcon from "./components/CollapseIcon";
import Fullscreen from "./components/Fullscreen";
import Theme from "./components/Theme";

import "./index.less";

const LayoutHeader = props => {
	const { userInfo } = props || {};
	const { userName } = userInfo || {};

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
