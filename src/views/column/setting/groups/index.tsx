/* eslint-disable react/jsx-no-comment-textnodes */
/* eslint-disable prettier/prettier */
import { FC, useCallback, useEffect, useState } from "react";
import React from "react";
import { connect } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { DeleteOutlined, EditOutlined, EyeOutlined, ImportOutlined, PlusOutlined, SwapOutlined } from "@ant-design/icons";
import type { DragEndEvent } from "@dnd-kit/core";
import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, Card, Descriptions, Drawer, Form, Input, InputNumber, message, Modal, Space, Table, Tooltip, Tree } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { DataNode } from "antd/es/tree";
import { group } from "console";

import {
	delColumnArticleApi,
	deleteGroupApi,
	getColumnGroupArticlesApi,
	moveColumnArticleOrGroup,
	sortColumnArticleApi,
	sortColumnArticleByIDApi,
	updateColumnArticleApi,
	updateGroupApi
} from "@/api/modules/column";
import { ContentInterWrap, ContentWrap } from "@/components/common-wrap";
import { initPagination, IPagination, UpdateEnum } from "@/enums/common";
import labelRouter from "@/routers/modules/resume";
import { MapItem } from "@/typings/common";
import { baseDomain } from "@/utils/util";
import TableSelect from "@/views/column/article/components/tableselect/TableSelect";

import "./index.scss";

interface IProps {}

interface GroupData {
	columnId: number;
	groupId: number;
	parentGroupId: number;
	title: string;
	section: number;
	children: GroupData[];
	articles: DataType[];
}

// 教程文章的数据类型
interface DataType {
	key: string;
	id: number;
	articleId: string;
	title: string;
	shortTitle: string;
	columnId: number;
	column: string;
	sort: number;
	groupId: number;
}

export interface IMoveType {
	columnId: number;
	moveArticleId?: number;
	moveGroupId?: number;
	targetArticleId?: number;
	targetGroupId?: number;
	movePosition: number;
}

export interface IFormType {
	id: number; // 主键id
	articleId: number; // 文章ID
	title: string; // 文章标题
	shortTitle: string; // 文章短标题
	columnId: number; // 教程ID
	column: string; // 教程名
	sort: number; // 排序
	groupId: number; // 分组id
	groupName: string; // 分组名
}

const defaultInitForm: IFormType = {
	id: -1,
	articleId: -1,
	title: "",
	shortTitle: "",
	columnId: -1,
	column: "",
	sort: -1,
	groupId: 0,
	groupName: ""
};

