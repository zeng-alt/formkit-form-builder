import type { WritableComputedRef } from 'vue'
import { computed } from 'vue'
import { findDslNodeByKey, updateDslNodeAtKey } from '@/utils/schema/dsl-tree'
import { exprToJs, parseExprString } from '@/dsl'
import { eventsToBind, bindToEvents } from '@/dsl/events'
import { getColSpan } from '@/utils/dnd/grid'
import { useFormBuilderState } from '@/state/create-form-builder-state'
import { DSL_VERSION } from '@/types/dsl'
import type { FieldNode, FormNode, OptionItem, ValidationRule } from '@/types/dsl'
import type { DataTableColumn } from '@/components/ui/containers/data-table/types'

export function useFormField() {
  // 所属 FormBuilder 实例状态：选中 / 真源 / 提交漏斗全部绑定到各自实例。
  const state = useFormBuilderState()
  const {
    formDefinition,
    selectedIndex,
    selectedKey,
    selectedTarget,
    elementEditTarget,
    elementEditCommit,
  } = state
  const { commitFormDefinition } = state

  // 当前选中节点：直接读 DSL 真源（formDefinition），而非 FormKit schema 投影。
  // 元素属性编辑期间（数据表格列元素），工作节点覆盖到 elementEditTarget。
  const selectedField = computed<FormNode | undefined>(() => {
    if (elementEditTarget.value) return elementEditTarget.value
    const root = formDefinition.value?.root?.children
    if (!Array.isArray(root)) return undefined
    const key = selectedKey.value
    if (key) return findDslNodeByKey(root, key)?.node
    return root[selectedIndex.value]
  })

  // 树内选中的节点（不受元素编辑覆盖影响）：列操作始终定位所属数据表格节点。
  const selectedTableField = computed<FormNode | undefined>(() => {
    const root = formDefinition.value?.root?.children
    if (!Array.isArray(root)) return undefined
    const key = selectedKey.value
    if (key) return findDslNodeByKey(root, key)?.node
    return root[selectedIndex.value]
  })

  // 数据表格选中列：列非树节点，从所属表格节点的 props.columns 按下标取（配合 selectedKey 定位）。
  const selectedColumnIndex = state.selectedColumnIndex
  const selectedColumn = computed<{ index: number; column: DataTableColumn } | undefined>(() => {
    const idx = selectedColumnIndex.value
    if (idx === null || idx === undefined || idx < 0) return undefined
    const cols = selectedTableField.value?.props?.columns
    if (!Array.isArray(cols)) return undefined
    const column = cols[idx]
    if (!column || typeof column !== 'object') return undefined
    return { index: idx, column: column as DataTableColumn }
  })
  const selectedIsColumn = computed(() => selectedColumnIndex.value !== null)

  // 设置/清除元素属性编辑目标：非树节点（列元素）编辑时挂到此处复用标准字段编辑器
  const setElementEditTarget = (node: FormNode | null, commit?: (node: FormNode) => void) => {
    elementEditTarget.value = node
    elementEditCommit.value = commit ?? null
  }

  const normalizeName = (value: string) => {
    let name = value
      .trim()
      .replace(/[^a-zA-Z0-9_]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
    if (!name) return ''
    if (/^\d/.test(name)) name = `field_${name}`
    return name
  }

  // DSL 写路径：克隆选中节点 → 应用变更 → 按 key 打补丁提交（不原地改真源，保证 undo 快照正确）。
  // patchTreeTarget 始终写树内节点（列操作 / 元素提交落点）；patchSelected 优先写元素编辑覆盖。
  const patchTreeTarget = (mutate: (node: FormNode) => FormNode) => {
    const def = formDefinition.value
    const root = Array.isArray(def?.root?.children) ? def.root.children : []
    if (!root.length) return
    const idx = Math.max(0, Math.min(selectedIndex.value, root.length - 1))
    const key = selectedKey.value ?? root[idx]?.key ?? root[idx]?.id
    const target = key ? (findDslNodeByKey(root, key)?.node ?? root[idx]) : root[idx]
    if (!target) return
    const nextNode = mutate({ ...target } as FormNode) as FormNode
    nextNode.id = target.id
    const nextChildren = key
      ? updateDslNodeAtKey(root, key, nextNode).nodes
      : root.map((n, i) => (i === idx ? nextNode : n))
    commitFormDefinition(
      { ...def, root: { ...def.root, children: nextChildren } },
      { reason: 'field-edit', merge: true },
    )
  }

  const patchSelected = (mutate: (node: FormNode) => FormNode) => {
    if (elementEditTarget.value) {
      const current = elementEditTarget.value
      const nextNode = mutate({ ...current } as FormNode) as FormNode
      nextNode.id = current.id
      elementEditTarget.value = nextNode
      elementEditCommit.value?.(nextNode)
      return
    }
    patchTreeTarget(mutate)
  }

  const setFieldProp = (key: keyof FormNode, value: unknown) => {
    patchSelected((node) => {
      const record = node as unknown as Record<string, unknown>
      if (value === undefined) delete record[key]
      else record[key] = value
      return node
    })
  }

  const setPropsProp = (key: string, value: unknown) => {
    patchSelected((node) => {
      const props = { ...node.props }
      if (value === undefined) delete props[key]
      else props[key] = value
      node.props = Object.keys(props).length ? props : undefined
      return node
    })
  }

  const createPropsProp = <T>(key: string, defaultValue: T): WritableComputedRef<T, T> => {
    return computed({
      get: () => {
        const value = selectedField.value?.props?.[key]
        return (value ?? defaultValue) as T
      },
      set: (value: T) => setPropsProp(key, value),
    })
  }

  // ─── 数据表格列编辑写路径：改所属表格节点的 props.columns[idx] ────────────────
  const setColumnProp = (key: string, value: unknown) => {
    patchTreeTarget((node) => {
      const props = { ...node.props }
      const cols = Array.isArray(props.columns) ? [...(props.columns as DataTableColumn[])] : []
      const idx = selectedColumnIndex.value
      if (idx === null || idx === undefined || idx < 0 || idx >= cols.length) return node
      const col = { ...cols[idx] } as Record<string, unknown>
      if (value === undefined || value === null || value === '') delete col[key]
      else col[key] = value
      // 列 key/title 变更时同步来源元素 name/label（element.name=key、element.label=title）
      const element = col.element
      if (key === 'key' && element && typeof element === 'object' && value) {
        col.element = { ...(element as Record<string, unknown>), name: value }
      } else if (key === 'title' && element && typeof element === 'object' && value) {
        col.element = { ...(element as Record<string, unknown>), label: value }
      }
      cols[idx] = col as unknown as DataTableColumn
      props.columns = cols.length ? cols : undefined
      node.props = Object.keys(props).length ? props : undefined
      return node
    })
  }

  const createColumnProp = <T>(key: string, defaultValue: T): WritableComputedRef<T, T> => {
    return computed({
      get: () => {
        const col = selectedColumn.value?.column as unknown as Record<string, unknown> | undefined
        const value = col?.[key]
        return (value ?? defaultValue) as T
      },
      set: (value: T) => setColumnProp(key, value),
    })
  }

  const createButtonProp = <T>(key: string, defaultValue: T): WritableComputedRef<T, T> => {
    return computed({
      get: () => {
        const value = selectedField.value?.props?.[key]
        return (value ?? defaultValue) as T
      },
      set: (value: T) => setPropsProp(key, value),
    })
  }

  // ─── 校验（DSL 存 ValidationRule[]，直接读写规则数组）─────────────────────────
  // FormKit v2 的校验数组语法（[[规则名, ...参数], ...]）不再把参数拼成逗号/竖线
  // 分隔的字符串，右侧面板也随之直接操作 ValidationRule[]，不用先序列化成 pipe
  // 字符串再解析回去——省掉一趟无意义的往返，也避免参数本身含逗号/竖线时被拆坏。
  const fieldValidationRules = computed<ValidationRule[]>(
    () => (selectedField.value as FieldNode | undefined)?.validation ?? [],
  )

  const setValidationRules = (rules: ValidationRule[]) => {
    patchSelected((node) => {
      if (node.category !== 'field') return node
      ;(node as FieldNode).validation = rules.length ? rules : undefined
      return node
    })
  }

  const validationStringLength = computed(() => fieldValidationRules.value.length)

  const createValidationValue = (validationType: string, active: boolean = true) => {
    return computed({
      get: () => getParameterizedValidation(validationType),
      set: (value: string) => {
        updateValidationString(`${validationType}:${value}`, active)
      },
    })
  }

  const createValidationMessageValue = (validationType: string) => {
    return computed<string>({
      get: () => {
        const rules = (selectedField.value as FieldNode | undefined)?.validation
        const rule = rules?.find((r) => r.rule === validationType)
        return rule?.message ?? ''
      },
      set: (value: string) => {
        patchSelected((node) => {
          if (node.category !== 'field') return node
          const field = node as FieldNode
          const rules = [...(field.validation ?? [])]
          const idx = rules.findIndex((r) => r.rule === validationType)
          const trimmed = value.trim()
          if (idx >= 0) {
            const next = { ...rules[idx]! }
            if (trimmed) next.message = trimmed
            else delete next.message
            rules[idx] = next
          } else if (trimmed) {
            rules.push({ rule: validationType, message: trimmed })
          }
          field.validation = rules.length ? rules : undefined
          return node
        })
      },
    })
  }

  // ─── 基础属性 ─────────────────────────────────────────────────────────────────
  const fieldName = computed({
    get: () => selectedField.value?.name || '',
    set: (newName: string) => {
      const nextName = normalizeName(newName)
      setFieldProp('name', nextName || undefined)
    },
  })

  const label = computed({
    get: () => selectedField.value?.label || '',
    set: (newLabel: string) => {
      patchSelected((node) => {
        const v = newLabel.trim()
        if (v) node.label = v
        else delete node.label
        return node
      })
    },
  })

  const help = computed({
    get: () => {
      const value = selectedField.value?.props?.help
      return typeof value === 'string' ? value : ''
    },
    set: (newHelp: string) => setPropsProp('help', newHelp.trim() || undefined),
  })

  const placeholder = computed({
    get: () => {
      const value = selectedField.value?.props?.placeholder
      return typeof value === 'string' ? value : ''
    },
    set: (newPlaceholder: string) =>
      setPropsProp('placeholder', newPlaceholder.trim() || undefined),
  })

  const buttonText = computed<string>({
    get: () => {
      const node = selectedField.value
      const value = node?.props?.buttonText ?? node?.props?.text ?? node?.label
      return typeof value === 'string' ? value : ''
    },
    set: (value: string) => {
      const next = value.trim()
      setPropsProp('buttonText', next || undefined)
    },
  })

  const buttonType = computed<string>({
    get: () => {
      const node = selectedField.value
      const value = node?.props?.buttonType ?? 'default'
      return typeof value === 'string' ? value : ''
    },
    set: (value: string) => {
      const next = value.trim()
      setPropsProp('buttonType', next || undefined)
    },
  })

  // ─── 值 / 表达式 ─────────────────────────────────────────────────────────────
  const fieldValue = computed<string>({
    get: () => {
      const node: any = selectedField.value
      if (!node) return ''
      if (typeof node.expr === 'string' && node.expr) return ''
      const value = node.value
      if (value !== undefined && value !== null) return String(value)
      const propValue = node.props?.value ?? node.props?.text
      if (propValue !== undefined && propValue !== null) return String(propValue)
      return ''
    },
    set: (newValue: string) => {
      patchSelected((node) => {
        if (node.category === 'field') {
          ;(node as FieldNode).value = newValue === '' ? undefined : newValue
        } else {
          const props = { ...node.props }
          const targetKey = 'value' in props || !('text' in props) ? 'value' : 'text'
          if (newValue === '') delete props[targetKey]
          else props[targetKey] = newValue
          node.props = Object.keys(props).length ? props : undefined
        }
        return node
      })
    },
  })

  const useExpressionValue = computed({
    get: () => typeof (selectedField.value as FieldNode | undefined)?.expr === 'string',
    set: (value: boolean) => {
      patchSelected((node) => {
        if (node.category !== 'field') return node
        const field = node as FieldNode
        if (value) {
          if (typeof field.expr !== 'string' || !field.expr) {
            const current = field.value
            const raw = current !== undefined && current !== null ? String(current) : ''
            field.expr = raw || '$'
          }
        } else {
          field.expr = undefined
        }
        return node
      })
    },
  })

  const exprExpression = computed<string>({
    get: () => (selectedField.value as FieldNode | undefined)?.expr ?? '',
    set: (value: string) => {
      patchSelected((node) => {
        if (node.category !== 'field') return node
        const field = node as FieldNode
        if (value.trim()) field.expr = value
        else field.expr = undefined
        return node
      })
    },
  })

  const valueExpression = exprExpression

  const ifExpression = computed<string>({
    get: () => {
      const visibleIf = selectedField.value?.visibleIf
      if (!visibleIf) return ''
      // var 模式：编辑器显示 $field（与表达式求值器 / FormKit schema 一致）
      return exprToJs(visibleIf)
    },
    set: (value: string) => {
      const next = value.trim()
      setFieldProp('visibleIf', next ? parseExprString(next) : undefined)
    },
  })

  // ─── 数字 / 文件 / 范围 ───────────────────────────────────────────────────────
  const whichNumber = computed<string>({
    get: () => {
      const value = selectedField.value?.props?.number
      return typeof value === 'string' ? value : 'integer'
    },
    set: (value: string) => {
      patchSelected((node) => {
        const props = { ...node.props }
        props.number = value
        props.step = value === 'integer' ? '1' : '0.1'
        node.props = Object.keys(props).length ? props : undefined
        return node
      })
    },
  })

  const numOfFiles = computed({
    get: () => {
      const value = selectedField.value?.props?.multiple
      return typeof value === 'string' ? value : 'false'
    },
    set: (value: string) => setPropsProp('multiple', value),
  })

  const min = computed<number | undefined>({
    get: () => selectedField.value?.props?.min as number | undefined,
    set: (newMin: number | undefined) => setPropsProp('min', newMin),
  })

  const max = computed<number | undefined>({
    get: () => selectedField.value?.props?.max as number | undefined,
    set: (newMax: number | undefined) => setPropsProp('max', newMax),
  })

  // ─── 选项 ─────────────────────────────────────────────────────────────────────
  const modelValue = computed<string[]>({
    get: () => {
      const node: any = selectedField.value
      const options = node?.options ?? node?.props?.options
      return Array.isArray(options) ? (options as string[]) : []
    },
    set: (newOptions: string[]) => {
      patchSelected((node) => {
        if (node.category === 'field') {
          ;(node as FieldNode).options = newOptions as unknown as OptionItem[]
        } else {
          const props = { ...node.props }
          props.options = newOptions
          node.props = Object.keys(props).length ? props : undefined
        }
        return node
      })
    },
  })

  const optionsRaw = computed<unknown>({
    get: () => {
      const node: any = selectedField.value
      return node?.options ?? node?.props?.options ?? []
    },
    set: (newOptions: unknown) => {
      patchSelected((node) => {
        if (node.category === 'field') {
          ;(node as FieldNode).options = newOptions as OptionItem[]
        } else {
          const props = { ...node.props }
          props.options = newOptions
          node.props = Object.keys(props).length ? props : undefined
        }
        return node
      })
    },
  })

  // ─── 校验规则读写工具（右侧面板用，rule:arg1,arg2 只是这几个组件内部的书写习惯，
  //     落盘前在这里转换成结构化 ValidationRule，不再经过 pipe 字符串）──────────
  const parseValidationArgToken = (raw: string): unknown => {
    const t = raw.trim()
    if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t)
    if (t === 'true') return true
    if (t === 'false') return false
    return t
  }

  const updateValidationString = (value: string, active: boolean = true) => {
    // 只切首个冒号：参数本身可能含冒号（如 matches 正则 /^a:b$/、starts_with:https:）
    const colonIndex = value.indexOf(':')
    const ruleName = colonIndex === -1 ? value : value.slice(0, colonIndex)
    const argStr = colonIndex === -1 ? undefined : value.slice(colonIndex + 1)
    const rules = [...fieldValidationRules.value]
    const idx = rules.findIndex((r) => r.rule === ruleName)

    if (colonIndex === -1) {
      // 无参规则：纯开关（与原行为一致——忽略 active，存在则移除、不存在则添加）
      if (idx === -1) rules.push({ rule: ruleName })
      else rules.splice(idx, 1)
      setValidationRules(rules)
      return
    }

    if (!active) {
      if (idx !== -1) rules.splice(idx, 1)
      setValidationRules(rules)
      return
    }

    const args = argStr ? argStr.split(',').map(parseValidationArgToken) : []
    const base: ValidationRule = idx !== -1 ? rules[idx]! : { rule: ruleName }
    const nextRule: ValidationRule = { ...base, rule: ruleName }
    if (args.length) nextRule.args = args
    else delete nextRule.args
    if (idx !== -1) rules[idx] = nextRule
    else rules.push(nextRule)
    setValidationRules(rules)
  }

  const isActive = (fn: (arg0: string) => boolean, strVal: string) => {
    return computed(() => fn(strVal))
  }

  const getParameterizedValidation = (validationType: string) => {
    const rule = fieldValidationRules.value.find((r) => r.rule === validationType)
    return rule?.args?.length ? rule.args.join(',') : ''
  }

  // ─── 状态 ─────────────────────────────────────────────────────────────────────
  const selectedIsForm = computed(() => selectedTarget.value === 'form')
  const hasField = computed(() => selectedIsForm.value || !!selectedField.value)

  const isValidationChecked = (validationType: string) => {
    if (!hasField.value) return false
    const rules = (selectedField.value as FieldNode | undefined)?.validation
    if (!rules?.length) return false
    return rules.some((r) => r.rule === validationType)
  }

  const currentFieldType = computed(() => {
    if (!hasField.value) return null
    if (selectedIsForm.value) return 'form'
    const node = selectedField.value
    if (!node) return null
    return node.type
  })

  const formName = computed<string>({
    get: () => formDefinition.value?.name ?? '',
    set: (value: string) => {
      const next = value.trim()
      const def = formDefinition.value
      commitFormDefinition({ ...def, name: next || '' }, { reason: 'form-name', merge: true })
    },
  })

  const formId = computed<string>({
    get: () => formDefinition.value?.id ?? '',
    set: (value: string) => {
      const next = value.trim()
      const def = formDefinition.value
      commitFormDefinition({ ...def, id: next || '' }, { reason: 'form-id', merge: true })
    },
  })

  const formVersion = computed<number>({
    get: () => formDefinition.value?.version ?? DSL_VERSION,
    set: (value: number) => {
      const n = Number(value)
      const next = Number.isFinite(n) && n > 0 ? Math.round(n) : DSL_VERSION
      const def = formDefinition.value
      commitFormDefinition({ ...def, version: next }, { reason: 'form-version', merge: true })
    },
  })

  const formLabelPosition = computed<'top' | 'left'>({
    get: () => (formDefinition.value?.settings?.labelAlign === 'left' ? 'left' : 'top'),
    set: (value: 'top' | 'left') => {
      const def = formDefinition.value
      commitFormDefinition(
        { ...def, settings: { ...def.settings, labelAlign: value } },
        { reason: 'form-label-position', merge: true },
      )
    },
  })

  const formLabelWidth = computed<number>({
    get: () => formDefinition.value?.settings?.labelWidth ?? 80,
    set: (value: number) => {
      const n = Number(value)
      const next = Number.isFinite(n) ? Math.max(0, Math.min(2000, Math.round(n))) : 120
      const def = formDefinition.value
      commitFormDefinition(
        { ...def, settings: { ...def.settings, labelWidth: next } },
        { reason: 'form-label-width', merge: true },
      )
    },
  })

  const formSubmit = computed<string>({
    get: () => formDefinition.value?.settings?.submit ?? '',
    set: (value: string) => {
      const def = formDefinition.value
      commitFormDefinition(
        { ...def, settings: { ...def.settings, submit: value } },
        { reason: 'form-submit', merge: true },
      )
    },
  })

  const availableFieldNames = computed(() => {
    const names = new Set<string>()
    const walk = (nodes: FormNode[]) => {
      for (const node of nodes) {
        if (node.name && typeof node.name === 'string') names.add(node.name)
        const children = (node as { children?: FormNode[] }).children
        if (Array.isArray(children)) walk(children)
      }
    }
    walk(formDefinition.value?.root?.children ?? [])
    return Array.from(names)
  })

  const availableFields = computed(() => {
    const fields = new Map<string, string>()
    const walk = (nodes: FormNode[]) => {
      for (const node of nodes) {
        if (node.name && typeof node.name === 'string') {
          fields.set(node.name, node.label ?? '')
        }
        const children = (node as { children?: FormNode[] }).children
        if (Array.isArray(children)) walk(children)
      }
    }
    walk(formDefinition.value?.root?.children ?? [])
    return Array.from(fields, ([name, label]) => ({ name, label }))
  })

  const rowSpan = computed<number>({
    get: () => {
      const classes =
        typeof selectedField.value?.outerClass === 'string' ? selectedField.value.outerClass : ''
      const match = classes.match(/\brow-span-(\d+)\b/)
      const parsed = match ? parseInt(match[1]!, 10) : 1
      return Number.isFinite(parsed) && parsed > 1 ? parsed : 1
    },
    set: (value: number) => {
      const nextSpan = Math.max(1, Math.min(6, Math.round(value)))
      patchSelected((node) => {
        let classes = typeof node.outerClass === 'string' ? node.outerClass : ''
        if (nextSpan > 1) {
          if (/\brow-span-\d+\b/.test(classes)) {
            classes = classes.replace(/\brow-span-\d+\b/g, `row-span-${nextSpan}`)
          } else {
            classes = `${classes} row-span-${nextSpan}`.replace(/\s+/g, ' ').trim()
          }
        } else {
          classes = classes
            .replace(/\brow-span-\d+\b/g, '')
            .replace(/\s+/g, ' ')
            .trim()
        }
        if (classes) node.outerClass = classes
        else delete node.outerClass
        return node
      })
    },
  })

  const colSpan = computed<number>({
    get: () => getColSpan(selectedField.value),
    set: (value: number) => {
      // 宽度唯一来源 outerClass：只改类名里的 col-span-N，不再写 layout；最小 2
      const nextSpan = Math.max(2, Math.min(12, Math.round(value)))
      patchSelected((node) => {
        let classes = typeof node.outerClass === 'string' ? node.outerClass : ''
        if (nextSpan < 12) {
          if (/\bcol-span-\d+\b/.test(classes)) {
            classes = classes.replace(/\bcol-span-\d+\b/g, `col-span-${nextSpan}`)
          } else {
            classes = `${classes} col-span-${nextSpan}`.replace(/\s+/g, ' ').trim()
          }
        } else {
          classes = classes
            .replace(/\bcol-span-\d+\b/g, '')
            .replace(/\s+/g, ' ')
            .trim()
        }
        if (classes) node.outerClass = classes
        else delete node.outerClass
        return node
      })
    },
  })

  // 事件绑定写路径：真源是 DSL events（编辑器仍以 schema 侧 __bind 形态读写，
  // 见 BindEditor.vue），落盘时收敛到 node.events，不再写 props.__bind（单一来源）。
  const bindEvents = computed<Record<string, unknown>>({
    get: () => {
      const node = selectedField.value
      return node ? (eventsToBind(node.events) ?? {}) : {}
    },
    set: (value: Record<string, unknown>) => {
      patchSelected((node) => {
        const events = bindToEvents(value)
        if (events?.length) node.events = events
        else delete node.events
        return node
      })
    },
  })

  // 自定义属性：key → value 文本 map，渲染时透传给 naive-ui 组件属性
  const customAttrs = computed<Record<string, string>>({
    get: () => {
      const value = selectedField.value?.props?.__attrs
      if (value && typeof value === 'object') return value as Record<string, string>
      return {}
    },
    set: (value: Record<string, string>) => {
      const hasAny = value && typeof value === 'object' && Object.keys(value).length > 0
      setPropsProp('__attrs', hasAny ? value : undefined)
    },
  })

  return {
    selectedField,
    selectedTableField,
    selectedColumn,
    selectedColumnIndex,
    selectedIsColumn,
    setElementEditTarget,
    createColumnProp,
    setColumnProp,
    fieldName,
    useExpressionValue,
    valueExpression,
    ifExpression,
    label,
    buttonText,
    buttonType,
    placeholder,
    fieldValue,
    updateValidationString,
    isActive,
    createValidationValue,
    createValidationMessageValue,
    validationStringLength,
    currentFieldType,
    availableFieldNames,
    availableFields,
    hasField,
    selectedIsForm,
    formName,
    formId,
    formVersion,
    formLabelPosition,
    formLabelWidth,
    formSubmit,
    help,
    whichNumber,
    numOfFiles,
    modelValue,
    optionsRaw,
    min,
    max,
    isValidationChecked,
    createButtonProp,
    createPropsProp,
    rowSpan,
    colSpan,
    bindEvents,
    customAttrs,
  }
}
