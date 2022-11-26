import { ThemeConfigProp } from "@/redux/interface/index";
import * as types from "@/redux/mutation-types";

// * setToken
export const setToken = (token: string) => ({
	type: types.SET_TOKEN,
	token
});

// * setAssemblySize
export const setAssemblySize = (assemblySize: string) => ({
	type: types.SET_ASSEMBLY_SIZE,
	assemblySize
});

// * setThemeConfig
export const setThemeConfig = (themeConfig: ThemeConfigProp) => ({
	type: types.SET_THEME_CONFIG,
	themeConfig
});
