import React, { FC, useEffect, useRef, useState } from "react";
import { Select } from "antd";
import * as echarts from "echarts";

import { getPvApi, getUvApi } from "@/api/modules/statistics";
import { ContentWrap } from "@/components/common-wrap";
import { MapItem } from "@/typings/common";

import "./index.scss";

interface IProps {}

const Statistics: FC<IProps> = props => {
	const pvRef = useRef<HTMLDivElement>(null);
	const uvRef = useRef<HTMLDivElement>(null);
	const [pvDay, setPvDay] = useState<string>("7");
	const [uvDay, setUvDay] = useState<string>("7");
	const [pvInfo, setPvInfo] = useState<MapItem[]>([]);
	const [uvInfo, setUvInfo] = useState<MapItem[]>([]);

	const pvDate = pvInfo.map(({ date }) => date);
	const pvCount = pvInfo.map(({ count }) => count);
	const uvDate = uvInfo.map(({ date }) => date);
	const uvCount = uvInfo.map(({ count }) => count);

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
					data: pvCount,
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
		getPvList();
	}, [pvDay]);

	useEffect(() => {
		getUvList();
	}, [uvDay]);

	useEffect(() => {
		getPvRef();
	}, [pvDate, pvCount]);

	useEffect(() => {
		getUvRef();
	}, [uvDate, uvCount]);

	const dayLimitList = [
		{ value: "7", label: "7天" },
		{ value: "30", label: "30天" }
	];

	return (
		<div className="statistics">
			<ContentWrap>
				<div className="statistics-pv__wrap">
					<Select value={pvDay} onChange={value => setPvDay(value)} options={dayLimitList} />
					<div className="statistics-pv" ref={pvRef}></div>
				</div>
				<div className="statistics-pv__wrap">
					<Select
						value={uvDay}
						onChange={value => {
							setUvDay(value);
						}}
						options={dayLimitList}
					/>
					<div className="statistics-uv" ref={uvRef}></div>
				</div>
			</ContentWrap>
		</div>
	);
};
export default Statistics;
