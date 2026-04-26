import { FC, useEffect, useMemo, useState } from "react";
import { ReloadOutlined, SaveOutlined } from "@ant-design/icons";
import {
	Alert,
	Button,
	Card,
	Checkbox,
	Col,
	Divider,
	Form,
	Input,
	InputNumber,
	message,
	Modal,
	Row,
	Select,
	Space,
	Typography
} from "antd";

import {
	AiConfigAdminDTO,
	AiConfigAdminReq,
	AISourceValue,
	getAiConfigDetailApi,
	saveAiConfigApi,
	testAiConfigApi
} from "@/api/modules/aiConfig";
import { ContentInterWrap, ContentWrap } from "@/components/common-wrap";

import "./index.scss";

const { Paragraph, Text, Title } = Typography;

interface AiConfigFormValues {
	sources: AISourceValue[];
	zhipu: {
		apiSecretKey: string;
		requestIdTemplate: string;
		model: string;
	};
	zhipuCoding: {
		apiKey: string;
		apiHost: string;
		model: string;
		timeout?: number | null;
	};
	xunFei: {
		hostUrl: string;
		domain: string;
		appId: string;
		apiKey: string;
		apiSecret: string;
		apiPassword: string;
	};
	deepSeek: {
		apiKey: string;
		apiHost: string;
		timeout?: number | null;
	};
	doubao: {
		apiKey: string;
		apiHost: string;
		endPoint: string;
	};
	ali: {
		model: string;
	};
}

const AI_SOURCE_OPTIONS: Array<{ label: string; value: AISourceValue }> = [
	{ label: "技术派默认", value: "PAI_AI" },
	{ label: "智谱", value: "ZHI_PU_AI" },
	{ label: "智谱 Coding", value: "ZHIPU_CODING" },
	{ label: "讯飞", value: "XUN_FEI_AI" },
	{ label: "阿里", value: "ALI_AI" },
	{ label: "DeepSeek", value: "DEEP_SEEK" },
	{ label: "豆包", value: "DOU_BAO_AI" }
];
const REMOVED_SOURCE_VALUES: AISourceValue[] = ["CHAT_GPT_3_5", "CHAT_GPT_4"];
const AI_SOURCE_LABEL_MAP = AI_SOURCE_OPTIONS.reduce<Record<AISourceValue, string>>((result, item) => {
	result[item.value] = item.label;
	return result;
}, {} as Record<AISourceValue, string>);
const AI_TEST_PROMPT = "你正在执行后台 AI 配置连通性测试。请忽略其他上下文，只输出“连接成功”。";
const ZHIPU_MODEL_OPTIONS = [
	{ value: "glm-5", label: "glm-5（官方当前推荐旗舰）" },
	{ value: "glm-4.7", label: "glm-4.7" },
	{ value: "glm-4.6", label: "glm-4.6" },
	{ value: "glm-4.5-air", label: "glm-4.5-air" },
	{ value: "glm-4.5-flash", label: "glm-4.5-flash" }
];
const ZHIPU_CODING_MODEL_OPTIONS = [
	{ value: "GLM-5", label: "GLM-5（官方当前推荐）" },
	{ value: "GLM-4.7", label: "GLM-4.7" },
	{ value: "GLM-4.6", label: "GLM-4.6" },
	{ value: "GLM-4.5-Air", label: "GLM-4.5-Air" }
];

const normalizeModelValue = (value?: string | string[] | null) => {
	if (Array.isArray(value)) {
		return value[value.length - 1] || "";
	}
	return value || "";
};

const modelSelectValueProps = (value?: string | string[] | null) => {
	const model = normalizeModelValue(value);
	return { value: model ? [model] : [] };
};

const defaultFormValues: AiConfigFormValues = {
	sources: [],
	zhipu: {
		apiSecretKey: "",
		requestIdTemplate: "",
		model: ""
	},
	zhipuCoding: {
		apiKey: "",
		apiHost: "",
		model: "GLM-5",
		timeout: undefined
	},
	xunFei: {
		hostUrl: "",
		domain: "",
		appId: "",
		apiKey: "",
		apiSecret: "",
		apiPassword: ""
	},
	deepSeek: {
		apiKey: "",
		apiHost: "",
		timeout: undefined
	},
	doubao: {
		apiKey: "",
		apiHost: "",
		endPoint: ""
	},
	ali: {
		model: ""
	}
};

