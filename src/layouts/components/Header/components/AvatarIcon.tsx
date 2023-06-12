import { useRef } from "react";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { Avatar, Dropdown, MenuProps, message, Modal } from "antd";

import { logoutApi } from "@/api/modules/login";
import loginPng from "@/assets/images/logo_md.png";
import { HOME_URL } from "@/config/config";
import { setToken } from "@/redux/modules/global/action";
import InfoModal from "./InfoModal";
import PasswordModal from "./PasswordModal";

const AvatarIcon = (props: any) => {
	const { setToken, userInfo } = props;
	const navigate = useNavigate();
	const { photo } = userInfo || {};
	interface ModalProps {
		showModal: (params: { name: number }) => void;
	}
	const passRef = useRef<ModalProps>(null);
	const infoRef = useRef<ModalProps>(null);

	// 退出登录
	const logout = () => {
		Modal.confirm({
			title: "温馨提示 🧡",
			icon: <ExclamationCircleOutlined />,
			content: "是否确认退出登录？",
			okText: "确认",
			cancelText: "取消",
			onOk: async () => {
				// 此时需要请求服务器端退出登录接口
				const { status, result } = await logoutApi();
				if (status && status.code == 0 && result) {
					// 退出跳转到登录页
					setToken("");
					message.success("退出登录成功！");
					navigate("/login");
				} else {
					message.success("退出登录失败:" + status?.msg);
				}
			}
		});
	};

	const items: MenuProps["items"] = [
		{
			key: "1",
			label: <span className="dropdown-item">首页</span>,
			onClick: () => navigate(HOME_URL)
		},
		{
			key: "2",
			label: <span className="dropdown-item">个人信息</span>,
			onClick: () => infoRef.current!.showModal({ name: 11 })
		},
		{
			key: "3",
			label: <span className="dropdown-item">修改密码</span>,
			onClick: () => passRef.current!.showModal({ name: 11 })
		},
		{
			type: "divider"
		},
		{
			key: "4",
			label: <span className="dropdown-item">退出登录</span>,
			onClick: logout
		}
	];
	return (
		<>
			<Dropdown menu={{ items }} placement="bottom" arrow trigger={["click"]}>
				<Avatar size="large" src={photo || loginPng} />
			</Dropdown>
			<InfoModal innerRef={infoRef}></InfoModal>
			<PasswordModal innerRef={passRef}></PasswordModal>
		</>
	);
};

const mapDispatchToProps = { setToken };
export default connect(null, mapDispatchToProps)(AvatarIcon);
