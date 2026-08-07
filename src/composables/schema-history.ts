import type { FormKitSchemaFormKit } from '@formkit/core'
import { computed, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { defaultFormDefinitionState } from '@/state/form-definition'
import { defaultSelectionState } from '@/state/form-schema'
import { dslToSchema } from '@/dsl'
import { generateKey } from '../utils/dnd/schema'
import { findDslNodeByKey } from '../utils/schema/dsl-tree'
import { reconcileDslTree } from '@/dsl'
import type { FormDefinition, FormNode } from '@/types/dsl'

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

function migrateExpressionKeys(schema: FormKitSchemaFormKit[]) {
  const visit = (nodes: any[]) => {
    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue
      if (typeof node.__key !== 'string' || !node.__key) {
        node.__key = generateKey()
      }
      if (
        typeof node.valueExpression === 'string' &&
        typeof node.__raw__valueExpression !== 'string'
      ) {
        node.__raw__valueExpression = node.valueExpression
      }
      if (typeof node.expr === 'string' && typeof node.__raw__expr !== 'string') {
        node.__raw__expr = node.expr
      }
      if (typeof node.if === 'string' && typeof node.__raw__ifExpression !== 'string') {
        node.__raw__ifExpression = node.if
      }
      if ('valueExpression' in node) delete node.valueExpression
      if ('expr' in node) delete node.expr
      const bind = (node as any).bind
      if (bind && typeof bind !== 'string') {
        if (
          typeof bind === 'object' &&
          !Array.isArray(bind) &&
          typeof (node as any).__bind !== 'object'
        ) {
          ;(node as any).__bind = bind
        }
        delete (node as any).bind
      } else if (typeof bind === 'string') {
        if (bind === '$someAttributes') delete (node as any).bind
        else if (bind.startsWith('$bind_')) delete (node as any).bind
      }
      if (Array.isArray(node.children)) visit(node.children)
    }
  }
  visit(schema as any[])
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

  // schema 数组提交（DnD / 容器更新 / legacy 导入）：迁移后转 DSL 再走统一漏斗。
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
    migrateExpressionKeys(working)
    const source =
      options?.name || options?.settings
        ? {
            name: options.name ?? formDefinition.value?.name ?? 'form',
            settings: options.settings ?? formDefinition.value?.settings,
          }
        : undefined
    commitFormDefinition(commitSchemaChildren(working, source), options)
  }

  // 画布/DnD 写路径：迁移后按 key 差异调和 DSL 树（仅转换变更节点，未变子树原样复用）
  function commitSchemaReconcile(
    nextSchema: FormKitSchemaFormKit[],
    options?: { reason?: string; merge?: boolean },
  ) {
    const working = cloneDef(
      nextSchema as unknown as DefSnapshot,
    ) as unknown as FormKitSchemaFormKit[]
    migrateExpressionKeys(working)
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

// 模块级默认实例（向后兼容）：未显式 provide 时走单例状态。
export const defaultSchemaHistory = createSchemaHistory({
  formDefinition: defaultFormDefinitionState.formDefinition,
  formSchema: defaultFormDefinitionState.formSchema,
  selectedIndex: defaultSelectionState.selectedIndex,
  selectedKey: defaultSelectionState.selectedKey,
  commitSchemaChildren: defaultFormDefinitionState.commitSchemaChildren,
})
export const {
  canUndo,
  canRedo,
  commitFormDefinition,
  commitSchema,
  commitSchemaReconcile,
  undo,
  redo,
  resetHistory,
  setFormDefinition,
} = defaultSchemaHistory
