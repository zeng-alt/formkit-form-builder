// 日期/时间类字段的默认值格式（与 naive-ui DatePicker value-format 一致）
export const DEFAULT_DATE_VALUE_FORMAT = 'yyyy-MM-dd'
export const DEFAULT_TIME_VALUE_FORMAT = 'HH:mm:ss'
export const DEFAULT_DATE_TIME_VALUE_FORMAT = 'yyyy-MM-dd HH:mm:ss'

// naive-ui DatePicker type → 默认 value-format（对齐 naive-ui 各 type 的默认格式）
export const DATE_PICKER_TYPE_VALUE_FORMATS: Record<string, string> = {
  date: DEFAULT_DATE_VALUE_FORMAT,
  datetime: DEFAULT_DATE_TIME_VALUE_FORMAT,
  daterange: DEFAULT_DATE_VALUE_FORMAT,
  datetimerange: DEFAULT_DATE_TIME_VALUE_FORMAT,
  month: 'yyyy-MM',
  monthrange: 'yyyy-MM',
  year: 'yyyy',
  yearrange: 'yyyy',
  // 季度用数字格式：date-fns v2 在 zh-CN locale 下无法回解析 yyyy-qqq（"2026-第一季"），
  // 用 yyyy-QQ（"2026-01"）保证 naive-ui formatted-value 往返可解析
  quarter: 'yyyy-QQ',
  quarterrange: 'yyyy-QQ',
  week: 'YYYY-w',
}
