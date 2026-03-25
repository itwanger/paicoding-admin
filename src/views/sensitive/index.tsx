import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { CheckOutlined, DeleteOutlined, ReloadOutlined, SaveOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Empty, Form, Input, message, Modal, Space, Switch, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";

import {
	clearSensitiveWordHitApi,
	getSensitiveWordDetailApi,
	getSensitiveWordHitListApi,
	saveSensitiveWordConfigApi,
	SensitiveWordConfigDTO,
	SensitiveWordHitDTO
} from "@/api/modules/sensitive";
import { ContentInterWrap, ContentWrap } from "@/components/common-wrap";
import { initPagination, IPagination } from "@/enums/common";

import "./index.scss";

const { TextArea } = Input;

interface IProps {}

interface SensitiveWordFormValues {
	enable: boolean;
	denyWordsText: string;
	allowWordsText: string;
}

const defaultDetail: SensitiveWordConfigDTO = {
	enable: false,
	denyWords: [],
	allowWords: [],
	hitTotal: 0,
	hitWords: []
};

const defaultFormValues: SensitiveWordFormValues = {
	enable: false,
	denyWordsText: "",
	allowWordsText: ""
};

const joinWordText = (words: string[] = []) => words.join("\n");

const splitWordText = (value?: string) =>
	Array.from(
		new Set(
			(value || "")
				.split(/[\n,，]/)
				.map(item => item.trim())
				.filter(Boolean)
		)
	);

const Sensitive: FC<IProps> = () => {
	const [formRef] = Form.useForm<SensitiveWordFormValues>();
	const allowWordsText = Form.useWatch("allowWordsText", formRef);
	const [detail, setDetail] = useState<SensitiveWordConfigDTO>(defaultDetail);
	const [hitWords, setHitWords] = useState<SensitiveWordHitDTO[]>([]);
	const [selectedHitWords, setSelectedHitWords] = useState<string[]>([]);
	const [loading, setLoading] = useState(false);
	const [hitLoading, setHitLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [addingWord, setAddingWord] = useState<string>("");
	const [clearingWord, setClearingWord] = useState<string>("");
	const [batchAdding, setBatchAdding] = useState(false);
	const [batchClearing, setBatchClearing] = useState(false);
	const [hitPagination, setHitPagination] = useState<IPagination>(initPagination);
	const allowWordSet = useMemo(() => new Set(splitWordText(allowWordsText)), [allowWordsText]);
	const { current: hitCurrent, pageSize: hitPageSize, total: hitTotal = 0 } = hitPagination;

	const hitPaginationInfo = {
		showSizeChanger: true,
		showTotal: (total: number) => `共 ${total || 0} 条`,
		...hitPagination,
		onChange: (current: number, pageSize: number) => {
			setHitPagination(prev => ({ ...prev, current, pageSize }));
		}
	};

	const syncForm = useCallback(
		(config: SensitiveWordConfigDTO) => {
			formRef.setFieldsValue({
				enable: Boolean(config.enable),
				denyWordsText: joinWordText(config.denyWords),
				allowWordsText: joinWordText(config.allowWords)
			});
		},
		[formRef]
	);

	const fetchDetail = useCallback(async () => {
		setLoading(true);
		try {
			const { result } = await getSensitiveWordDetailApi();
			const nextDetail: SensitiveWordConfigDTO = {
				enable: Boolean(result?.enable),
				denyWords: result?.denyWords || [],
				allowWords: result?.allowWords || [],
				hitTotal: Number(result?.hitTotal || 0),
				hitWords: []
			};
			setDetail(nextDetail);
			syncForm(nextDetail);
		} finally {
			setLoading(false);
		}
	}, [syncForm]);

	const fetchHitWords = useCallback(async (pageNumber: number, pageSize: number) => {
		setHitLoading(true);
		try {
			const { result } = await getSensitiveWordHitListApi({ pageNumber, pageSize });
			const list = result?.list || [];
			const resPageNum = Number(result?.pageNum || pageNumber);
			const resPageSize = Number(result?.pageSize || pageSize);
			const total = Number(result?.total || 0);
			const pageTotal = Number(result?.pageTotal || 0);

			if (total > 0 && pageTotal > 0 && pageNumber > pageTotal) {
				setHitPagination(prev => ({ ...prev, current: pageTotal, pageSize: resPageSize, total }));
				return;
			}

			setHitWords(list);
			setHitPagination(prev => ({ ...prev, current: resPageNum, pageSize: resPageSize, total }));
		} finally {
			setHitLoading(false);
		}
	}, []);

	useEffect(() => {
		void fetchDetail();
	}, [fetchDetail]);

	useEffect(() => {
		void fetchHitWords(hitCurrent, hitPageSize);
	}, [fetchHitWords, hitCurrent, hitPageSize]);

	useEffect(() => {
		setSelectedHitWords(prev => prev.filter(word => hitWords.some(item => item.word === word)));
	}, [hitWords]);

	const getConfigPayload = async () => {
		const values = await formRef.validateFields();
		return {
			enable: Boolean(values.enable),
			denyWords: splitWordText(values.denyWordsText),
			allowWords: splitWordText(values.allowWordsText)
		};
	};

	const refreshPageData = async () => {
		await fetchDetail();
		await fetchHitWords(hitCurrent, hitPageSize);
	};

	const clearHitWords = async (words: string[]) => {
		await Promise.all(words.map(word => clearSensitiveWordHitApi(word)));
	};

	const handleSave = async () => {
		const payload = await getConfigPayload();
		setSaving(true);
		try {
			await saveSensitiveWordConfigApi(payload);
			message.success("敏感词配置保存成功");
			await refreshPageData();
		} finally {
			setSaving(false);
		}
	};

	const handleAddToAllowList = async (word: string) => {
		const currentWord = word.trim();
		if (!currentWord) {
			return;
		}

		const payload = await getConfigPayload();
		if (payload.allowWords.includes(currentWord)) {
			message.info("该词已经在白名单中了");
			return;
		}

		setAddingWord(currentWord);
		try {
			await saveSensitiveWordConfigApi({
				...payload,
				allowWords: [...payload.allowWords, currentWord]
			});
			await clearSensitiveWordHitApi(currentWord);
			message.success("已加入白名单");
			await refreshPageData();
		} finally {
			setAddingWord("");
		}
	};

	const handleClearHitWord = (word: string) => {
		Modal.warning({
			title: `确认清理“${word}”的命中统计吗`,
			content: "清理后会移除当前词的命中记录，请谨慎操作。",
			maskClosable: true,
			closable: true,
			onOk: async () => {
				setClearingWord(word);
				try {
					await clearHitWords([word]);
					message.success("命中统计已清理");
					await refreshPageData();
				} finally {
					setClearingWord("");
				}
			}
		});
	};

	const handleBatchAddToAllowList = () => {
		if (!selectedHitWords.length) {
			message.info("请先选择命中词");
			return;
		}

		Modal.warning({
			title: `确认将选中的 ${selectedHitWords.length} 个命中词加入白名单吗`,
			content: "加入后会一并清理这些词的命中统计，请谨慎操作。",
			maskClosable: true,
			closable: true,
			onOk: async () => {
				const payload = await getConfigPayload();
				const newWords = selectedHitWords.filter(word => !payload.allowWords.includes(word));
				if (!newWords.length) {
					message.info("所选词都已经在白名单中了");
					return;
				}

				setBatchAdding(true);
				try {
					await saveSensitiveWordConfigApi({
						...payload,
						allowWords: [...payload.allowWords, ...newWords]
					});
					await clearHitWords(newWords);
					setSelectedHitWords([]);
					message.success(`已批量加入白名单 ${newWords.length} 项`);
					await refreshPageData();
				} finally {
					setBatchAdding(false);
				}
			}
		});
	};

	const handleBatchClearHitWords = () => {
		if (!selectedHitWords.length) {
			message.info("请先选择命中词");
			return;
		}

		Modal.warning({
			title: `确认清理选中的 ${selectedHitWords.length} 条命中统计吗`,
			content: "清理后会移除这些词的命中记录，请谨慎操作。",
			maskClosable: true,
			closable: true,
			onOk: async () => {
				setBatchClearing(true);
				try {
					await clearHitWords(selectedHitWords);
					setSelectedHitWords([]);
					message.success(`已清理 ${selectedHitWords.length} 条命中统计`);
					await refreshPageData();
				} finally {
					setBatchClearing(false);
				}
			}
		});
	};

	const hitRowSelection = {
		selectedRowKeys: selectedHitWords,
		onChange: (selectedRowKeys: Array<string | number>) => {
			setSelectedHitWords(selectedRowKeys.map(key => String(key)));
		}
	};

	const columns: ColumnsType<SensitiveWordHitDTO> = [
		{
			title: "命中词",
			dataIndex: "word",
			key: "word",
			render: word => <Tag color="red">{word}</Tag>
		},
		{
			title: "命中次数",
			dataIndex: "hitCount",
			key: "hitCount",
			width: 120,
			render: hitCount => <span className="sensitive-page__hit-count">{hitCount || 0}</span>
		},
		{
			title: "操作",
			key: "action",
			width: 200,
			render: (_, item) => (
				<div className="sensitive-page__table-actions">
					<Button
						type="link"
						className="sensitive-page__action-btn"
						icon={<CheckOutlined />}
						disabled={allowWordSet.has(item.word)}
						loading={addingWord === item.word}
						onClick={() => handleAddToAllowList(item.word)}
					>
						{allowWordSet.has(item.word) ? "已在白名单" : "加入白名单"}
					</Button>
					<Button
						type="link"
						className="sensitive-page__action-btn"
						danger
						icon={<DeleteOutlined />}
						loading={clearingWord === item.word}
						onClick={() => handleClearHitWord(item.word)}
					>
						清理
					</Button>
				</div>
			)
		}
	];

	return (
		<div className="banner sensitive-page">
			<ContentWrap className="sensitive-page__wrap" style={{ height: "auto", minHeight: "100%", overflowY: "visible" }}>
				<ContentInterWrap className="sensitive-page__panel">
					<div className="sensitive-page__hero">
						<div>
							<div className="sensitive-page__eyebrow">Content Safety</div>
							<h2 className="sensitive-page__title">敏感词管理</h2>
							<p className="sensitive-page__desc">
								统一维护敏感词开关、拦截词库、白名单，以及线上命中统计。词条支持换行、英文逗号、中文逗号分隔。
							</p>
						</div>
						<Space wrap>
							<Button icon={<ReloadOutlined />} loading={loading || hitLoading} onClick={refreshPageData}>
								刷新
							</Button>
							<Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
								保存配置
							</Button>
						</Space>
					</div>

					<div className="sensitive-page__stats">
						<div className="sensitive-page__stat-card">
							<span>当前状态</span>
							<strong>{detail.enable ? "已启用" : "已关闭"}</strong>
						</div>
						<div className="sensitive-page__stat-card">
							<span>敏感词数量</span>
							<strong>{detail.denyWords.length}</strong>
						</div>
						<div className="sensitive-page__stat-card">
							<span>白名单数量</span>
							<strong>{detail.allowWords.length}</strong>
						</div>
						<div className="sensitive-page__stat-card">
							<span>命中词条</span>
							<strong>{detail.hitTotal ?? hitTotal}</strong>
						</div>
					</div>

					<Alert
						showIcon
						type={detail.enable ? "success" : "warning"}
						message={detail.enable ? "敏感词检测已开启，命中词会参与替换与统计。" : "敏感词检测当前关闭，保存后可立即启用。"}
					/>

					<div className="sensitive-page__content">
						<Card title="规则配置" bordered={false} className="sensitive-page__card">
							<Form form={formRef} layout="vertical" initialValues={defaultFormValues}>
								<Form.Item label="启用敏感词检测" name="enable" valuePropName="checked">
									<Switch checkedChildren="开启" unCheckedChildren="关闭" />
								</Form.Item>
								<div className="sensitive-page__form-grid">
									<Form.Item label="敏感词名单" name="denyWordsText" extra="保存时会自动去重并清理空白词条。">
										<TextArea rows={10} showCount placeholder={"广告\n引流\n兼职"} />
									</Form.Item>
									<Form.Item label="白名单" name="allowWordsText" extra="命中后需要放行的词可加入白名单。">
										<TextArea rows={10} showCount placeholder={"技术派\n开源项目"} />
									</Form.Item>
								</div>
							</Form>
						</Card>

						<Card
							title="命中统计"
							bordered={false}
							className="sensitive-page__card sensitive-page__table-card"
							extra={
								<Space size="small" wrap>
									<Button
										icon={<CheckOutlined />}
										disabled={!selectedHitWords.length}
										loading={batchAdding}
										onClick={handleBatchAddToAllowList}
									>
										批量加入白名单
									</Button>
									<Button
										danger
										icon={<DeleteOutlined />}
										disabled={!selectedHitWords.length}
										loading={batchClearing}
										onClick={handleBatchClearHitWords}
									>
										批量清理
									</Button>
									<Tag color={selectedHitWords.length ? "processing" : hitTotal ? "processing" : "default"}>
										{selectedHitWords.length ? `已选 ${selectedHitWords.length} 项` : hitTotal ? `共 ${hitTotal} 项` : "暂无命中"}
									</Tag>
								</Space>
							}
						>
							{hitTotal ? (
								<Table
									rowKey="word"
									size="small"
									rowSelection={hitRowSelection}
									columns={columns}
									dataSource={hitWords}
									pagination={hitPaginationInfo}
									loading={hitLoading || batchAdding || batchClearing}
								/>
							) : (
								<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无命中统计" />
							)}
						</Card>
					</div>
				</ContentInterWrap>
			</ContentWrap>
		</div>
	);
};

const mapStateToProps = (state: any) => state.disc.disc;
const mapDispatchToProps = {};
export default connect(mapStateToProps, mapDispatchToProps)(Sensitive);
