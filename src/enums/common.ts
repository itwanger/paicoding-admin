export enum UpdateEnum {
	Save = 0,
	Edit
}

export interface IPagination {
	current: number;
	pageSize: number;
	total?: number;
}

export const initPagination: IPagination = {
	current: 1,
	pageSize: 10,
	total: 0
};
