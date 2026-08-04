import axios from "axios";

type BindJs = { __js: string };
const allowedEventKeys = new Set(["onClick", "onChange", "onInput", "onFocus", "onBlur"]);

function extractCode(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && typeof (v as any).__js === "string") return (v as BindJs).__js;
  return undefined;
}

export function normalizeBind(bind: unknown): Record<string, string> | undefined {
  if (!bind || typeof bind !== "object") return undefined;
  const obj = bind as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const key of Object.keys(obj)) {
    if (!allowedEventKeys.has(key)) continue;
    const code = extractCode(obj[key]);
    if (typeof code === "string" && code.trim()) out[key] = code;
  }
  return Object.keys(out).length ? out : undefined;
}

// export type BindRuntimeCtx = {
//   event?: unknown;
//   form?: unknown;
//   /** 表单定义 id（settings.submit 提交逻辑可引用） */
//   id?: unknown;
//   /** 表单定义 version（settings.submit 提交逻辑可引用） */
//   version?: unknown;
//   attrs?: unknown;
//   $value?: unknown;
//   $node?: unknown;
//   $name?: unknown;
//   $get?: unknown;
//   $slots?: unknown;
//   [key: string]: unknown;
// };

/**
 * 构造运行时注入值，随 runBindCode 摊开注入，供用户代码直接引用：
 *   $value — 当前节点的值（NaiveTextInput 经 extra 覆盖为最新输入值）
 *   $node  — 当前节点的 FormKit 节点实例
 *   $name  — 当前节点的字段名（即 $node.name）
 *   $get(name) — 按字段名取任意字段的当前值（等价 form[name]）
 *   $slots — 节点插槽
 *   ...extra — 调用方追加的额外键（可覆盖内置键）
 */
// export function createSchemaRuntimeContext(
//   ctx: FormKitFrameworkContext,
//   extra?: Record<string, unknown>,
// ) {
//   const node: any = (ctx as any)?.node;
//   const form = (node?.root?.value ?? {}) as any;
//   const value = (ctx as any)?._value ?? node?.value;
//   const slots = (ctx as any)?.slots ?? node?.context?.slots;
//   const $get = (name: string) => {
//     const at = node?.root?.at;
//     if (typeof at === "function") return at.call(node.root, name)?.value;
//     const byName = getNode(name);
//     if (byName) return (byName as any).value;
//     return form?.[name];
//   };

//   const runtime: Record<string, unknown> = {
//     $value: value,
//     $node: node,
//     $name: node?.name,
//     $get,
//     $slots: slots,
//     ...extra,
//   };

//   return runtime;
// }

/**
 * 执行事件绑定代码（onClick / onChange / onInput / onFocus / onBlur）。
 *
 * 注入到用户代码中的参数，可直接引用：
 *   event — 触发事件的原始事件对象（click / input / focus / blur 等）
 *   form  — 当前表单数据（等价 ctx.form）
 *   id    — 表单定义 id（仅有 definition 输入时提供）
 *   version — 表单定义 version（仅有 definition 输入时提供）
 *   $value — 当前节点的值
 *   $node  — 当前节点的 FormKit 节点实例
 *   $name  — 当前节点的字段名（即 $node.name）
 *   $get(name) — 按字段名取任意字段的当前值
 *   $slots — 节点插槽
 *   attrs — 当前节点的全部配置
 *   ctx   — 以上参数的合并对象（event / form / attrs / $value / $node / $name / $get / $slots），高级用途
 *   axios — HTTP 请求库
 */
export async function runBindCode(
  code: string,
  event: any,
  ctx: any,
  formId?: string | undefined,
  formVersion?: number | undefined,
  extra?: Record<string, unknown>,
) {
  const { form, attrs, $value, $node, $name, $get, $slots } = ctx;
  // 显式注入命名参数，用户代码直接引用；async IIFE 支持顶层 return 提前退出
  const runner = new Function(
    "event",
    "form",
    "id",
    "version",
    "$value",
    "$node",
    "$name",
    "$get",
    "$slots",
    "attrs",
    "ctx",
    "extra",
    "axios",
    `"use strict";
return (async () => {
${code}
})()`,
  );
  return await (runner as any)(
    event,
    form,
    formId,
    formVersion,
    $value,
    $node,
    $name,
    $get,
    $slots,
    attrs,
    ctx,
    extra,
    axios,
  );
}
