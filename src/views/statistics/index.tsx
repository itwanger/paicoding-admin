/* eslint-disable prettier/prettier */
import { FC, useCallback, useEffect, useRef, useState } from "react";
import { Select, Switch } from "antd";
import * as echarts from "echarts";

import { download2ExcelPvUvApi, getAllApi, getPvUvApi } from "@/api/modules/statistics";
import pvCountImg from "@/assets/images/fangwenliang.png";
import articleCountImg from "@/assets/images/wenzhangzongshu.png";
import userCountImg from "@/assets/images/yonghu.png";
import zhuanlanImg from "@/assets/images/zhuanlan.png";
import zhuceImg from "@/assets/images/zhuce.png";
import { ContentWrap } from "@/components/common-wrap";
import { MapItem } from "@/typings/common";

import "./index.scss";

interface IProps {}

const Statistics: FC<IProps> = props => {
	const chartRef = useRef<HTMLDivElement>(null);
	const myChartRef = useRef<echarts.ECharts>();

	const pieChartRef = useRef<HTMLDivElement>(null);
	const myPieChartRef = useRef<echarts.ECharts>();

	const [pvUvDay, setPvUvDay] = useState<string>("7");
	const [pvUvInfo, setPvUvInfo] = useState<MapItem[]>([]);
	const [allInfo, setAllInfo] = useState<MapItem[]>([]);
	const [isDarkTheme, setIsDarkTheme] = useState(false);

	const pvUvDate = pvUvInfo.map(({ date }) => date);
	const pvDateCount = pvUvInfo.map(({ pvCount }) => pvCount);
	const uvDateCount = pvUvInfo.map(({ uvCount }) => uvCount);

	// @ts-ignore
	const { pvCount, userCount, starPayCount, articleCount,tutorialCount,collectCount,likeCount,readCount,commentCount } = allInfo;

	const dayLimitList = [
		{ value: "7", label: "7天" },
		{ value: "30", label: "30天" },
		{ value: "90", label: "90天" },
		{ value: "180", label: "180天" }
	];

	const resizeChart = useCallback(() => {
		myChartRef.current?.resize();
		myPieChartRef.current?.resize();
	}, []);

	const exportToExcel = async () => {
		const day = dayLimitList.find(item => item.value === pvUvDay)?.value;
		if (!day) return;

		const response = await download2ExcelPvUvApi(Number(day));
		const contentDisposition = response.headers["content-disposition"];
		let fileName = "paicoding.xlsx";

		if (contentDisposition) {
			const matches = contentDisposition.match(/filename\*?=utf-8''([^;]+)/i);
			if (matches && matches.length === 2) {
				fileName = decodeURIComponent(matches[1]);
			}
		}

		const blob = new Blob([response.data as BlobPart], {
			type: response.headers["content-type"]
		});
		const url = window.URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = fileName;
		link.click();
		window.URL.revokeObjectURL(url);
	};

	const getAllInfo = async () => {
		const { status, result } = await getAllApi();
		if (status && status.code === 0) {
			setAllInfo(result as MapItem[]);
		}
	};

	useEffect(() => {
		getAllInfo();
	}, []);

	useEffect(() => {
		const getPvUv = async () => {
			const { status, result } = await getPvUvApi(Number(pvUvDay));
			if (status && status.code === 0) {
				setPvUvInfo((result as any[]).reverse());
			}
		};
		getPvUv();
	}, [pvUvDay]);

	useEffect(() => {
		const getPieRef = () => {
			if (pieChartRef.current && echarts.getInstanceByDom(pieChartRef.current)) {
				echarts.dispose(pieChartRef.current);
			}

			let myPieChart = echarts.init(pieChartRef.current as HTMLElement, isDarkTheme ? "dark" : "light");
			let option = {
				title: {
					text: "数据统计",
					left: "center"
				},
				tooltip: {
					trigger: "item"
				},
				legend: {
					orient: "vertical",
					left: "left",
					bottom: 0
				},
				series: [
					{
						name: "数据统计",
						type: "pie",
						radius: ["60%"],
						emphasis: {
							itemStyle: {
								shadowBlur: 10,
								shadowOffsetX: 0,
								shadowColor: "rgba(0, 0, 0, 0.5)"
							}
						},
						data: [
							{ value: collectCount, name: "收藏总数" },
							{ value: likeCount, name: "点赞总数" },
							{ value: readCount, name: "阅读总数" },
							{ value: commentCount, name: "评论总数" }
						]
					}
				]
			};
			myPieChartRef.current = myPieChart;
			option && myPieChart.setOption(option);
			window.addEventListener("resize", resizeChart);
		};
		getPieRef();
		return () => {
			window.removeEventListener("resize", resizeChart);
		};
	});

	useEffect(() => {
		const getPvUvRef = () => {
			if (chartRef.current && echarts.getInstanceByDom(chartRef.current)) {
				echarts.dispose(chartRef.current);
			}
			let myChart = echarts.init(chartRef.current as HTMLElement, isDarkTheme ? "dark" : "light");

			let option = {
				title: {
					text: "PV UV数据",
					top: 0
				},
				tooltip: {
					trigger: "axis"
				},
				legend: {
					data: ["PV", "UV"]
				},
				grid: {
					left: "3%",
					right: "3%",
					bottom: "3%",
					containLabel: true
				},
				toolbox: {
					show: true,
					magicType: {
						type: ["line", "bar"]
					},
					feature: {
						myDownloadExcel: {
							show: true,
							title: "下载 Excel",
							icon: "path://M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 14h-3v-3h-2v3H8v-3H6v3H5v-2h3v-2H5V5h14v9h-2v3z",
							onclick: exportToExcel
						}
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
						smooth: true
					}
				]
			};

			myChartRef.current = myChart;
			option && myChart.setOption(option);
			window.addEventListener("resize", resizeChart);
		};
		getPvUvRef();
		return () => {
			window.removeEventListener("resize", resizeChart);
		};
	}, [pvUvDate, pvDateCount, isDarkTheme]);

	return (
		<div className="statistics">
			<ContentWrap className="content">
				<div className="statistics-all__wrap top-content">
					<div className="item-left sle">
						<span className="left-title">访问总数</span>
						<div className="img-box">
							<img src={pvCountImg} />
						</div>
						<span className="left-number">{pvCount}</span>
					</div>
					<div className="item-center">
						<div className="gitee-traffic traffic-box">
							<div className="traffic-img">
								<img src={userCountImg} />
							</div>
							<span className="item-value">{starPayCount}</span>
							<span className="traffic-name sle">星球用户</span>
						</div>
						<div className="gitHub-traffic traffic-box">
							<div className="traffic-img">
								<img src={zhuceImg} />
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
						<div className="yesterday-traffic traffic-box">
							<div className="traffic-img">
								<img src={zhuanlanImg} />
							</div>
							<span className="item-value">{tutorialCount}</span>
							<span className="traffic-name sle">专栏总数</span>
						</div>
					</div>
					<div className="item-right">
						<div className="statistics-pie" ref={pieChartRef}></div>
					</div>
				</div>
				<div className="statistics-pv__wrap">
					<div className="statistics-setting">
						<Switch
							style={{ marginRight: "20px" }}
							onChange={checked => setIsDarkTheme(checked)}
							checkedChildren="深色"
							unCheckedChildren="浅色"
						/>

						<Select style={{ width: "100px" }} value={pvUvDay} onChange={value => setPvUvDay(value)} options={dayLimitList} />
					</div>
					<div className="statistics-pv" ref={chartRef}></div>
				</div>
			</ContentWrap>
		</div>
	);
};

export default Statistics;
