/* eslint-disable react/jsx-no-comment-textnodes */
/* eslint-disable prettier/prettier */
import { FC, useCallback, useEffect, useState } from "react";
import React from "react";
import { connect } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { DeleteOutlined, EyeOutlined, SwapOutlined } from "@ant-design/icons";
import type { DragEndEvent } from "@dnd-kit/core";
import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, Descriptions, Drawer, Form, Input, InputNumber, message, Modal, Space, Table, Tooltip, Tree } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { DataNode } from "antd/es/tree";

import {
	delColumnArticleApi,
	getColumnGroupArticlesApi,
	sortColumnArticleApi,
	sortColumnArticleByIDApi,
	updateColumnArticleApi
} from "@/api/modules/column";
import { ContentInterWrap, ContentWrap } from "@/components/common-wrap";
import { initPagination, IPagination, UpdateEnum } from "@/enums/common";
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

const ColumnArticle: FC<IProps> = props => {
	const [formRef] = Form.useForm();
	// 分组列表数据
	const [groupTree, setGroupTree] = useState<GroupData[]>([]);

	// 刷新函数
	const [query, setQuery] = useState<number>(0);

	const location = useLocation();
	const navigate = useNavigate();
	const { columnId: columnIdParam } = location.state || {};

	// 数据请求
	useEffect(() => {
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
						key: `article-${article.id}`,
						title: "📄" + article.shortTitle,
						icon: <span className="article-icon">📄</span>,
						className: "article-node"
					});
				});
			}

			return {
				key: `group-${group.groupId}`,
				title: "📁" + group.title,
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

	return (
		<div className="ColumnArticle">
			<Tree
				className="group-tree"
				treeData={treeData}
				expandedKeys={expandedKeys}
				autoExpandParent={autoExpandParent}
				onExpand={onExpand}
				onSelect={onSelect}
				defaultExpandAll={false}
			/>
		</div>
	);
};

const mapStateToProps = (state: any) => state.disc.disc;
const mapDispatchToProps = {};
export default connect(mapStateToProps, mapDispatchToProps)(ColumnArticle);
