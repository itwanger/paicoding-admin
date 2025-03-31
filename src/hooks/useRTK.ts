/* eslint-disable simple-import-sort/imports */
import { useDispatch, useSelector, TypedUseSelectorHook } from "react-redux";

import type { RootState, AppDispatch } from "@/rtk";

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
