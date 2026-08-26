import http from "@/api";
import { PORT1 } from "@/api/config/servicePort";

export interface NavbarItem {
	id: string;
	name: string;
	url: string;
	enabled: boolean;
	openInNewWindow: boolean;
}

export interface NavbarConfig {
	items: NavbarItem[];
}

export const getNavbarConfigApi = () => {
	return http.get<NavbarConfig>(`${PORT1}/navbar/config`);
};

export const saveNavbarConfigApi = (config: NavbarConfig) => {
	return http.post<string>(`${PORT1}/navbar/config`, config);
};
