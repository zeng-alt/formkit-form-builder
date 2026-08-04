import type { RegisterElementInput } from "../plugin/register-element";

/** 字典项（单选/多选/下拉等渲染选项用） */
export interface DictionaryOption {
  label: string;
  value: string | number;
}

/** 字典定义（分页搜索返回的一行） */
export interface DictionaryDefinition {
  code: string;
  label: string;
}

export interface DictionaryPageQuery {
  /** 按 code 模糊过滤 */
  code?: string;
  /** 按 label 模糊过滤 */
  label?: string;
  pageNum: number;
  pageSize: number;
}

export interface DictionaryPageResult {
  pageNum: number;
  pageSize: number;
  total: number;
  data: DictionaryDefinition[];
}

/** 树型字典项（树选择/级联选择用） */
export interface TreeDictionaryOption {
  label: string;
  value: string | number;
  children?: TreeDictionaryOption[];
  disabled?: boolean;
}

/** 树型字典定义（分页搜索返回的一行） */
export interface TreeDictionaryDefinition {
  value: string;
  label: string;
}

export interface TreeDictionaryPageQuery {
  /** 按 code 模糊过滤 */
  value?: string;
  /** 按 label 模糊过滤 */
  label?: string;
  pageNum: number;
  pageSize: number;
}

export interface TreeDictionaryPageResult {
  pageNum: number;
  pageSize: number;
  total: number;
  data: TreeDictionaryDefinition[];
}

export interface FormBuilderConfig {
  apiKey?: string;
  locale?: string;
  localeFallback?: string;
  messages?: Record<string, any>;
  /** 可用语言列表，默认 ['zh-CN', 'en'] */
  availableLocales?: string[];
  /** 扩展元素（配置式注册：DSL + FormKit input + 容器画布/预览 一次打通） */
  elements?: RegisterElementInput[];
  /** 字典查询：按 code 取字典项 [{label,value}]（动态字段渲染时调用） */
  fetchDictionary?: (code: string) => Promise<DictionaryOption[]>;
  /** 字典分页搜索：编辑面板弹窗查找字典定义用 */
  fetchDictionaryPage?: (params: DictionaryPageQuery) => Promise<DictionaryPageResult>;
  /** 树型字典查询：按 code 取树型字典项 [{label,key,children?}]（树选择/级联选择渲染时调用） */
  fetchTreeDictionary?: (code: string) => Promise<TreeDictionaryOption[]>;
  /** 树型字典分页搜索：编辑面板弹窗查找树型字典定义用 */
  fetchTreeDictionaryPage?: (params: TreeDictionaryPageQuery) => Promise<TreeDictionaryPageResult>;
}
