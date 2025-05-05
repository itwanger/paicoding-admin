/* eslint-disable simple-import-sort/imports */
import { useAppSelector } from "@/hooks/useRTK";
import type { RootState } from "@/rtk";

import logo from "@/assets/images/logo.svg";
import logoMd from "@/assets/images/logo_md.png";

const Logo = () => {
	const menu = useAppSelector((state: RootState) => state.menu);
	const { isCollapse } = menu;
	return (
		<div className="logo-box">
			<img src={!isCollapse ? logo : logoMd} alt="logo" className={!isCollapse ? "logo-img" : "logo-img-md"} />
		</div>
	);
};

export default Logo;
