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

export enum PushStatusEnum {
	noPublish = "0",
	Published = "1",
	Offline = "2"
}
export const pushStatusInfo = {
	[PushStatusEnum.noPublish]: "default",
	[PushStatusEnum.Published]: "success",
	[PushStatusEnum.Offline]: "error"
};