const normalizeFormValues = (detail?: AiConfigAdminDTO): AiConfigFormValues => ({
	sources: (detail?.sources || []).filter(item => !REMOVED_SOURCE_VALUES.includes(item)),
	zhipu: {
		apiSecretKey: detail?.zhipu?.apiSecretKey || "",
		requestIdTemplate: detail?.zhipu?.requestIdTemplate || "",
		model: detail?.zhipu?.model || ""
	},
	zhipuCoding: {
		apiKey: detail?.zhipuCoding?.apiKey || "",
		apiHost: detail?.zhipuCoding?.apiHost || "",
		model: detail?.zhipuCoding?.model || "GLM-5",
		timeout: detail?.zhipuCoding?.timeout
	},
	xunFei: {
		hostUrl: detail?.xunFei?.hostUrl || "",
		domain: detail?.xunFei?.domain || "",
		appId: detail?.xunFei?.appId || "",
		apiKey: detail?.xunFei?.apiKey || "",
		apiSecret: detail?.xunFei?.apiSecret || "",
		apiPassword: detail?.xunFei?.apiPassword || ""
	},
	deepSeek: {
		apiKey: detail?.deepSeek?.apiKey || "",
		apiHost: detail?.deepSeek?.apiHost || "",
		timeout: detail?.deepSeek?.timeout
	},
	doubao: {
		apiKey: detail?.doubao?.apiKey || "",
		apiHost: detail?.doubao?.apiHost || "",
		endPoint: detail?.doubao?.endPoint || ""
	},
	ali: {
		model: detail?.ali?.model || ""
	}
});

