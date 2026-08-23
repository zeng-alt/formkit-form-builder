import axios, { type AxiosInstance } from 'axios'
import type { FormKitNode } from '@formkit/core'

export { BIND_AXIOS_KEY } from '@/composables/use-bind-http'

type BindJs = { __js: string }

/** 表单定义元信息：绑定代码经 $form / id / version / name 读取（来源为 DSL 顶层字段） */
export interface FormMeta {
  id?: string
  version?: number
  name?: string
}

const allowedEventKeys = new Set(['onClick', 'onChange', 'onInput', 'onFocus', 'onBlur'])

function extractCode(v: unknown): string | undefined {
  if (typeof v === 'string') return v
  if (v && typeof v === 'object' && typeof (v as any).__js === 'string') return (v as BindJs).__js
  return undefined
}

export function normalizeBind(bind: unknown): Record<string, string> | undefined {
  if (!bind || typeof bind !== 'object') return undefined
  const obj = bind as Record<string, unknown>
  const out: Record<string, string> = {}
  for (const key of Object.keys(obj)) {
    if (!allowedEventKeys.has(key)) continue
    const code = extractCode(obj[key])
    if (typeof code === 'string' && code.trim()) out[key] = code
  }
  return Object.keys(out).length ? out : undefined
}

/**
 * 执行事件绑定代码（onClick / onChange / onInput / onFocus / onBlur）。
 *
 * 注入到用户代码中的参数，可直接引用：
 *   event — 触发事件的原始事件对象（click / input / focus / blur 等）
 *   form  — 当前表单数据（等价 ctx.form）
 *   $form — 表单定义元信息 { id, version, name }，来自 DSL 顶层字段
 *   $value — 当前节点的值
 *   $node  — 当前节点的 FormKit 节点实例
 *   $name  — 当前节点的字段名（即 $node.name）
 *   $get(name) — 按字段名取任意字段的当前值
 *   $slots — 节点插槽
 *   attrs — 当前节点的全部配置
 *   ctx   — 以上参数的合并对象（event / form / attrs / $value / $node / $name / $get / $slots / $form），高级用途
 *   axios — HTTP 请求库
 */
export async function runBindCode(
  code: string,
  event: any,
  ctx: any,
  formMeta?: FormMeta,
  extra?: Record<string, unknown>,
  axiosInstance?: AxiosInstance,
) {
  const node = ctx?.node as FormKitNode | undefined
  const root = node?.root
  // framework context 只带 node / _value / value / attrs / slots，$* 与 form 需由 node 派生
  const $node = node
  const $name = node?.name
  const $value = node?.value ?? ctx?._value
  const $get = (name: string): unknown => root?.find?.(name)?.value ?? root?.at?.(name)?.value
  const $slots = ctx?.slots
  const form = ctx?.form ?? root?.value
  const attrs = ctx?.attrs
  // 表单定义元信息 $form（id / version / name）来自 DSL 定义，不读 FormKit 节点属性（节点 id 可能为 input_N）
  const $form: FormMeta = formMeta ?? {}
  // 显式注入命名参数，用户代码直接引用；async IIFE 支持顶层 return 提前退出
  const runner = new Function(
    'event',
    'form',
    '$form',
    '$value',
    '$node',
    '$name',
    '$get',
    '$slots',
    'attrs',
    'ctx',
    'extra',
    'axios',
    `"use strict";
return (async () => {
${code}
})()`,
  )
  return await (runner as any)(
    event,
    form,
    $form,
    $value,
    $node,
    $name,
    $get,
    $slots,
    attrs,
    ctx,
    extra,
    axiosInstance ?? axios,
  )
}
