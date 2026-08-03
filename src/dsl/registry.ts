// ═══ 统一元素注册表 ════════════════════════════════════════════════════════════
// 每个元素类型（字段 / 容器 / 布局 / 静态）注册一条定义，同时驱动：
//   - DSL → FormKit schema（toSchema）
//   - FormKit schema → DSL（match + fromSchema）
//   - 新建节点的默认 DSL（defaults）
// 画布/预览组件与 FormKit input 绑定属于渲染层，见 src/elements/（keyed by type），
// 本模块保持纯净（不含 .vue），保证 test-dsl 等纯 DSL 消费方可直接使用。

import type { Component } from "vue";
import type {
  FormNode,
  NodeCategory,
  FormDefinition,
  LayoutType,
  LayoutNode,
  RenderKind,
} from "../types/dsl";
import { generateKey } from "../utils/dnd/schema";
import { getContainerSpec, type ContainerSpec } from "../elements/container-spec";
import {
  nodeToSchemaByCategory,
  nodeFromSchemaByCategory,
  matchSchemaKind,
  tabsPaneToSchema,
  tabsPaneFromSchema,
  parseValidation,
  type SchemaNode,
  type ChildrenConvertCtx,
  type RenderTarget,
} from "./convert-common";

export interface DslToSchemaCtx {
  form?: FormDefinition;
  children?: SchemaNode[];
}

/** 元素默认模板（DSL 形态，纯数据）：palette 建节点 / 画布默认 schema 的唯一来源 */
export interface ElementTemplate {
  renderAs: RenderKind;
  /** $cmp 组件名 / $el 标签名；缺省即 type（el 的 HTML 标签通常需要显式指定） */
  target?: string;
  /** 组件配置（$cmp/$el 收进 props/attrs；formkit 时按 FIELD_TOP_PROPS 拆分） */
  props?: Record<string, unknown>;
  outerClass?: string;
  nameKey: string;
  labelKey?: string;
  placeholderKey?: string;
  helpKey?: string;
  descriptionKey: string;
  value?: unknown;
  options?: unknown[];
  validation?: string;
  /** 自定义 DSL→schema；缺省按 category+renderAs 走内置转换 */
  toSchema?: (node: FormNode, ctx: DslToSchemaCtx) => SchemaNode;
  /** 自定义 schema→DSL；缺省按 category 走内置转换 */
  fromSchema?: (schema: SchemaNode, ctx: ChildrenConvertCtx) => FormNode | null;
  /** 自定义反向识别；缺省按 renderAs+type 推断（含 legacy $cmp 别名） */
  match?: (schema: SchemaNode) => boolean;
}

/** 元素目录条目（elements/definitions/* 的纯数据形态，注册表据此派生 ElementTypeDef） */
export interface ElementCatalogEntry {
  type: string;
  category: NodeCategory;
  icon?: string;
  tooltipKey?: string;
  editor?: () => Promise<{ default: Component }>;
  schema: ElementTemplate;
  /** 容器元素的数据结构规格（list/card/group/inputGroup/buttonGroup/tabs；字段/静态/纯布局缺省） */
  container?: ContainerSpec;
}

export interface ElementTypeDef {
  type: string;
  category: NodeCategory;
  /** 渲染原语 */
  renderAs: RenderKind;
  /** $cmp 组件名 / $el 标签名 */
  target?: string;
  /** 默认模板（palette / 新建节点） */
  template?: ElementTemplate;
  /** 容器元素的数据结构规格（见 container-spec.ts） */
  container?: ContainerSpec;
  /** 新建节点默认 DSL */
  defaults: () => FormNode;
  toSchema: (node: FormNode, ctx: DslToSchemaCtx) => SchemaNode;
  /** 反向识别：schema 是否属于该类型 */
  match?: (schema: SchemaNode) => boolean;
  fromSchema?: (schema: SchemaNode, ctx: ChildrenConvertCtx) => FormNode | null;
  normalize?: (schema: SchemaNode) => SchemaNode;
  editor?: () => Promise<{ default: Component }>;
  icon?: string;
  tooltipKey?: string;
}