const ColumnArticle: FC<IProps> = props => {
	const [formRef] = Form.useForm();
	// 分组列表数据
	const [groupTree, setGroupTree] = useState<GroupData[]>([]);

	const [currentGroup, setCurrentGroup] = useState<GroupData>();
	const [newGroupName, setNewGroupName] = useState<string>("");
	const [isAddModalVisible, setIsAddModalVisible] = useState<boolean>(false);
	const [isEditModalVisible, setIsEditModalVisible] = useState<boolean>(false);
	const [isImportDrawerVisible, setIsImportDrawerVisible] = useState<boolean>(false);

	// 刷新函数
	const [query, setQuery] = useState<number>(0);

	const location = useLocation();
	const navigate = useNavigate();
	const { columnId: columnIdParam, column: columnParam } = location.state || {};

	const fetchTreeData = async () => {
		const { status, result } = await getColumnGroupArticlesApi(columnIdParam);
		const { code } = status || {};
		// @ts-ignore
		if (code === 0) {
			const newList = (result as []).map((item: MapItem) => ({ ...item, key: item?.groupId }));
			setGroupTree(newList as GroupData[]);
			console.log("获取到的groupTree:", groupTree);
		}
	};

	// 数据请求
	useEffect(() => {
		fetchTreeData();
	}, []);

	// 递归构建树节点
	const buildTreeNodes = (groups: GroupData[]): DataNode[] => {
		return groups.map(group => {
			const childrenNodes: DataNode[] = [];

			// 优先添加子分组
			if (group.children && group.children.length > 0) {
				childrenNodes.push(...buildTreeNodes(group.children));
			}

			// 然后添加文章
			if (group.articles && group.articles.length > 0) {
				group.articles.forEach(article => {
					childrenNodes.push({
						key: `article-${article.articleId}`,
						title: (
							<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
								<span>
									<span style={{ fontSize: "0.6rem", color: "gray", fontStyle: "italic" }}>{article.articleId}</span>
									<span>{article.shortTitle}</span>
								</span>
								<div className="group-node-buttons">
									<Button
										type="text"
										size="small"
										danger
										icon={<DeleteOutlined />}
										onClick={e => {
											e.stopPropagation();
											handleDeleteColumnArticle(article.id);
										}}
									/>
								</div>
							</div>
						),
						icon: <span className="article-icon">📄</span>,
						className: "article-node"
					});
				});
			}

			return {
				key: `group-${group.groupId}`,
				title: (
					<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
						<span>
							<span style={{ fontSize: "0.6rem", color: "gray", fontStyle: "italic" }}>{group.groupId}</span>
							<span>{group.title}</span>
						</span>
						<Space size="small" style={{ marginLeft: "2rem" }}>
							<div className="group-node-buttons">
								<Button
									type="link"
									size="small"
									icon={<PlusOutlined />}
									onClick={e => {
										e.stopPropagation();
										setCurrentGroup(group);
										setNewGroupName("");
										setIsAddModalVisible(true);
									}}
								/>
								<Button
									type="link"
									size="small"
									icon={<EditOutlined />}
									onClick={e => {
										e.stopPropagation();
										setCurrentGroup(group);
										setNewGroupName(group.title);
										setIsEditModalVisible(true);
									}}
								/>
								<Button
									type="link"
									size="small"
									icon={<ImportOutlined />}
									onClick={e => {
										e.stopPropagation();
										setCurrentGroup(group);
										setIsImportDrawerVisible(true);
									}}
								></Button>
							</div>
						</Space>
					</div>
				),
				icon: <span className="group-icon">📁</span>,
				children: childrenNodes.length > 0 ? childrenNodes : undefined,
				className: "group-node"
			};
		});
	};

	const treeData = buildTreeNodes(groupTree);

	// 控制节点展开/收起的状态
	const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
	const [autoExpandParent, setAutoExpandParent] = useState(true);

	// 处理节点展开/收起
	const onExpand = (expandedKeysValue: React.Key[]) => {
		console.log("onExpand", expandedKeysValue);
		// 如果你不想节点收起，可以删除下面这行
		setExpandedKeys(expandedKeysValue);
		setAutoExpandParent(false);
	};

	// 处理节点选择
	const onSelect = (selectedKeysValue: React.Key[], info: any) => {
		console.log("selected", selectedKeysValue, info);
		// 如果点击的是分组节点，则切换展开/收起状态
		if (info.node.key.startsWith("group-")) {
			const key = info.node.key;
			if (expandedKeys.includes(key)) {
				// 如果已经展开，则收起
				setExpandedKeys(expandedKeys.filter(k => k !== key));
			} else {
				// 如果已经收起，则展开
				setExpandedKeys([...expandedKeys, key]);
			}
		}
	};

	const handleSaveNewGroup = async () => {
		// 添加分组
		if (!newGroupName.trim()) {
			message.warning("请输入分组名称");
			return;
		}

		// 构造分组数据
		const groupData = {
			id: 0, // 新增分组id为0
			columnId: columnIdParam, // 使用当前专栏ID
			parentGroupId: currentGroup?.groupId || 0, // 默认为顶级分组
			title: newGroupName.trim(),
			section: 0 // 默认排序为0
		};

		try {
			const { status } = await updateGroupApi(groupData);
			const { code, msg } = status || {};

			if (code === 0) {
				message.success("分组添加成功");
				await fetchTreeData();
				setIsAddModalVisible(false);
			} else {
				message.error(msg || "分组添加失败");
			}
		} catch (error) {
			message.error("分组添加失败");
		}
	};
	const handleUpdateGroup = async () => {
		// 更新分组
		if (!currentGroup || !newGroupName.trim()) {
			message.warning("请输入分组名称");
			return;
		}
		// 构造分组数据
		const groupData = {
			id: currentGroup.groupId, // 新增分组id为0
			columnId: columnIdParam, // 使用当前专栏ID
			parentGroupId: currentGroup.parentGroupId, // 默认为顶级分组
			title: newGroupName.trim(),
			section: currentGroup.section // 默认排序为0
		};

		try {
			const { status } = await updateGroupApi(groupData);
			const { code, msg } = status || {};

			if (code === 0) {
				message.success("分组添加成功");
				await fetchTreeData();
				setIsEditModalVisible(false);
			} else {
				message.error(msg || "分组添加失败");
			}
		} catch (error) {
			message.error("删除分组失败~");
		}
	};

	const handleDeleteGroup = async () => {
		// 更新分组
		if (!currentGroup || !newGroupName.trim()) return;
		try {
			const { status } = await deleteGroupApi(currentGroup.groupId);
			const { code, msg } = status || {};

			if (code === 0) {
				message.success("删除添加成功");
				await fetchTreeData();
				setIsEditModalVisible(false);
			} else {
				message.error(msg || "删除失败");
			}
		} catch (error) {
			message.error("分组添加失败");
		}
	};

	const handleDeleteColumnArticle = async (articleId: number) => {
		// 删除专栏中的教程
		Modal.warning({
			title: "确认删除此专栏的教程吗",
			content: "删除此专栏的教程后无法恢复，请谨慎操作！",
			maskClosable: true,
			closable: true,
			onOk: async () => {
				const { status } = await delColumnArticleApi(articleId);
				const { code, msg } = status || {};
				if (code === 0) {
					message.success("删除成功");
					await fetchTreeData();
				} else {
					message.error(msg);
				}
			}
		});
	};

	// 专栏内容进行拖拽，支持文章 拖拽； 分组拖拽
	// form值（详情和新增的时候会用到）
	const [moveForm, setMoveForm] = useState<IMoveType>();
	const handleDrop = async (info: any) => {
		const { dragNode, node, dropToGap } = info;
		console.log("info对象", info);
		console.log("拖拽的对象:", dragNode);
		console.log("目标对象:", node);

		// -1：移动到和dropKey的平级，并在其上面(即info.dropPosition比dropKey的下标小一个)
		// 1：移动到和dropKey的平级，并在其下面(info.dropPosition比dropKey的下标大一个)
		// 0：是移动到dropKey下面作为他的子级(info.dropPosition和dropKey的下标同样大
		const dropPos = info.node.pos.split("-");
		const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);
		console.log("dropPosition:", dropPosition);

		// - true ：放置在目标节点旁边（同级节点）
		// - false ：放置在目标节点内部（子节点）
		console.log("dropToGap:", dropToGap);

		const articleId = parseInt(dragNode.key.split("-")[1]);
		const targetId = parseInt(node.key.split("-")[1]);
		if (dragNode.key.startsWith("article-")) {
			let moveForm = {
				columnId: columnIdParam,
				movePosition: 0,
				moveArticleId: articleId,
				targetArticleId: 0,
				targetGroupId: 0,
				tag: ""
			};
			if (node.key.startsWith("group-")) {
				// 判断是否是文章节点被拖拽到分组节点的前\后\里
				moveForm.targetGroupId = targetId;
				moveForm.movePosition = dropPosition;
				if (dropPosition == 1) moveForm.tag = "后";
				else if (dropPosition == 0) moveForm.tag = "里";
				else moveForm.tag = "前";
			} else {
				// 目标为文章
				moveForm.targetArticleId = targetId;
				if (!dropToGap || dropPosition == 1) {
					// 移动到目标文章的后面
					moveForm.movePosition = 1;
					moveForm.tag = "后";
				} else {
					// 移动到目标文章的前面
					moveForm.movePosition = -1;
					moveForm.tag = "前";
				}
			}
			console.log(`移动教程啦： 将 ${articleId} 移动到 ${targetId} ${moveForm.tag}`);
			await moveData(moveForm);
		} else {
			// 分组的移动
			let moveForm = {
				columnId: columnIdParam,
				movePosition: 0,
				moveGroupId: articleId,
				targetArticleId: 0,
				targetGroupId: targetId,
				tag: ""
			};
			if (node.key.startsWith("group-")) {
				// 往目标分组移动
				moveForm.movePosition = dropPosition;
				if (dropPosition == 1) moveForm.tag = "后";
				else if (dropPosition == 0) moveForm.tag = "里";
				else moveForm.tag = "前";
			} else {
				// 往文章边上移动，不支持
				message.warning("请勿将分组移动到教程前后!");
				return;
			}
			console.log(`移动分组啦： 将 ${articleId} 移动到 ${targetId} ${moveForm.tag}`);
			await moveData(moveForm);
		}
	};
	const moveData = async (moveForm: IMoveType) => {
		const { status: successStatus } = (await moveColumnArticleOrGroup(moveForm)) || {};
		const { code, msg } = successStatus || {};
		if (code === 0) {
			// 需要刷新一下列表
			await fetchTreeData();
		} else {
			message.error(msg);
		}
	};

	//  ------------------------------------------------------- 下面是在专栏的分组中添加教程 ------------------------------------------
	// form值（详情和新增的时候会用到）
	const [form, setForm] = useState<IFormType>(defaultInitForm);
	// 文章选择下拉框是否打开
	const [isArticleSelectOpen, setIsArticleSelectOpen] = useState<boolean>(false);
	// 详情信息
	const { shortTitle } = form;

	// 值改变（新增教程文章时，老的做法，将 formRef 放到了这里，不太好）
	const handleChange = (item: MapItem) => {
		console.log("选中的内容: ", item);
		setForm({ ...form, ...item });
		formRef.setFieldsValue({ ...item });
	};
	const reviseDrawerContent = (
		<Form name="basic" form={formRef} labelCol={{ span: 4 }} wrapperCol={{ span: 16 }} autoComplete="off">
			<Form.Item label="分组" name="groupId">
				{currentGroup?.title}
			</Form.Item>

			<Form.Item label="教程" name="articleId" rules={[{ required: true, message: "请选择教程!" }]}>
				<TableSelect
					isArticleSelectOpen={isArticleSelectOpen}
					setIsArticleSelectOpen={setIsArticleSelectOpen}
					handleChange={handleChange}
				/>
			</Form.Item>

			<Form.Item label="标题" name="shortTitle" rules={[{ required: true, message: "请输入标题!" }]}>
				<Input
					allowClear
					placeholder="请输入标题"
					value={shortTitle}
					onChange={e => handleChange({ shortTitle: e.target.value })}
				/>
			</Form.Item>
		</Form>
	);

	// 添加教程文章，编辑取消了
	const handleSubmit = async () => {
		const values = await formRef.validateFields();
		const newValues = {
			...values,
			columnId: columnIdParam,
			groupId: currentGroup?.groupId || 0
		};
		console.log("提交的值:", newValues);

		const { status: successStatus } = (await updateColumnArticleApi(newValues)) || {};
		const { code, msg } = successStatus || {};
		if (code === 0) {
			setIsImportDrawerVisible(false);
			message.info("教程添加成功");
			// 需要刷新一下列表
			await fetchTreeData();
		} else {
			message.error(msg);
		}
	};

	return (
		<div className="ColumnArticle">
			<Card
				title={"《" + columnParam + "》"}
				extra={
					<Button
						onClick={() => {
							// 显示添加分组弹窗
							setCurrentGroup(undefined);
							setIsAddModalVisible(true);
						}}
					>
						+
					</Button>
				}
			>
				<Tree
					className="group-tree"
					showIcon
					defaultExpandAll={false}
					expandedKeys={expandedKeys}
					autoExpandParent={autoExpandParent}
					onExpand={onExpand}
					onSelect={onSelect}
					treeData={treeData}
					draggable={true}
					onDrop={handleDrop}
				/>
			</Card>
			<Modal
				title="添加子目录"
				open={isAddModalVisible}
				onCancel={() => setIsAddModalVisible(false)}
				footer={[
					<Button key="cancel" onClick={() => setIsAddModalVisible(false)}>
						取消
					</Button>,
					<Button key="save" type="primary" onClick={handleSaveNewGroup}>
						保存
					</Button>
				]}
			>
				<Input placeholder="请输入子目录名称" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
			</Modal>
			<Modal
				title="编辑目录"
				open={isEditModalVisible}
				onCancel={() => setIsEditModalVisible(false)}
				footer={[
					<Button key="cancel" onClick={() => setIsEditModalVisible(false)}>
						取消
					</Button>,
					<Button key="save" type="primary" onClick={handleUpdateGroup}>
						保存
					</Button>,
					<Button key="delete" type="primary" danger onClick={handleDeleteGroup}>
						删除
					</Button>
				]}
			>
				<Input placeholder="请输入目录名称" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
			</Modal>
			<Drawer
				title="添加"
				size="large"
				placement="right"
				extra={
					<Space>
						<Button onClick={() => setIsImportDrawerVisible(false)}>取消</Button>
						<Button type="primary" onClick={handleSubmit}>
							OK
						</Button>
					</Space>
				}
				onClose={() => setIsImportDrawerVisible(false)}
				open={isImportDrawerVisible}
			>
				{reviseDrawerContent}
			</Drawer>
		</div>
	);
};

const mapStateToProps = (state: any) => state.disc.disc;
const mapDispatchToProps = {};
export default connect(mapStateToProps, mapDispatchToProps)(ColumnArticle);
