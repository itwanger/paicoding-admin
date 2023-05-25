/* eslint-disable prettier/prettier */
import React, { FC, useCallback, useEffect, useRef, useState } from "react";
import { Select, Switch } from "antd";
import * as echarts from "echarts";

import { getAllApi, getPvUvApi } from "@/api/modules/statistics";
import { ContentWrap } from "@/components/common-wrap";
import { MapItem } from "@/typings/common";
import pvCountImg from "./images/fangwenliang.png";
import articleCountImg from "./images/wenzhangzongshu.png";
import userCountImg from "./images/yonghu.png";

import "./index.scss";

interface IProps {}

const Statistics: FC<IProps> = props => {
	const chartRef = useRef<HTMLDivElement>(null);
  const myChartRef = useRef<echarts.ECharts>();

	const [pvUvDay, setPvUvDay] = useState<string>("7");
	const [pvUvInfo, setPvUvInfo] = useState<MapItem[]>([]);
	const [allInfo, setAllInfo] = useState<MapItem[]>([]);
	const [isDarkTheme, setIsDarkTheme] = useState(false);

	const pvUvDate = pvUvInfo.map(({ date }) => date);
	const pvDateCount = pvUvInfo.map(({ pvCount }) => pvCount);
	const uvDateCount = pvUvInfo.map(({ uvCount }) => uvCount);

	// @ts-ignore
	const { pvCount, userCount, articleCount } = allInfo;

	const dayLimitList = [
		{ value: "7", label: "7天" },
		{ value: "30", label: "30天" },
		{ value: "90", label: "90天" },
		{ value: "180", label: "180天" },
	];
	const allDataInfo = [
		{ title: "用户总数", value: userCount, bgColor: "#1196EE" },
		{ title: "PV 总数", value: pvCount, bgColor: "#4DB39E" },
		{ title: "文章总数", value: articleCount, bgColor: "#3CC4C4" }
	];

	const resizeChart = useCallback(() => {
    myChartRef.current?.resize();
  }, []);

	useEffect(() => {
		const getAllInfo = async () => {
			const { status, result } = await getAllApi();
			// @ts-ignore
			if (status.code === 0) {
				setAllInfo(result);
			}
		};
		getAllInfo();
	}, []);

	useEffect(() => {
		const getPvUv = async () => {
			const { status, result } = await getPvUvApi(pvUvDay);
			if (status.code === 0) {
				// 对 result 进行倒序
				setPvUvInfo(result.reverse());
			}
		};
		getPvUv();
	}, [pvUvDay]);

	useEffect(() => {
		const getPvUvRef = () => {
			console.log("当前的主题是", isDarkTheme ? "dark" : "light");
			if (echarts.getInstanceByDom(chartRef.current)) {
					echarts.dispose(chartRef.current);
			}
			let myChart = echarts.init(chartRef.current, 
				isDarkTheme ? 'dark' : 'light');

			let option = {
				title: {
					text: 'PV UV数据',
    			top: 0
				},
				tooltip: {
					trigger: 'axis'
				},
				legend: {
					data: ['PV', 'UV']
				},
				grid: {
					left: '3%',
					right: '3%',
					bottom: '3%',
					containLabel: true
				},
				toolbox: {
					show: true,
					magicType: {
						type: ["line", "bar"]
					},
					feature: {
						saveAsImage: {}
					}
				},
				xAxis: {
					type: "category",
					data: pvUvDate
				},
				yAxis: {
					type: "value"
				},
				series: [
					{
						name: "PV",
						data: pvDateCount,
						type: "line",
						smooth: true,
						label: {
							show: true,
							position: "top",
							textStyle: {
								fontSize: 20
							}
						}
					},
					{
						name: "UV",
						data: uvDateCount,
						type: "line",
						smooth: true,
					}
				]
			};
	
			myChartRef.current = myChart;
			option && myChart.setOption(option);

			window.addEventListener('resize', resizeChart);
		};
		getPvUvRef();
		return () => {
      window.removeEventListener("resize", resizeChart);
    };
	}, [pvUvDate, pvDateCount, isDarkTheme]);

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
					{/*居中*/}
					<div style={{marginBottom: 10}}>
						<Switch
							style={{ marginRight: "20px" }}
							onChange={checked => setIsDarkTheme(checked)}
							checkedChildren="深色"
							unCheckedChildren="浅色"
						/>

						<Select 
							style={{ width: "80px" }}
							value={pvUvDay} 
							onChange={value => setPvUvDay(value)} 
							options={dayLimitList} />
					</div>
					<div className="statistics-pv" ref={chartRef}></div>
				</div>
			</ContentWrap>
		</div>
	);
};
export default Statistics;
