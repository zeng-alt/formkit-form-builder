// ═══ 元素公共访问层（基于统一 DSL 注册表）═══════════════════════════════════════
// 定义/面板/编辑器/默认元素 直接读 dsl/registry.ts 的统一注册表；
// FormKit input 注册与 $cmp schema 组件库见 ./formkit.ts，容器画布见 ./canvas.ts。

import type { Component } from "vue";
import { defineAsyncComponent } from "vue";
import type { FormKitSchemaFormKit } from "@formkit/core";
import { getElementTypeDef, getElementTypeDefs, type ElementTypeDef } from "../dsl/registry";
import { registerBuiltinElementTypes } from "../dsl/definitions";
import type { FormNode } from "../types/dsl";
import type { ElementDefinition, ElementPaletteProp } from "./types";

// 确保内置 DSL 元素类型已在 fieldProps 创建前注册
registerBuiltinElementTypes();

export function getElementDefinition(type: string | null | undefined): ElementDefinition | null {
  if (!type) return null;
  const def = getElementTypeDef(type);
  if (!def || !def.template) return null;
  return {
    type: def.type,
    category: def.category,
    icon: def.icon ?? "",
    tooltipKey: def.tooltipKey ?? "",
    schema: def.template,
    editor: def.editor,
  };
}

export function getElementDefinitions(): ElementDefinition[] {
  return getElementTypeDefs()
    .filter((d) => d.template)
    .map((d) => ({
      type: d.type,
      category: d.category,
      icon: d.icon ?? "",
      tooltipKey: d.tooltipKey ?? "",
      schema: d.template!,
      editor: d.editor,
    }));
}

// ─── 右侧属性编辑器 ────────────────────────────────────────────────────────────

const editorCache = new Map<string, Component>();

export function getFieldEditorComponent(type: string | null | undefined): Component | null {
  const def = getElementTypeDef(type ?? undefined);
  if (!def?.editor) return null;
  const cached = editorCache.get(type!);
  if (cached) return cached;
  const component = defineAsyncComponent(def.editor);
  editorCache.set(type!, component);
  return component;
}

// ─── 左侧面板物料 ──────────────────────────────────────────────────────────────

export function createFieldProps(t: (key: string) => string): ElementPaletteProp[] {
  return getElementTypeDefs()
    .filter((d) => d.template && d.icon)
    .map((d) => ({
      name: d.type,
      tooltip: t(d.tooltipKey ?? ""),
      icon: d.icon!,
      category: d.category,
    }));
}

// 未翻译版本（用于按 name 查找分类/图标）
export const fieldProps: ElementPaletteProp[] = createFieldProps((v) => v);

// ─── 画布默认元素（DSL 模板 → 翻译 → toSchema）─────────────────────────────────

function defaultDslNodeFromTemplate(def: ElementTypeDef, t: (key: string) => string): FormNode {
  const node = def.defaults();
  const tmpl = def.template!;
  if (tmpl.nameKey) node.name = t(tmpl.nameKey);
  if (tmpl.labelKey) node.label = t(tmpl.labelKey);
  const props = { ...node.props };
  if (tmpl.placeholderKey) props.placeholder = t(tmpl.placeholderKey);
  if (tmpl.helpKey) props.help = t(tmpl.helpKey);
  // 按钮类静态元素：内容统一存 props.text（画布内联编辑 / 右侧"内容"输入框读写），
  // 首次拖入时用 label 文案播种，保证内容框与按钮显示一致
  if (
    tmpl.labelKey &&
    def.category === "static" &&
    (def.type === "submit" || def.type === "reset" || def.type === "naiveButton")
  ) {
    props.text = t(tmpl.labelKey);
  }
  node.props = Object.keys(props).length ? props : undefined;
  return node;
}

export function createDefaultFormElements(t: (key: string) => string): FormKitSchemaFormKit[] {
  const out: FormKitSchemaFormKit[] = [];
  for (const def of getElementTypeDefs()) {
    if (!def.template) continue;
    const node = defaultDslNodeFromTemplate(def, t);
    const schema = def.toSchema(node, {}) as any;
    // 左侧面板副标题（非表单字段，仅面板展示用）
    schema.description = t(def.template.descriptionKey);
    out.push(schema as FormKitSchemaFormKit);
  }
  return out;
}

// ─── 由 schema 节点反查元素 type（走统一注册表 match）──────────────────────────

export function getElementTypeBySchema(node: unknown): string | undefined {
  const n: any = node;
  if (!n || typeof n !== "object") return undefined;
  for (const def of getElementTypeDefs()) {
    if (def.match?.(n)) return def.type;
  }
  return undefined;
}

export type {
  ElementCategory,
  ElementDefinition,
  ElementPaletteProp,
  ElementEditor,
} from "./types";
