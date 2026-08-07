import { useFormBuilderConfig } from './use-config'
import type { DictionaryOption, TreeDictionaryOption } from '../types/env'

/** 动态字典来源：options 为对象 { dynamic: true, code, label? } */
export interface DynamicSource {
  code: string
  label?: string
}

/** 从字段 options 中识别动态字典来源；非对象或未命中返回 null */
export function parseDynamicSource(raw: unknown): DynamicSource | null {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>
    if (typeof obj.code === 'string' && obj.code) {
      return { code: obj.code, label: typeof obj.label === 'string' ? obj.label : undefined }
    }
    // 兼容旧版 endpoint 字符串
    if (typeof obj.endpoint === 'string' && obj.endpoint) {
      return { code: obj.endpoint }
    }
  }
  return null
}

/**
 * 读取用户通过 BuilderProvider config 传入的字典方法。
 * 未配置时返回 undefined，由调用方兜底（不注入时静默降级为空）。
 */
export function useDictionary() {
  const config = useFormBuilderConfig()
  return {
    fetchDictionary: config.fetchDictionary,
    fetchDictionaryPage: config.fetchDictionaryPage,
    fetchTreeDictionary: config.fetchTreeDictionary,
    fetchTreeDictionaryPage: config.fetchTreeDictionaryPage,
  }
}

export type { DictionaryOption, TreeDictionaryOption }
