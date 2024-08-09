/* eslint-disable prettier/prettier */
import { FC, useCallback, useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { DeleteOutlined, DownloadOutlined, EditOutlined, InboxOutlined, UploadOutlined } from "@ant-design/icons";
import { Button, Drawer, Form, Input, message, Modal, Space, Table, Tag, Upload } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import { uploadFileUrl } from "@/api/modules/common";
import { delResumeApi, downResumeApi, getResumeListApi, replayResumeApi } from "@/api/modules/resume";
import { ContentInterWrap, ContentWrap } from "@/components/common-wrap";
import { initPagination, IPagination, UpdateEnum } from "@/enums/common";
import { MapItem } from "@/typings/common";
import { baseDomain } from "@/utils/util";
import Search from "./components/search";

import "./index.scss";

interface DataType {
	resumeId: number;
	resumeName: string;
	resumeUrl: string;
	replayUrl: string;
	uname: string;
	uid: number;
	tag: string;
	status: number;
	type: string;
	typeVal: number;
}

const { Dragger } = Upload;

interface IProps {}

export interface IFormType {
	userId: number; // 为0时，是保存，非0是更新
	uname: string; // 用户名
	type: number; // 类型
}

const defaultInitForm: IFormType = {
	userId: -1,
	uname: "",
	type: 0
};

const Resume: FC<IProps> = props => {
	const [formRef] = Form.useForm();
	// form值
	const [form, setForm] = useState<IFormType>(defaultInitForm);
	// 查询表单值
	const [searchForm, setSearchForm] = useState<IFormType>(defaultInitForm);
	// 抽屉
	const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
	// 列表数据
	const [tableData, setTableData] = useState<DataType[]>([]);
	// 刷新函数
	const [query, setQuery] = useState<number>(0);

	//当前的状态
	const [status, setStatus] = useState<UpdateEnum>(UpdateEnum.Save);

	const [currentResume, setCurrentResume] = useState<any>();
	const [replayUrl, setReplayUrl] = useState<string>();

	// 分页
	const [pagination, setPagination] = useState<IPagination>(initPagination);
	const { current, pageSize, total } = pagination;
	const paginationInfo = {
		...pagination,
		showSizeChanger: true,
		showTotal: (total: number) => `共 ${total || 0} 条`,
		onChange: (current: number, pageSize: number) => {
			setPagination({ current, pageSize });
		}
	};

	const { userId, uname, type } = form;

	const onSure = useCallback(() => {
		setQuery(prev => prev + 1);
	}, []);

	// 下载简历附件
	const handleDownload = async (item: MapItem) => {
		let { resumeUrl, resumeName, resumeId, uname } = item;
		if (resumeUrl) {
			if (!resumeUrl.startsWith("http")) {
				resumeUrl = `${baseDomain}${resumeUrl}`;
			}
			fetch(resumeUrl).then(res =>
				res.blob().then(async blob => {
					let a = document.createElement("a");
					let url = window.URL.createObjectURL(blob);
					let filename = res.headers.get("Content-Disposition");
					filename = `${uname}-${resumeName}`; //提 取文件名
					console.log("下载文件并准备重命名", filename);
					a.href = url;
					a.download = filename; //给下载下来的文件起个名字
					a.click();
					window.URL.revokeObjectURL(url);
					a = null;

					await updateResumeStatus(item);
				})
			);
		}
	};
	// 下载附件之后，将状态更新为处理中
	const updateResumeStatus = async (item: MapItem) => {
		if (item.typeVal == 0) {
			// 将状态更新为处理中
			const { status } = await downResumeApi(item.resumeId);
			const { code, msg } = status || {};
			console.log();
			if (code === 0) {
				message.success("已下载");
				onSure();
			} else {
				message.error(msg);
			}
		}
	};
	// 值改变
	const handleChange = (item: MapItem) => {
		setForm({ ...form, ...item });
	};
	// 查询表单值改变
	const handleSearchChange = (item: MapItem) => {
		console.log("表达查询值发生变更!");
		setSearchForm({ ...searchForm, ...item });
	};
	// 点击搜索按钮时触发搜索
	const handleSearch = () => {
		console.log("执行搜索");
		// setPagination(initPagination);
		onSure();
	};
	// 显示抽屉
	const handleShowDrawer = (item: any) => {
		setCurrentResume(item);
		setIsDrawerOpen(true);
		setReplayUrl("");
	};
	// 抽屉关闭
	const handleClose = () => {
		setIsDrawerOpen(false);
	};
	// 删除
	const handleDel = (resumeId: number) => {
		console.log("删除的简历id -> ", resumeId);
		Modal.warning({
			title: "确认删除此简历么",
			content: "删除后无法恢复，请谨慎操作！",
			maskClosable: true,
			closable: true,
			onOk: async () => {
				const { status } = await delResumeApi(resumeId);
				const { code, msg } = status || {};
				console.log();
				if (code === 0) {
					message.success("删除成功");
					onSure();
				} else {
					message.error(msg);
				}
			}
		});
	};

	const handleSubmit = async () => {
		const values = await formRef.validateFields();
		const newValues = {
			...values,
			resumeId: currentResume.resumeId
		};
		if (replayUrl) {
			newValues["replayUrl"] = replayUrl;
		}
		console.log("提交回复的内容: ", newValues);
		const { status: successStatus } = (await replayResumeApi(newValues)) || {};
		const { code, msg } = successStatus || {};
		if (code === 0) {
			setIsDrawerOpen(false);
			setPagination({ current: 1, pageSize });
			onSure();
		} else {
			message.error(msg);
		}
	};

	// 数据请求
	useEffect(() => {
		const getSortList = async () => {
			const { status, result } = await getResumeListApi({
				...searchForm,
				pageNumber: current,
				pageSize
			});

			const { code } = status || {};
			//@ts-ignore
			const { list, pageNum, pageSize: resPageSize, pageTotal, total } = result || {};
			if (total != pagination.total || Number(pageNum) != pagination.current || resPageSize != pagination.pageSize) {
				console.log("刷新分页信息!", pagination, total, pageNum, resPageSize);
				setPagination({ current: Number(pageNum), pageSize: resPageSize, total });
			}
			if (code === 0) {
				const newList = list.map((item: MapItem) => ({
					key: item.resume.resumeId,
					resumeId: item.resume.resumeId,
					uname: item.user.name,
					uavatar: item.user.avatar,
					email: item.resume.replayEmail,
					mark: item.resume.mark,
					resumeName: item.resume.resumeName,
					resumeUrl: item.resume.resumeUrl,
					replay: item.resume.replay,
					replayUrl: item.resume.replayUrl,
					typeVal: item.resume.type,
					type: item.resume.type == 0 ? "未处理" : item.resume.type == 1 ? "处理中" : "已回复",
					createTime: item.resume.createTime,
					updateTime: item.resume.updateTime
				}));
				console.log("请求的简历列表信息:", newList);
				setTableData(newList);
			}
		};
		getSortList();
		console.trace("请求调用栈! query", query, current, pageSize);
	}, [query, current, pageSize]);

	// 表头设置
	const columns: ColumnsType<DataType> = [
		{
			title: "用户",
			dataIndex: "uname",
			key: "uname",
			fixed: "left"
		},
		{
			title: "邮箱",
			dataIndex: "email",
			key: "email",
			fixed: "left",
			render: (value: string) => {
				return <a href={`mailto:${value}`}>{value}</a>;
			}
		},
		{
			title: "提交时间",
			dataIndex: "createTime",
			key: "createTime",
			render: (value: number) => {
				const time = dayjs.unix(value / 1000);
				return <span>{time.format("YY-MM-DD HH:mm")}</span>;
			}
		},
		{
			title: "状态",
			dataIndex: "type",
			key: "type",
			render: (_, item) => {
				const { type, typeVal } = item;
				const color = typeVal == 0 ? "cyan" : typeVal == 1 ? "red" : "blue";
				return <Tag color={color}>{type}</Tag>;
			}
		},
		{
			title: "说明",
			dataIndex: "mark",
			key: "mark"
		},
		{
			title: "上传简历",
			dataIndex: "resumeName",
			key: "resumeName",
			render: (_, item) => {
				const { resumeName, resumeUrl } = item;
				return (
					<a href={`${resumeUrl}`} className="cell-text" target="_blank" rel="noreferrer">
						{resumeName}
					</a>
				);
			}
		},
		{
			title: "回复",
			dataIndex: "replay",
			key: "replay"
		},
		{
			title: "修改后简历",
			dataIndex: "replayUrl",
			key: "replayUrl",
			render: (_, item) => {
				const { resumeName, replayUrl } = item;
				if (replayUrl) {
					return (
						<a href={`${replayUrl}`} className="cell-text" target="_blank" rel="noreferrer">
							（改）{resumeName}
						</a>
					);
				} else {
					return <div />;
				}
			}
		},

		{
			title: "操作",
			key: "key",
			fixed: "right",
			render: (_, item) => {
				const { resumeId } = item;
				return (
					<div className="operation-btn">
						<Button
							size="small"
							icon={<DownloadOutlined />}
							style={{ marginRight: "10px" }}
							onClick={() => {
								handleDownload({ ...item });
							}}
						></Button>
						<Button
							type="primary"
							size="small"
							icon={<EditOutlined />}
							style={{ marginRight: "10px" }}
							onClick={() => {
								handleShowDrawer(item);
								setStatus(UpdateEnum.Edit);
								handleChange({ ...item });
								formRef.setFieldsValue({ ...item, upload: [] });
							}}
						></Button>

						<Button type="primary" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDel(resumeId)}></Button>
					</div>
				);
			}
		}
	];

	const normFile = (info: any) => {
		console.log("Upload event:", info);
		if (Array.isArray(info)) {
			return info;
		}
		console.log("返回结果:", info);
		const { status } = info.file;
		if (status !== "uploading") {
			console.log(info.file, info.fileList);
		}
		if (status === "done") {
			let res = info.file.response.result;
			setReplayUrl(res.ossPath);
			message.success(`${info.file.name} 上传成功.`);
		} else if (status === "error") {
			message.error(`${info.file.name} 上传失败.`);
		}
		return info?.fileList;
	};

	// 编辑表单
	const reviseDrawerContent = (
		<div>
			<Form name="basic" form={formRef} autoComplete="off">
				{currentResume?.replayUrl ? (
					<Form.Item label="回复附件" name="replayUrl">
						<a href={currentResume?.replayUrl}>{currentResume?.resumeName}</a>
					</Form.Item>
				) : (
					<Form.Item name="upload" label="上传简历" valuePropName="fileList" getValueFromEvent={normFile} extra="">
						<Upload name="file" action={uploadFileUrl()}>
							<Button icon={<UploadOutlined />}>选择doc/docx/pdf格式简历</Button>
						</Upload>
					</Form.Item>
				)}
				<Form.Item label="回复内容" name="replay" rules={[{ required: true, message: "请输入回复内容!" }]}>
					<Input.TextArea rows={12} />
				</Form.Item>
			</Form>
		</div>
	);

	return (
		<div className="banner">
			<ContentWrap>
				{/* 搜索 */}
				<Search handleSearchChange={handleSearchChange} handleSearch={handleSearch} />
				{/* 表格 */}
				<ContentInterWrap>
					<Table columns={columns} dataSource={tableData} pagination={paginationInfo} scroll={{ x: 1300 }} bordered />
				</ContentInterWrap>
			</ContentWrap>
			{/* 抽屉 */}
			<Drawer
				title={`回复【${currentResume?.uname}】的简历 - ${currentResume?.resumeName}`}
				open={isDrawerOpen}
				size="large"
				onClose={handleClose}
				extra={
					<Space>
						<Button onClick={handleClose}>取消</Button>
						<Button type="primary" onClick={handleSubmit}>
							确定
						</Button>
					</Space>
				}
			>
				{reviseDrawerContent}
			</Drawer>
		</div>
	);
};

const mapStateToProps = (state: any) => state.disc.disc;
const mapDispatchToProps = {};
export default connect(mapStateToProps, mapDispatchToProps)(Resume);
