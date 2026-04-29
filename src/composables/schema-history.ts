import { computed, ref } from 'vue'
import { formDsl, selectedId, selectedTarget } from '../utils/default-form-elements'
import type { FormDslDocument } from '@/dsl/types'

type DslSnapshot = FormDslDocument

const MAX_HISTORY = 100
const MERGE_WINDOW_MS = 500

const past = ref<DslSnapshot[]>([])
const future = ref<DslSnapshot[]>([])
const lastCommit = ref<{ at: number; reason?: string } | null>(null)

function cloneSnapshot(snapshot: DslSnapshot): DslSnapshot {
  try {
    return structuredClone(snapshot)
  } catch {
    return JSON.parse(JSON.stringify(snapshot)) as DslSnapshot
  }
}

export const canUndo = computed(() => past.value.length > 0)
export const canRedo = computed(() => future.value.length > 0)

function containsId(nodes: any[], id: string): boolean {
  for (const node of nodes) {
    if (!node || typeof node !== 'object') continue
    if ((node as any).id === id) return true
    const children = (node as any)?.children
    if (Array.isArray(children) && containsId(children, id)) return true
  }
  return false
}

export function commitSchema(
  next: DslSnapshot,
  options?: { reason?: string; merge?: boolean },
) {
  const now = Date.now()
  const current = formDsl.value
  const prevSelectedId = selectedId.value

  if (current === next) return

  const last = lastCommit.value
  const shouldMerge =
    options?.merge === true &&
    last?.reason === options?.reason &&
    !!last &&
    now - last.at <= MERGE_WINDOW_MS &&
    past.value.length > 0

  if (!shouldMerge) {
    past.value.push(cloneSnapshot(current))
    if (past.value.length > MAX_HISTORY) {
      past.value.splice(0, past.value.length - MAX_HISTORY)
    }
  }

  future.value = []
  lastCommit.value = { at: now, reason: options?.reason }

  formDsl.value = next
  if (prevSelectedId) {
    const ok = containsId(next.nodes as any[], prevSelectedId)
    if (!ok) {
      selectedId.value = null
      if (selectedTarget.value === 'node') selectedTarget.value = 'form'
    }
  }
}

export function undo() {
  const previous = past.value.pop()
  if (!previous) return

  future.value.unshift(cloneSnapshot(formDsl.value))
  if (future.value.length > MAX_HISTORY) {
    future.value.splice(MAX_HISTORY)
  }

  lastCommit.value = null
  formDsl.value = cloneSnapshot(previous)
}

export function redo() {
  const next = future.value.shift()
  if (!next) return

  past.value.push(cloneSnapshot(formDsl.value))
  if (past.value.length > MAX_HISTORY) {
    past.value.splice(0, past.value.length - MAX_HISTORY)
  }

  lastCommit.value = null
  formDsl.value = cloneSnapshot(next)
}

export function resetHistory() {
  past.value = []
  future.value = []
  lastCommit.value = null
}
