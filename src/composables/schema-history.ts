import type { FormKitSchemaFormKit } from '@formkit/core'
import { computed, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { dslToSchema } from '@/dsl'
import { generateKey } from '../utils/dnd/schema'
import { findDslNodeByKey } from '../utils/schema/dsl-tree'
import { reconcileDslTree } from '@/dsl'
import type { FormDefinition, FormNode } from '@/types/dsl'
import { schemaChildren, type SchemaNode } from '@/utils/schema/types'

type DefSnapshot = FormDefinition

const MAX_HISTORY = 100
const MERGE_WINDOW_MS = 500

function cloneDef(def: DefSnapshot): DefSnapshot {
  try {
    return structuredClone(def)
  } catch {
    return JSON.parse(JSON.stringify(def)) as DefSnapshot
  }
}

function dslRoot(def: DefSnapshot): FormNode[] {
  return Array.isArray(def?.root?.children) ? def.root.children : []
}

// 补齐节点 __key：新拖入 / 外部导入的节点可能缺少画布 DnD 身份标识（选中 / 树操作
// 按 key 定位），这里统一兜底生成。这不是格式迁移——只负责这一件事；旧版本这里还
// 顺带做过 valueExpression/expr/if → __raw__* 与 bind → __bind 的字段搬迁，但那些
// 迁移目标要么从无消费者（__raw__valueExpression/__raw__expr 全仓库只有这里写入，
// 没有任何地方读取），要么只在别处被过滤/丢弃（__raw__ifExpression 同理；bind 迁移
// 也没有内部生产者，只覆盖极旧的 FormKit 原生 bind 用法）——本库无历史数据兼容负担，
// 已随之删除，避免在每次 DnD 提交的热路径上做无人消费的搬字段。
function ensureNodeKeys(schema: FormKitSchemaFormKit[]) {
  const visit = (nodes: SchemaNode[]) => {
    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue
      if (typeof node.__key !== 'string' || !node.__key) {
        node.__key = generateKey()
      }
      visit(schemaChildren(node))
    }
  }
  visit(schema)
}

/** 写漏斗依赖的实例状态切片。 */
export interface SchemaHistoryState {
  formDefinition: Ref<FormDefinition>
  formSchema: ComputedRef<FormKitSchemaFormKit[]>
  selectedIndex: Ref<number>
  selectedKey: Ref<string | null>
  commitSchemaChildren: (
    children: FormKitSchemaFormKit[],
    source?: Pick<FormDefinition, 'name' | 'settings'>,
  ) => FormDefinition
}

/** 历史漏斗返回值（commit/undo/redo + 外部应用）。 */
export interface SchemaHistory {
  canUndo: ComputedRef<boolean>
  canRedo: ComputedRef<boolean>
  commitFormDefinition: (
    nextDef: DefSnapshot,
    options?: { reason?: string; merge?: boolean },
  ) => void
  commitSchema: (
    nextSchema: FormKitSchemaFormKit[],
    options?: {
      reason?: string
      merge?: boolean
      name?: string
      settings?: FormDefinition['settings']
    },
  ) => void
  commitSchemaReconcile: (
    nextSchema: FormKitSchemaFormKit[],
    options?: { reason?: string; merge?: boolean },
  ) => void
  undo: () => void
  redo: () => void
  resetHistory: () => void
  /** 外部应用（如 v-model 预载 / 父级替换表单）：直接落真源、不推历史。
   *  默认重置内部 undo 栈（父级权威），可传 { resetHistory: false } 保留。 */
  setFormDefinition: (nextDef: DefSnapshot, opts?: { resetHistory?: boolean }) => void
}