const AiConfigPage: FC = () => {
	const [formRef] = Form.useForm<AiConfigFormValues>();
	const [loading, setLoading] = useState<boolean>(false);
	const [saving, setSaving] = useState<boolean>(false);
	const [testingProvider, setTestingProvider] = useState<AISourceValue | null>(null);

	const sourceOptions = useMemo(
		() =>
			AI_SOURCE_OPTIONS.map(item => ({
				...item,
				label: <span className="ai-config-page__source-option">{item.label}</span>
			})),
		[]
	);

	const loadDetail = async () => {
		setLoading(true);
		try {
			const { status, result } = await getAiConfigDetailApi();
			if (status?.code === 0) {
				formRef.setFieldsValue(normalizeFormValues(result));
				return;
			}
			message.error(status?.msg || "加载 AI 模型配置失败");
		} catch (error) {
			message.error("加载 AI 模型配置失败，请稍后重试");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		formRef.setFieldsValue(defaultFormValues);
		loadDetail();
	}, []);

	const buildPayload = (values: AiConfigFormValues): AiConfigAdminReq => ({
		sources: (values.sources || []).filter(item => !REMOVED_SOURCE_VALUES.includes(item)),
		zhipu: {
			apiSecretKey: values.zhipu.apiSecretKey || "",
			requestIdTemplate: values.zhipu.requestIdTemplate || "",
			model: values.zhipu.model || ""
		},
		zhipuCoding: {
			apiKey: values.zhipuCoding.apiKey || "",
			apiHost: values.zhipuCoding.apiHost || "",
			model: values.zhipuCoding.model || "",
			timeout: values.zhipuCoding.timeout ?? undefined
		},
		xunFei: {
			hostUrl: values.xunFei.hostUrl || "",
			domain: values.xunFei.domain || "",
			appId: values.xunFei.appId || "",
			apiKey: values.xunFei.apiKey || "",
			apiSecret: values.xunFei.apiSecret || "",
			apiPassword: values.xunFei.apiPassword || ""
		},
		deepSeek: {
			apiKey: values.deepSeek.apiKey || "",
			apiHost: values.deepSeek.apiHost || "",
			timeout: values.deepSeek.timeout ?? undefined
		},
		doubao: {
			apiKey: values.doubao.apiKey || "",
			apiHost: values.doubao.apiHost || "",
			endPoint: values.doubao.endPoint || ""
		},
		ali: {
			model: values.ali.model || ""
		}
	});

	const persistConfig = async (showSuccessMessage = true, reloadAfterSave = true) => {
		const values = await formRef.validateFields();
		const payload = buildPayload(values);
		const { status } = await saveAiConfigApi(payload);
		if (status?.code !== 0) {
			message.error(status?.msg || "AI 模型配置保存失败");
			return false;
		}
		if (showSuccessMessage) {
			message.success("AI 模型配置保存成功");
		}
		if (reloadAfterSave) {
			loadDetail();
		}
		return true;
	};

	const handleSave = async () => {
		setSaving(true);
		try {
			await persistConfig(true, true);
		} catch (error) {
			message.error("AI 模型配置保存失败，请稍后重试");
		} finally {
			setSaving(false);
		}
	};

	const handleTestProvider = async (provider: AISourceValue) => {
		setTestingProvider(provider);
		try {
			const saved = await persistConfig(false, false);
			if (!saved) {
				return;
			}

			const { status, result } = await testAiConfigApi({
				source: provider,
				prompt: AI_TEST_PROMPT
			});
			if (status?.code !== 0) {
				message.error(status?.msg || `${AI_SOURCE_LABEL_MAP[provider]} 连通测试失败`);
				return;
			}

			if (result?.success) {
				Modal.success({
					title: `${AI_SOURCE_LABEL_MAP[provider]} 连通测试成功`,
					content: (
						<div className="ai-config-page__test-result">
							<Text type="secondary">模型返回内容</Text>
							<Paragraph copyable={{ text: result.answer || "" }} className="ai-config-page__test-result-text">
								{result.answer || result.message || "连接成功"}
							</Paragraph>
						</div>
					)
				});
				return;
			}

			Modal.error({
				title: `${AI_SOURCE_LABEL_MAP[provider]} 连通测试失败`,
				content: result?.message || "未拿到有效响应，请检查当前配置"
			});
		} catch (error) {
			message.error(`${AI_SOURCE_LABEL_MAP[provider]} 连通测试失败，请稍后重试`);
		} finally {
			setTestingProvider(null);
		}
	};

	const renderTestButton = (provider: AISourceValue) => (
		<Button size="small" loading={testingProvider === provider} onClick={() => handleTestProvider(provider)}>
			保存并测试
		</Button>
	);

	const renderTestingHint = (provider: AISourceValue) =>
		testingProvider === provider ? <Text type="secondary">正在保存当前配置并执行连通测试...</Text> : null;

	return (
		<div className="ai-config-page">
			<ContentWrap>
				<ContentInterWrap>
					<div className="ai-config-page__toolbar">
						<div className="ai-config-page__toolbar-meta">
							<Title level={4} style={{ marginBottom: 8 }}>
								AI 模型配置
							</Title>
							<Paragraph type="secondary" style={{ marginBottom: 0 }}>
								这里单独维护 admin 端使用的 AI 模型配置，会直接读取并保存后端新增的 AI 配置接口，不再和通用全局配置项混在一起。
							</Paragraph>
						</div>
						<Space className="ai-config-page__toolbar-actions">
							<Button icon={<ReloadOutlined />} onClick={loadDetail} loading={loading}>
								刷新
							</Button>
							<Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
								保存配置
							</Button>
						</Space>
					</div>

					<Alert
						showIcon
						type="info"
						message="配置说明"
						description="当前 admin 端已移除 ChatGPT 配置入口。连通测试会先保存当前页面配置，再调用后端 AI 配置测试接口执行真实探测。"
					/>

					<Form form={formRef} layout="vertical" initialValues={defaultFormValues} disabled={loading}>
						<Card className="ai-config-page__section-card" title="启用模型源">
							<Form.Item
								label="当前启用的模型"
								name="sources"
								rules={[{ required: true, type: "array", min: 1, message: "请至少选择一个启用的模型源" }]}
							>
								<Checkbox.Group className="ai-config-page__source-group" options={sourceOptions} />
							</Form.Item>
							<Text type="secondary">这里控制后端可参与路由和降级选择的 AI Source 列表。</Text>
						</Card>

						<div className="ai-config-page__section-grid">
							<Card className="ai-config-page__section-card" title="智谱" extra={renderTestButton("ZHI_PU_AI")}>
								<Form.Item label="API Secret Key" name={["zhipu", "apiSecretKey"]}>
									<Input.Password allowClear placeholder="请输入智谱 API Secret Key" />
								</Form.Item>
								<Form.Item label="Request ID 模板" name={["zhipu", "requestIdTemplate"]}>
									<Input allowClear placeholder="例如：paicoding-%d" />
								</Form.Item>
								<Form.Item
									label="模型名"
									name={["zhipu", "model"]}
									extra="当前后端智谱配置未开放 Base URL，默认走智谱 SDK 内置地址；这里提供官方常用模型，也支持手动输入新编码。"
									getValueProps={modelSelectValueProps}
									getValueFromEvent={normalizeModelValue}
								>
									<Select
										showSearch
										mode="tags"
										options={ZHIPU_MODEL_OPTIONS}
										placeholder="请选择或输入智谱模型编码，例如：glm-5"
										filterOption={(inputValue, option) =>
											Boolean(
												option?.value?.toString().toUpperCase().includes(inputValue.toUpperCase()) ||
													option?.label?.toString().toUpperCase().includes(inputValue.toUpperCase())
											)
										}
									/>
								</Form.Item>
								{renderTestingHint("ZHI_PU_AI")}
							</Card>

							<Card className="ai-config-page__section-card" title="智谱 Coding" extra={renderTestButton("ZHIPU_CODING")}>
								<Form.Item label="API Key" name={["zhipuCoding", "apiKey"]}>
									<Input.Password allowClear placeholder="请输入智谱 Coding API Key" />
								</Form.Item>
								<Form.Item label="API Host" name={["zhipuCoding", "apiHost"]} extra="这里可配置智谱 Coding 的 Base URL。">
									<Input allowClear placeholder="例如：https://open.bigmodel.cn/api/coding/paas/v4" />
								</Form.Item>
								<Form.Item
									label="模型名"
									name={["zhipuCoding", "model"]}
									getValueProps={modelSelectValueProps}
									getValueFromEvent={normalizeModelValue}
								>
									<Select
										showSearch
										mode="tags"
										options={ZHIPU_CODING_MODEL_OPTIONS}
										placeholder="请选择或输入模型编码，例如：GLM-5"
										filterOption={(inputValue, option) =>
											Boolean(
												option?.value?.toString().toUpperCase().includes(inputValue.toUpperCase()) ||
													option?.label?.toString().toUpperCase().includes(inputValue.toUpperCase())
											)
										}
									/>
								</Form.Item>
								<Form.Item label="超时时间" name={["zhipuCoding", "timeout"]}>
									<InputNumber className="ai-config-page__number-input" min={0} precision={0} placeholder="单位：毫秒" />
								</Form.Item>
								{renderTestingHint("ZHIPU_CODING")}
							</Card>

							<Card className="ai-config-page__section-card" title="讯飞" extra={renderTestButton("XUN_FEI_AI")}>
								<Row gutter={[16, 0]}>
									<Col xs={24} md={12}>
										<Form.Item label="Host URL" name={["xunFei", "hostUrl"]}>
											<Input allowClear placeholder="请输入讯飞 Host URL" />
										</Form.Item>
									</Col>
									<Col xs={24} md={12}>
										<Form.Item label="Domain" name={["xunFei", "domain"]}>
											<Input allowClear placeholder="例如：generalv3.5" />
										</Form.Item>
									</Col>
									<Col xs={24} md={12}>
										<Form.Item label="App ID" name={["xunFei", "appId"]}>
											<Input allowClear placeholder="请输入讯飞 App ID" />
										</Form.Item>
									</Col>
									<Col xs={24} md={12}>
										<Form.Item label="API Key" name={["xunFei", "apiKey"]}>
											<Input.Password allowClear placeholder="请输入讯飞 API Key" />
										</Form.Item>
									</Col>
									<Col xs={24} md={12}>
										<Form.Item label="API Secret" name={["xunFei", "apiSecret"]}>
											<Input.Password allowClear placeholder="请输入讯飞 API Secret" />
										</Form.Item>
									</Col>
									<Col xs={24} md={12}>
										<Form.Item label="API Password" name={["xunFei", "apiPassword"]}>
											<Input.Password allowClear placeholder="请输入讯飞 API Password" />
										</Form.Item>
									</Col>
								</Row>
								<Text type="secondary">这里的测试会直接调用后端新增的 AI 配置测试接口。</Text>
							</Card>

							<Card className="ai-config-page__section-card" title="DeepSeek" extra={renderTestButton("DEEP_SEEK")}>
								<Form.Item label="API Key" name={["deepSeek", "apiKey"]}>
									<Input.Password allowClear placeholder="请输入 DeepSeek API Key" />
								</Form.Item>
								<Form.Item label="API Host" name={["deepSeek", "apiHost"]}>
									<Input allowClear placeholder="例如：https://api.deepseek.com" />
								</Form.Item>
								<Form.Item label="超时时间" name={["deepSeek", "timeout"]}>
									<InputNumber className="ai-config-page__number-input" min={0} precision={0} placeholder="单位：毫秒" />
								</Form.Item>
								{renderTestingHint("DEEP_SEEK")}
							</Card>

							<Card className="ai-config-page__section-card" title="豆包" extra={renderTestButton("DOU_BAO_AI")}>
								<Form.Item label="API Key" name={["doubao", "apiKey"]}>
									<Input.Password allowClear placeholder="请输入豆包 API Key" />
								</Form.Item>
								<Form.Item label="API Host" name={["doubao", "apiHost"]}>
									<Input allowClear placeholder="请输入豆包 API Host" />
								</Form.Item>
								<Form.Item label="End Point" name={["doubao", "endPoint"]}>
									<Input allowClear placeholder="请输入豆包 End Point" />
								</Form.Item>
								{renderTestingHint("DOU_BAO_AI")}
							</Card>
						</div>

						<Divider />

						<Card className="ai-config-page__section-card" title="阿里" extra={renderTestButton("ALI_AI")}>
							<Form.Item label="模型名" name={["ali", "model"]}>
								<Input allowClear placeholder="请输入阿里模型名" />
							</Form.Item>
							{renderTestingHint("ALI_AI")}
						</Card>
					</Form>
				</ContentInterWrap>
			</ContentWrap>
		</div>
	);
};

export default AiConfigPage;
