import type { Component } from "vue";
import { defineAsyncComponent, defineComponent, h, markRaw } from "vue";
import { createInput, FormKit } from "@formkit/vue";
import type { FormKitSchemaFormKit } from "@formkit/core";
import type {
  ElementCategory,
  ElementDefinition,
  ElementPaletteProp,
  ElementSchemaDef,
} from "./types";

const defs = new Map<string, ElementDefinition>();

export function registerElement(def: ElementDefinition): void {
  if (defs.has(def.type)) {
    throw new Error(`[formkit-form-builder] 元素 "${def.type}" 重复注册`);
  }
  defs.set(def.type, def);
}

export function registerElements(list: ElementDefinition[]): void {
  for (const def of list) registerElement(def);
}

export function getElementDefinition(type: string | null | undefined): ElementDefinition | null {
  if (!type) return null;
  return defs.get(type) ?? null;
}

export function getElementDefinitions(): ElementDefinition[] {
  return Array.from(defs.values());
}

// ─── 右侧属性编辑器 ────────────────────────────────────────────────────────────

const editorCache = new Map<string, Component>();

export function getFieldEditorComponent(type: string | null | undefined): Component | null {
  const def = getElementDefinition(type);
  if (!def?.editor) return null;
  const cached = editorCache.get(type!);
  if (cached) return cached;
  const component = defineAsyncComponent(def.editor);
  editorCache.set(type!, component);
  return component;
}

// ─── 左侧面板物料 ──────────────────────────────────────────────────────────────

export function createFieldProps(t: (key: string) => string): ElementPaletteProp[] {
  return getElementDefinitions().map((d) => ({
    name: d.type,
    tooltip: t(d.tooltipKey),
    icon: d.icon,
    category: d.category,
  }));
}

// 未翻译版本（用于按 name 查找分类/图标）
export const fieldProps: ElementPaletteProp[] = createFieldProps((v) => v);

// ─── 画布默认元素 ──────────────────────────────────────────────────────────────

// $cmp 节点结构键：留顶层（FormKitSchema 只转发 props，其余键必须进 props）
const CMP_KEEP_TOP_LEVEL = new Set([
  "$cmp",
  "children",
  "if",
  "bind",
  "outerClass",
  "__key",
  "props",
]);

// 把 $cmp 模板的非结构键收进 props；name 例外（顶层保留供画布 key 兜底，同时进 props）
function nestCmpProps(node: Record<string, unknown>): Record<string, unknown> {
  const props: Record<string, unknown> = { ...(node.props as Record<string, unknown> | undefined) };
  for (const [key, value] of Object.entries(node)) {
    if (CMP_KEEP_TOP_LEVEL.has(key)) continue;
    if (key === "name") {
      props.name = value;
      continue;
    }
    props[key] = value;
  }
  return { ...node, props };
}

function resolveSchemaI18n(
  { nameKey, labelKey, placeholderKey, helpKey, descriptionKey, ...rest }: ElementSchemaDef,
  t: (key: string) => string,
): FormKitSchemaFormKit {
  const next: any = {
    ...(rest as FormKitSchemaFormKit),
    name: t(nameKey),
    description: t(descriptionKey),
  };
  const isCmp = typeof next.$cmp === "string" && Boolean(next.$cmp);

  const setText = (targetKey: "label" | "placeholder" | "help", value: string | undefined) => {
    if (!value) return;
    if (isCmp) next.props = { ...next.props, [targetKey]: value };
    else next[targetKey] = value;
  };

  setText("label", labelKey ? t(labelKey) : undefined);
  setText("placeholder", placeholderKey ? t(placeholderKey) : undefined);
  setText("help", helpKey ? t(helpKey) : undefined);
  if (isCmp) return nestCmpProps(next) as FormKitSchemaFormKit;
  return next;
}

export function createDefaultFormElements(t: (key: string) => string): FormKitSchemaFormKit[] {
  return getElementDefinitions().map((d) => resolveSchemaI18n(d.schema, t));
}

// ─── FormKit input 注册（画布/预览渲染）────────────────────────────────────────

export const SHARED_FORMKIT_PROPS = [
  "props",
  "__bind",
  "placeholder",
  "options",
  "min",
  "max",
  "step",
  "multiple",
  "accept",
];

export function buildFormkitInputs(): Record<string, ReturnType<typeof createInput>> {
  const inputs: Record<string, ReturnType<typeof createInput>> = {};
  for (const def of defs.values()) {
    const f = def.formkit;
    if (!f) continue;
    const family = f.family ?? "naive";
    const props = f.props ?? SHARED_FORMKIT_PROPS;

    if (f.wrap === false) {
      inputs[def.type] = createInput(f.component, { family, props });
      continue;
    }

    const libraryName = f.libraryName ?? def.type;
    inputs[def.type] = createInput(
      {
        $el: "div",
        attrs: { class: "w-full" },
        children: [
          {
            $cmp: libraryName,
            props: { context: "$node.context" },
          },
        ],
      },
      {
        family,
        props,
        library: { [libraryName]: f.component },
      },
    );
  }
  return inputs;
}

// ─── $cmp schema 组件库（画布 / 预览 FormKitSchema 用）──────────────────────────
// 每个元素的 schema 以 $cmp: '<组件名>' 表达；这里把组件名映射到一层薄的 FormKit 包装组件，
// 内部按 createInput 注册的 input type 渲染，从而保留 context / label / 校验 / 值绑定。
function createElementCmpWrapper(type: string): Component {
  return markRaw(
    defineComponent({
      inheritAttrs: false,
      setup(_props, { attrs }) {
        return () => h(FormKit, { ...(attrs as Record<string, unknown>), type } as never);
      },
    }),
  ) as unknown as Component;
}

/** 取元素 schema 的 $cmp 名（无则回退 libraryName / type） */
export function getElementCmpName(def: ElementDefinition): string {
  const schemaCmp =
    typeof (def.schema as Record<string, unknown>)?.$cmp === "string"
      ? (def.schema as Record<string, unknown>).$cmp
      : undefined;
  return (schemaCmp as string) ?? def.formkit?.libraryName ?? def.type;
}

/** 由 schema 节点反查元素 type：优先 $formkit，其次 $cmp（NaiveXxx → naiveXxx） */
export function getElementTypeBySchema(node: unknown): string | undefined {
  const n: any = node;
  if (!n || typeof n !== "object") return undefined;
  if (typeof n.$formkit === "string" && defs.has(n.$formkit)) return n.$formkit;
  if (typeof n.$cmp === "string") {
    for (const def of defs.values()) {
      if (getElementCmpName(def) === n.$cmp) return def.type;
    }
  }
  return undefined;
}

export function buildElementSchemaLibrary(): Record<string, Component> {
  const lib: Record<string, Component> = {};
  for (const def of defs.values()) {
    if (!def.formkit) continue;
    lib[getElementCmpName(def)] = createElementCmpWrapper(def.type);
  }
  return lib;
}

export type { ElementCategory, ElementDefinition, ElementPaletteProp, ElementSchemaDef };
