import { DatePicker } from "antd";
import type { Dayjs } from "dayjs";
import dayjsGenerateConfig from "rc-picker/lib/generate/dayjs";

const MyDatePicker = DatePicker.generatePicker<Dayjs>(dayjsGenerateConfig);

export default MyDatePicker;