const defs = new Map<string, ElementTypeDef>();

export function registerElementType(def: ElementTypeDef, overwrite = false): void {
  if (defs.has(def.type)) {
    if (!overwrite) {
      throw new Error(`[formkit-form-builder] DSL 元素类型 "${def.type}" 重复注册`);
    }
    defs.delete(def.type);
  }
  defs.set(def.type, def);
}

export function getElementTypeDef(type: string | undefined): ElementTypeDef | undefined {
  if (!type) return undefined;
  return defs.get(type);
}

export function getElementTypeDefs(): ElementTypeDef[] {
  return Array.from(defs.values());
}

// ─── legacy $cmp 别名（$cmp = type 统一前的旧 schema 兼容）─────────────────────
// 旧版本内置元素以 Naive* 组件名作为 $cmp；统一为 type 后仍需识别旧数据。
// 本表只保留"组件已不存在、无法从 formkitBindings 派生"的历史名；
// 当前组件名（NaiveTextInput → text 等）由渲染层 registerLegacyCmpAliases 注入，避免双重维护。
const LEGACY_CMP_TYPE: Record<string, string> = {
  NaiveSubmit: "submit",
  NaiveReset: "reset",
  NaiveButton: "naiveButton",
  NaiveH1: "naiveH1",
  NaiveH2: "naiveH2",
  NaiveH3: "naiveH3",
  NaiveH4: "naiveH4",
  NaiveH5: "naiveH5",
  NaiveH6: "naiveH6",
};

/** 渲染层注入 legacy $cmp 别名（由 formkitBindings 派生，单一来源） */
export function registerLegacyCmpAliases(aliases: Record<string, string>): void {
  Object.assign(LEGACY_CMP_TYPE, aliases)
}

/** schema 节点的 legacy $cmp 名 → 统一后的 type */
function legacyCmpTypeOf(s: SchemaNode): string | undefined {
  const cmp = (s as any)?.$cmp
  if (typeof cmp !== "string") return undefined
  return LEGACY_CMP_TYPE[cmp]
}

// ─── 渲染原语构造 ───────────────────────────────────────────────────────────────

/** cmp 提示 → RenderTarget；target 缺省 = type（type+renderAs 组合，无需显式 target） */
function rtOf(
  cmp: string | undefined,
  type: string,
  fallbackKind: RenderKind,
  target?: string,
): RenderTarget {
  const resolved = target ?? cmp ?? type;
  return cmp ? { renderAs: "cmp", target: resolved } : { renderAs: fallbackKind, target: resolved };
}

// ─── 从纯数据目录派生（elements/definitions/* 的注册入口）──────────────────────

export function elementTypeFromSchema(entry: ElementCatalogEntry): ElementTypeDef {
  const { type, category, schema } = entry;
  // target 缺省 = type：renderAs + type 即可决定 $formkit/$cmp/$el
  // 容器规格（数据结构 + keyProp + 原语）：目录声明优先，缺省按 type 查 container-spec
  const spec = entry.container ?? getContainerSpec(type);
  const rt: RenderTarget = {
    renderAs: schema.renderAs,
    target: schema.target ?? type,
    ...(spec ? { container: spec } : {}),
  };
  return {
    type,
    category,
    renderAs: rt.renderAs,
    target: rt.target,
    ...(spec ? { container: spec } : {}),
    template: schema,
    icon: entry.icon,
    tooltipKey: entry.tooltipKey,
    editor: entry.editor,
    defaults: () => defaultFormNode(entry),
    toSchema: schema.toSchema ?? ((node, ctx) => nodeToSchemaByCategory(node, category, rt, ctx)),
    // 兼容 $formkit === type 与 legacy $cmp 名（如 NaiveTextInput → text）
    match:
      schema.match ??
      ((s) =>
        matchSchemaKind(s, rt) || (s as any).$formkit === type || legacyCmpTypeOf(s) === type),
    fromSchema: schema.fromSchema ?? ((s, ctx) => nodeFromSchemaByCategory(s, category, ctx, type)),
  };
}

