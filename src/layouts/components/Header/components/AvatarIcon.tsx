/* eslint-disable prettier/prettier */
import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { Avatar, Dropdown, MenuProps, message, Modal } from "antd";

import { logoutApi } from "@/api/modules/login";
import loginPng from "@/assets/images/logo_md.png";
import { HOME_URL, LOGIN_URL } from "@/config/config";
import { useAppDispatch, useAppSelector } from "@/hooks/useRTK";
import type { AppDispatch, RootState } from "@/rtk";
import { setToken, setUserInfo } from "@/rtk";
import InfoModal from "./InfoModal";
import PasswordModal from "./PasswordModal";

const AvatarIcon = () => {
	const { userInfo } = useAppSelector((state: RootState) => state.global);
	const dispatch: AppDispatch = useAppDispatch();
	console.log("AvatarIcon setToken setUserInfo", setToken, setUserInfo);
	console.log("AvatarIcon userInfo", userInfo);

	const navigate = useNavigate();

	interface ModalProps {
		showModal: (params: Record<string, any>) => void;
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
					// 退出，清除 token，清除用户信息，跳转到登录页
					dispatch(setToken(""));
					dispatch(setUserInfo({}));
					message.success("退出登录成功！");
					navigate(LOGIN_URL);
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
			onClick: () =>
				infoRef.current!.showModal({
					photo: userInfo.photo,
					profile: userInfo.profile,
					role: userInfo.role,
					userName: userInfo.userName
				})
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
				<Avatar size="large" src={userInfo.photo || loginPng} />
			</Dropdown>
			<InfoModal innerRef={infoRef}></InfoModal>
			<PasswordModal innerRef={passRef}></PasswordModal>
		</>
	);
};

export default AvatarIcon;