// 按实例创建写漏斗：闭包绑定传入的状态 refs，undo 快照互不串扰。
export function createSchemaHistory(state: SchemaHistoryState): SchemaHistory {
  const { formDefinition, formSchema, selectedIndex, selectedKey, commitSchemaChildren } = state

  const past = ref<DefSnapshot[]>([])
  const future = ref<DefSnapshot[]>([])
  const lastCommit = ref<{ at: number; reason?: string } | null>(null)

  const canUndo = computed(() => past.value.length > 0)
  const canRedo = computed(() => future.value.length > 0)

  function clampSelectedIndex(def: DefSnapshot) {
    const len = dslRoot(def).length
    if (len <= 0) {
      selectedIndex.value = 0
      selectedKey.value = null
      return
    }

    if (selectedIndex.value > len - 1) {
      selectedIndex.value = len - 1
    }
  }

  function applyDefinition(def: DefSnapshot) {
    const prevKey = selectedKey.value
    formDefinition.value = def
    if (prevKey) {
      const found = findDslNodeByKey(dslRoot(def), prevKey)
      if (found) {
        selectedIndex.value = found.rootIndex
        selectedKey.value = prevKey
      } else {
        selectedKey.value = null
      }
    }
    clampSelectedIndex(def)
  }

  // 唯一写漏斗：直接提交规范 DSL 定义
  function commitFormDefinition(
    nextDef: DefSnapshot,
    options?: { reason?: string; merge?: boolean },
  ) {
    const now = Date.now()
    const currentDef = formDefinition.value
    if (currentDef === nextDef) return

    const last = lastCommit.value
    const shouldMerge =
      options?.merge === true &&
      last?.reason === options?.reason &&
      !!last &&
      now - last.at <= MERGE_WINDOW_MS &&
      past.value.length > 0

    if (!shouldMerge) {
      past.value.push(cloneDef(currentDef))
      if (past.value.length > MAX_HISTORY) {
        past.value.splice(0, past.value.length - MAX_HISTORY)
      }
    }

    future.value = []
    lastCommit.value = { at: now, reason: options?.reason }
    applyDefinition(nextDef)
  }

  // schema 数组提交（DnD / 容器更新 / 外部导入）：补齐 key 后转 DSL 再走统一漏斗。
  // name / settings 可选：覆盖表单级设置（如导入带 name / labelAlign 的外部 schema）
  function commitSchema(
    nextSchema: FormKitSchemaFormKit[],
    options?: {
      reason?: string
      merge?: boolean
      name?: string
      settings?: FormDefinition['settings']
    },
  ) {
    const working = cloneDef(
      nextSchema as unknown as DefSnapshot,
    ) as unknown as FormKitSchemaFormKit[]
    ensureNodeKeys(working)
    const source =
      options?.name || options?.settings
        ? {
            name: options.name ?? formDefinition.value?.name ?? 'form',
            settings: options.settings ?? formDefinition.value?.settings,
          }
        : undefined
    commitFormDefinition(commitSchemaChildren(working, source), options)
  }

  // 画布/DnD 写路径：补齐 key 后按 key 差异调和 DSL 树（仅转换变更节点，未变子树原样复用）
  function commitSchemaReconcile(
    nextSchema: FormKitSchemaFormKit[],
    options?: { reason?: string; merge?: boolean },
  ) {
    const working = cloneDef(
      nextSchema as unknown as DefSnapshot,
    ) as unknown as FormKitSchemaFormKit[]
    ensureNodeKeys(working)
    const def = formDefinition.value
    // 以 DSL 真源重新投影作为"旧 schema"基线：formSchema.value 是缓存投影，可能被画布
    // DnD 的共享引用原地改写，导致 reconcile 误判为"无变更"而复用旧 DSL 子树。
    const currentProjection = (() => {
      try {
        const wrapped = dslToSchema(def)
        return (wrapped[0]?.children as FormKitSchemaFormKit[]) ?? []
      } catch {
        return formSchema.value
      }
    })()
    const nextChildren = reconcileDslTree(dslRoot(def), currentProjection, working)
    commitFormDefinition({ ...def, root: { ...def.root, children: nextChildren } }, options)
  }

  function undo() {
    const previous = past.value.pop()
    if (!previous) return

    future.value.unshift(cloneDef(formDefinition.value))
    if (future.value.length > MAX_HISTORY) {
      future.value.splice(MAX_HISTORY)
    }

    lastCommit.value = null
    applyDefinition(cloneDef(previous))
  }

  function redo() {
    const next = future.value.shift()
    if (!next) return

    past.value.push(cloneDef(formDefinition.value))
    if (past.value.length > MAX_HISTORY) {
      past.value.splice(0, past.value.length - MAX_HISTORY)
    }

    lastCommit.value = null
    applyDefinition(cloneDef(next))
  }

  function resetHistory() {
    past.value = []
    future.value = []
    lastCommit.value = null
  }

  // 外部应用（v-model 预载 / 父级替换）：直接落真源，不推历史。
  function setFormDefinition(nextDef: DefSnapshot, opts?: { resetHistory?: boolean }) {
    applyDefinition(nextDef)
    if (opts?.resetHistory !== false) resetHistory()
  }

  return {
    canUndo,
    canRedo,
    commitFormDefinition,
    commitSchema,
    commitSchemaReconcile,
    undo,
    redo,
    resetHistory,
    setFormDefinition,
  }
}