function defaultFormNode(entry: ElementCatalogEntry): FormNode {
  const { type, category, schema } = entry;
  const base: any = {
    id: generateKey(),
    category,
    type,
    renderAs: schema.renderAs,
  };
  if (schema.target && schema.target !== type) base.target = schema.target;
  if (schema.outerClass) base.outerClass = schema.outerClass;

  const props = { ...schema.props };
  if (category === "field") {
    if (schema.value !== undefined) base.value = schema.value;
    if (Array.isArray(schema.options)) base.options = schema.options;
    const rules = parseValidation(schema.validation);
    if (rules?.length) base.validation = rules;
  } else {
    if (schema.value !== undefined) props.value = schema.value;
    if (schema.options !== undefined) props.options = schema.options;
  }
  if (Object.keys(props).length) base.props = props;
  if (category === "container" || category === "layout") base.children = [];
  return base as FormNode;
}

// ─── 构造器：字段 ───────────────────────────────────────────────────────────────

export function fieldType(
  type: string,
  extra?: Partial<ElementTypeDef> & { cmp?: string; target?: string },
): ElementTypeDef {
  const rt = rtOf(extra?.cmp, type, "formkit", extra?.target);
  const def: ElementTypeDef = {
    type,
    category: "field",
    renderAs: rt.renderAs,
    target: rt.target,
    defaults: () => ({
      id: generateKey(),
      category: "field",
      type,
      renderAs: rt.renderAs,
      ...(rt.target && rt.target !== type ? { target: rt.target } : {}),
    }),
    toSchema: (node) => nodeToSchemaByCategory(node, "field", rt, undefined),
    match: (s) => matchSchemaKind(s, rt),
    fromSchema: (s) => nodeFromSchemaByCategory(s, "field", undefined, type),
    ...extra,
  };
  return def;
}

// ─── 构造器：容器 ───────────────────────────────────────────────────────────────

export function containerType(
  type: string,
  extra?: Partial<ElementTypeDef> & {
    dataType?: "object" | "array";
    cmp?: string;
    target?: string;
  },
): ElementTypeDef {
  const dataType = extra?.dataType ?? "object";
  const cmp = extra?.cmp;
  // 容器规格：声明数据结构 + keyProp + 渲染原语；缺省按 type 查 container-spec
  // （group → 原生 $formkit；list/inputGroup/buttonGroup 等 → $cmp）
  const spec = extra?.container ?? getContainerSpec(type);
  const renderAs: RenderKind =
    spec != null
      ? spec.primitive === "group"
        ? "formkit"
        : "cmp"
      : cmp != null || extra?.target != null
        ? "cmp"
        : "formkit";
  const rt: RenderTarget = {
    renderAs,
    target: extra?.target ?? cmp ?? type,
    ...(spec ? { container: spec } : {}),
  };
  const def: ElementTypeDef = {
    type,
    category: "container",
    renderAs: rt.renderAs,
    target: rt.target,
    container: spec ?? undefined,
    defaults: () => ({
      id: generateKey(),
      category: "container",
      type,
      renderAs: rt.renderAs,
      ...(rt.target && rt.target !== type ? { target: rt.target } : {}),
      dataType,
      children: [],
    }),
    toSchema: (node, ctx) => nodeToSchemaByCategory(node, "container", rt, ctx),
    match: (s) => matchSchemaKind(s, rt) || (s as any).$cmp === type,
    fromSchema: (s, ctx) => nodeFromSchemaByCategory(s, "container", ctx, type),
    ...extra,
  };
  return def;
}

// ─── 构造器：布局 ───────────────────────────────────────────────────────────────

