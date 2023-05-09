import React, { FC, useEffect, useRef, useState } from "react";
import { Select } from "antd";
import * as echarts from "echarts";

import { getAllApi, getPvApi, getUvApi } from "@/api/modules/statistics";
import { ContentWrap } from "@/components/common-wrap";
import { MapItem } from "@/typings/common";
import pvCountImg from "./images/fangwenliang.png";
import articleCountImg from "./images/wenzhangzongshu.png";
import userCountImg from "./images/yonghu.png";

import "./index.scss";

interface IProps {}

const Statistics: FC<IProps> = props => {
	const pvRef = useRef<HTMLDivElement>(null);
	const uvRef = useRef<HTMLDivElement>(null);
	const [pvDay, setPvDay] = useState<string>("7");
	const [uvDay, setUvDay] = useState<string>("7");
	const [pvInfo, setPvInfo] = useState<MapItem[]>([]);
	const [uvInfo, setUvInfo] = useState<MapItem[]>([]);
	const [allInfo, setAllInfo] = useState<MapItem[]>([]);

	const pvDate = pvInfo.map(({ date }) => date);
	const pvDateCount = pvInfo.map(({ count }) => count);
	const uvDate = uvInfo.map(({ date }) => date);
	const uvCount = uvInfo.map(({ count }) => count);

	const { pvCount, userCount, articleCount } = allInfo;

	const getAllList = async () => {
		const { status, result } = await getAllApi();
		if (status.code === 0) {
			setAllInfo(result);
		}
	};

	const getPvList = async () => {
		const { status, result } = await getPvApi(pvDay);
		if (status.code === 0) {
			setPvInfo(result);
		}
	};

	const getUvList = async () => {
		const { status, result } = await getUvApi(uvDay);
		if (status.code === 0) {
			setUvInfo(result);
		}
	};

	const getPvRef = () => {
		let myChart = echarts.init(pvRef.current);
		let option;

		option = {
			xAxis: {
				type: "category",
				data: pvDate
			},
			yAxis: {
				type: "value"
			},
			series: [
				{
					data: pvDateCount,
					type: "line",
					smooth: true
				}
			]
		};

		option && myChart.setOption(option);
	};

	const getUvRef = () => {
		let myChart = echarts.init(uvRef.current);
		let option;

		option = {
			xAxis: {
				type: "category",
				data: uvDate
			},
			yAxis: {
				type: "value"
			},
			series: [
				{
					data: uvCount,
					type: "line",
					smooth: true
				}
			]
		};

		option && myChart.setOption(option);
	};

	useEffect(() => {
		getAllList();
	}, []);

	useEffect(() => {
		getPvList();
	}, [pvDay]);

	useEffect(() => {
		getUvList();
	}, [uvDay]);

	useEffect(() => {
		getPvRef();
	}, [pvDate, pvDateCount]);

	useEffect(() => {
		getUvRef();
	}, [uvDate, uvCount]);

	const dayLimitList = [
		{ value: "7", label: "7天" },
		{ value: "30", label: "30天" }
	];
	const allDataInfo = [
		{ title: "用户总数", value: userCount, bgColor: "#1196EE" },
		{ title: "PV 总数", value: pvCount, bgColor: "#4DB39E" },
		{ title: "文章总数", value: articleCount, bgColor: "#3CC4C4" }
	];

	return (
		<div className="statistics">
			<ContentWrap>
				<div className="statistics-all__wrap top-content">
					<div className="gitHub-traffic traffic-box">
						<div className="traffic-img">
							<img src={userCountImg} />
						</div>
						<span className="item-value">{userCount}</span>
						<span className="traffic-name sle">用户总数</span>
					</div>
					<div className="today-traffic traffic-box">
						<div className="traffic-img">
							<img src={articleCountImg} />
						</div>
						<span className="item-value">{articleCount}</span>
						<span className="traffic-name sle">文章总数</span>
					</div>
					<div className="gitee-traffic traffic-box">
						<div className="traffic-img">
							<img src={pvCountImg} />
						</div>
						<span className="item-value">{pvCount}</span>
						<span className="traffic-name sle">总访问量</span>
					</div>
				</div>
				<div className="statistics-pv__wrap">
					<div>
						<span style={{ marginRight: "20px" }}>PV数据</span>
						<Select value={pvDay} onChange={value => setPvDay(value)} options={dayLimitList} />
					</div>
					<div className="statistics-pv" ref={pvRef}></div>
				</div>
				<div className="statistics-pv__wrap">
					<div>
						<span style={{ marginRight: "20px" }}>UV数据</span>
						<Select
							value={uvDay}
							onChange={value => {
								setUvDay(value);
							}}
							options={dayLimitList}
						/>
					</div>

					<div className="statistics-uv" ref={uvRef}></div>
				</div>
			</ContentWrap>
		</div>
	);
};
export default Statistics;
