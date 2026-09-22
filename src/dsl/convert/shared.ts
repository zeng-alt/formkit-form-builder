// ═══ 转换层公共基础设施 ═════════════════════════════════════════════════════════
// 承载字段 / 容器 / 布局 / 静态四类节点转换共用的：schema 节点类型、渲染原语推断
// （$formkit/$cmp/$el 三种目标的统一读写）、outerClass 解析回写、以及通用节点头
// （id/name/label/key/visibleIf/events）构造。toSchema 与 fromSchema 两个方向都
// 依赖这里的 putByKind/applyByKind/buildNodeHead，保证四类节点对同一批语义键的
// 处理方式一致，不会各写各的。

import type { FormKitSchemaFormKit } from '@formkit/core'
import type { FormNode, RenderKind } from '../../types/dsl'
import { exprToJs, resolveEvents } from '../compile'
import { type ContainerSpec } from '../../elements/container-spec'

export type SchemaNode = FormKitSchemaFormKit & Record<string, unknown>

export interface ChildrenConvertCtx {
  children?: (sc?: SchemaNode[]) => FormNode[]
}

// ─── 渲染原语描述 ───────────────────────────────────────────────────────────────

export interface RenderTarget {
  renderAs: RenderKind
  /** $cmp 组件名 / $el 标签名；formkit 时缺省回退节点 type */
  target?: string
  /** 容器数据结构规格（list/card/group/inputGroup/buttonGroup/tabs），驱动 keyProp 注入与 group/list 包裹 */
  container?: ContainerSpec
}

/** 从 schema 节点推断渲染原语 */
export function inferRenderTarget(s: SchemaNode): RenderTarget {
  const anyS: any = s
  if (typeof anyS.$cmp === 'string') return { renderAs: 'cmp', target: anyS.$cmp }
  if (typeof anyS.$el === 'string') return { renderAs: 'el', target: anyS.$el }
  return {
    renderAs: 'formkit',
    target: typeof anyS.$formkit === 'string' ? anyS.$formkit : undefined,
  }
}

/** schema 是否匹配某渲染原语（注册表 match 用） */
export function matchSchemaKind(s: SchemaNode, rt?: RenderTarget): boolean {
  const anyS: any = s
  const kind = rt?.renderAs ?? 'formkit'
  const target = rt?.target
  if (kind === 'cmp') return typeof anyS.$cmp === 'string' && anyS.$cmp === target
  if (kind === 'el') return typeof anyS.$el === 'string' && anyS.$el === target
  if (typeof anyS.$formkit !== 'string') return false
  return target == null || anyS.$formkit === target
}

// ─── 布局 ↔ outerClass ─────────────────────────────────────────────────────────

/** 解析 outerClass：span 类保留在 outerClass（宽度唯一来源），不另存 layout */
export function parseOuterClass(outerClass: unknown, node: { outerClass?: string }): void {
  const raw = typeof outerClass === 'string' ? outerClass.trim() : ''
  if (!raw) return
  // 默认 col-span-12 等价于无显式宽度，不写入 outerClass，保证往返干净
  if (raw === 'col-span-12') return
  node.outerClass = raw
}

/** 回写 outerClass：优先用 raw 字符串；缺失时回退默认 col-span-12 */
export function nodeOuterClass(node: { outerClass?: string }): string {
  return node.outerClass?.trim() ? node.outerClass : 'col-span-12'
}

// ─── 通用节点头（id/name/label/key/visibleIf/events）───────────────────────────

/** 按渲染原语放置单个键：cmp → props；el → attrs；formkit → 顶层
 *  field/container/layout/static 四类转换都要用，故导出（原为 convert-common.ts 内私有 helper）。 */
export function putByKind(base: any, key: string, value: unknown, kind: RenderKind): void {
  if (kind === 'cmp') {
    if (!base.props) base.props = {}
    base.props[key] = value
  } else if (kind === 'el') {
    if (!base.attrs) base.attrs = {}
    base.attrs[key] = value
  } else {
    base[key] = value
  }
}

/** 同 putByKind，批量写入一组键值；四类转换共用，故导出。 */
export function applyByKind(base: any, values: Record<string, unknown>, kind: RenderKind): void {
  if (kind === 'cmp') {
    if (!base.props) base.props = {}
    Object.assign(base.props, values)
  } else if (kind === 'el') {
    if (!base.attrs) base.attrs = {}
    Object.assign(base.attrs, values)
  } else {
    Object.assign(base, values)
  }
}

/** 构造节点头（$formkit/$cmp/$el + __key + if + events + label + id）；
 *  field/container/layout/static 四类转换都要用，故导出。 */
export function buildNodeHead(node: FormNode, kind: RenderKind, target?: string): any {
  const base: any =
    kind === 'cmp'
      ? { $cmp: target ?? node.type }
      : kind === 'el'
        ? { $el: target ?? node.type }
        : { $formkit: node.type }
  if (node.key) base.__key = node.key
  if (node.visibleIf) base.if = exprToJs(node.visibleIf)
  // events 唯一真源：直接收敛为 schema 侧的 __bind（见 dsl/events.ts）
  const events = resolveEvents(node.events)
  if (events && Object.keys(events).length) applyByKind(base, events, kind)
  if (node.label) putByKind(base, 'label', node.label, kind)
  if (node.id) putByKind(base, 'id', node.id, kind)
  return base
}