export function layoutType(
  type: string,
  extra?: Partial<ElementTypeDef> & { cmp?: string; target?: string },
): ElementTypeDef {
  const cmp = extra?.cmp;
  // 容器规格：card/tabs 有规格 → $cmp；grid/row/column 纯布局无规格 → $el
  const spec = extra?.container ?? getContainerSpec(type);
  const rt: RenderTarget = {
    renderAs: cmp != null || spec != null ? "cmp" : "el",
    target: extra?.target ?? cmp ?? type,
    ...(spec ? { container: spec } : {}),
  };
  const def: ElementTypeDef = {
    type,
    category: "layout",
    renderAs: rt.renderAs,
    target: rt.target,
    container: spec ?? undefined,
    defaults: () => ({
      id: generateKey(),
      category: "layout",
      type: type as LayoutType,
      renderAs: rt.renderAs,
      ...(rt.target && rt.target !== type ? { target: rt.target } : {}),
      children: [],
    }),
    toSchema: (node, ctx) => nodeToSchemaByCategory(node, "layout", rt, ctx),
    match: (s) => {
      const anyS: any = s;
      if (type === "card") return anyS.$cmp === "card" || anyS.$formkit === "card";
      if (type === "tabs") return anyS.$cmp === "tabs" || anyS.$formkit === "tabs";
      if (type === "grid")
        return (
          anyS.$el === "div" &&
          typeof anyS.attrs?.class === "string" &&
          String(anyS.attrs.class).includes("grid-cols")
        );
      if (type === "row")
        return (
          anyS.$el === "div" &&
          typeof anyS.attrs?.class === "string" &&
          String(anyS.attrs.class).includes("flex-row")
        );
      if (type === "column")
        return (
          anyS.$el === "div" &&
          typeof anyS.attrs?.class === "string" &&
          String(anyS.attrs.class).includes("flex-col")
        );
      return anyS.$cmp === type;
    },
    fromSchema: (s, ctx) => nodeFromSchemaByCategory(s, "layout", ctx, type),
    ...extra,
  };
  return def;
}

// ─── 构造器：静态 ───────────────────────────────────────────────────────────────

export function staticType(
  type: string,
  extra?: Partial<ElementTypeDef> & { cmp?: string; target?: string },
): ElementTypeDef {
  const rt = rtOf(
    extra?.cmp,
    type,
    type === "submit" || type === "reset" ? "formkit" : "el",
    extra?.target,
  );
  const def: ElementTypeDef = {
    type,
    category: "static",
    renderAs: rt.renderAs,
    target: rt.target,
    defaults: () => ({
      id: generateKey(),
      category: "static",
      type,
      renderAs: rt.renderAs,
      ...(rt.target && rt.target !== type ? { target: rt.target } : {}),
    }),
    toSchema: (node) => nodeToSchemaByCategory(node, "static", rt, undefined),
    match: (s) => {
      const anyS: any = s;
      if (rt.renderAs === "cmp") {
        if (anyS.$cmp === rt.target) return true;
        if (anyS.$formkit === type) return true;
        return false;
      }
      if (type === "submit") return anyS.$formkit === "submit";
      if (type === "reset") return anyS.$formkit === "reset";
      return anyS.$el === type;
    },
    fromSchema: (s) => nodeFromSchemaByCategory(s, "static", undefined, type),
    ...extra,
  };
  return def;
}

// tabs 布局的 pane 特殊处理（非独立布局类型，由 tabs 容器内部使用）
export function tabsPaneType(): ElementTypeDef {
  return {
    type: "tabsPane",
    category: "layout",
    renderAs: "el",
    defaults: () => ({
      id: generateKey(),
      category: "layout",
      type: "tabsPane",
      renderAs: "el",
      children: [],
    }),
    toSchema: (node, ctx) => tabsPaneToSchema(node as LayoutNode, ctx.children),
    match: (s) => {
      const anyS: any = s;
      return typeof anyS.__key === "string" && !anyS.$formkit && !anyS.$cmp && !anyS.$el;
    },
    fromSchema: (s, ctx) => tabsPaneFromSchema(s, ctx),
  };
}
