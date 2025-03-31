/* eslint-disable simple-import-sort/imports */
/* eslint-disable prettier/prettier */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CloseCircleOutlined, LockOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Form, Input, message } from "antd";

import { Login } from "@/api/interface";
import { loginApi } from "@/api/modules/login";
import { HOME_URL } from "@/config/config";
import { useAppDispatch } from "@/hooks/useRTK";
import type { AppDispatch } from "@/rtk";
import { store, setToken, setTabsList, setUserInfo, getDiscListAction } from "@/rtk";

const LoginForm = () => {
	const navigate = useNavigate();
	const [form] = Form.useForm();
	const [loading, setLoading] = useState<boolean>(false);

	const dispatch: AppDispatch = useAppDispatch();

	// 登录
	const onFinish = async (loginForm: Login.ReqLoginForm) => {
		try {
			// 开启 loading
			setLoading(true);
			// 发送登录请求
			const { status, result } = await loginApi(loginForm);
			if (status && status.code == 0 && result && result.userId > 0) {
				message.success("登录成功");

				// 用户登录信息
				dispatch(setUserInfo(result));
				// 使用 dispatch 来调用 setToken action，将 token 保存到 Redux 的状态中
				dispatch(setToken(result.userId));
				// tab 清空，可以采用 tab 的方式打开页面
				dispatch(setTabsList([]));
				// 强制 getDiscListAction 获取字典数据先执行
				// 否则 navigate 跳转到首页后，字典数据还没有获取到，会导致页面渲染不出来
				await dispatch(getDiscListAction());

				// 跳转到首页
				navigate(HOME_URL);
			} else {
				message.success("登录失败:" + status?.msg);
			}
		} finally {
			setLoading(false);
		}
	};

	const onFinishFailed = (errorInfo: any) => {
		console.log("Failed:", errorInfo);
	};

	return (
		<Form
			form={form}
			name="basic"
			labelCol={{ span: 5 }}
			initialValues={{ remember: true }}
			onFinish={onFinish}
			onFinishFailed={onFinishFailed}
			size="large"
			autoComplete="off"
		>
			<Form.Item name="username" rules={[{ required: true, message: "请输入用户名" }]}>
				<Input placeholder="用户名（admin）" prefix={<UserOutlined />} />
			</Form.Item>
			<Form.Item name="password" rules={[{ required: true, message: "请输入密码" }]}>
				<Input.Password autoComplete="new-password" placeholder="密码（微信搜 沉默王二 回复 002）" prefix={<LockOutlined />} />
			</Form.Item>
			<Form.Item className="login-btn">
				<Button
					onClick={() => {
						form.resetFields();
					}}
					icon={<CloseCircleOutlined />}
				>
					重置
				</Button>
				<Button type="primary" htmlType="submit" loading={loading} icon={<UserOutlined />}>
					登录
				</Button>
			</Form.Item>
		</Form>
	);
};

export default LoginForm;
