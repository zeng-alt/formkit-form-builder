// ═══ 渲染层：容器元素 画布/预览组件绑定 + 归一化 ═══════════════════════════════
// 由原 src/containers/ 迁入。这里持有容器画布/预览组件，按 type（$cmp 名）索引；
// 渲染 pipeline：canvas/预览库 → normalizeContainerNode → formatContainerPreviewNode。

import { markRaw } from "vue";
import type { Component } from "vue";
import type { FormKitSchemaFormKit } from "@formkit/core";
import { buildElementSchemaLibrary } from "./formkit";
import { registerBuiltinElementTypes } from "../dsl/definitions";
import { applyGroupDisabled, stripInputGroupOuterClass } from "@/utils/dnd/grid";

import ListContainer from "@/components/ui/containers/list/ListContainer.vue";
import ListContainerPreview from "@/components/ui/containers/list/ListContainerPreview.vue";
import CardContainer from "@/components/ui/containers/card/CardContainer.vue";
import CardContainerPreview from "@/components/ui/containers/card/CardContainerPreview.vue";
import InputGroupContainer from "@/components/ui/containers/input-group/InputGroupContainer.vue";
import InputGroupContainerPreview from "@/components/ui/containers/input-group/InputGroupContainerPreview.vue";
import ButtonGroupContainer from "@/components/ui/containers/button-group/ButtonGroupContainer.vue";
import ButtonGroupContainerPreview from "@/components/ui/containers/button-group/ButtonGroupContainerPreview.vue";
import TabsContainer from "@/components/ui/containers/tabs/TabsContainer.vue";
import TabsContainerPreview from "@/components/ui/containers/tabs/TabsContainerPreview.vue";
import GroupContainer from "@/components/ui/containers/group/GroupContainer.vue";

registerBuiltinElementTypes();

export type SchemaNode = FormKitSchemaFormKit & Record<string, unknown>;

export type ContainerFormatCtx = {
  key?: string;
  isPlaceholder: boolean;
  format: (node: FormKitSchemaFormKit, index: number) => FormKitSchemaFormKit;
};

export type ContainerDefinition = {
  id: string;
  match: (node: unknown) => boolean;
  canvas?: { libraryKey: string; component: Component };
  preview?: { libraryKey: string; component: Component };
  normalize?: (node: SchemaNode) => SchemaNode;
  formatPreview?: (node: SchemaNode, ctx: ContainerFormatCtx) => FormKitSchemaFormKit;
};

// ─── list ──────────────────────────────────────────────────────────────────────

function isListContainer(node: any) {
  if (!node || typeof node !== "object") return false;
  return node.$cmp === "list" || node.$formkit === "list";
}

function normalizeList(node: SchemaNode): SchemaNode {
  const next: any = { ...node };
  next.$cmp = next.$cmp || "list";
  next.children = Array.isArray(next.children) ? next.children : [];
  const props = typeof next.props === "object" && next.props ? { ...next.props } : {};
  props.listKey =
    typeof props.listKey === "string" && props.listKey
      ? props.listKey
      : ((next.__key as string | undefined) ?? "");
  props.modelValue = next.children;
  if (props.showActions === undefined) props.showActions = false;
  next.props = props;
  return next;
}

// ─── card ──────────────────────────────────────────────────────────────────────

function isCardContainer(node: any) {
  if (!node || typeof node !== "object") return false;
  return node.$cmp === "card" || node.$formkit === "card";
}

function normalizeCard(node: SchemaNode): SchemaNode {
  const next: any = { ...node };
  next.$cmp = next.$cmp || "card";
  next.children = Array.isArray(next.children) ? next.children : [];
  const props = typeof next.props === "object" && next.props ? { ...next.props } : {};
  props.cardKey =
    typeof props.cardKey === "string" && props.cardKey
      ? props.cardKey
      : ((next.__key as string | undefined) ?? "");
  props.modelValue = next.children;
  next.props = props;
  return next;
}

// ─── group ────────────────────────────────────────────────────────────────────
// 与 FormKit 原生 $formkit: 'group' 等价：嵌套 object 数据结构。
// 画布上经 normalize 转成 $cmp: 'group'（GroupContainer.vue，带 DnD）；
// 预览时 formatGroup 还原为原生 $formkit: 'group'，子节点递归格式化。

function isGroupContainer(node: any) {
  if (!node || typeof node !== "object") return false;
  return node.$formkit === "group" || node.$cmp === "group";
}

function normalizeGroup(node: SchemaNode): SchemaNode {
  const next: any = { ...node };
  next.$cmp = "group";
  delete next.$formkit;
  next.children = Array.isArray(next.children) ? next.children : [];
  const props = typeof next.props === "object" && next.props ? { ...next.props } : {};
  props.groupKey =
    typeof props.groupKey === "string" && props.groupKey
      ? props.groupKey
      : ((next.__key as string | undefined) ?? "");
  props.modelValue = next.children;
  if (typeof next.name === "string" && next.name) props.name = next.name;
  next.props = props;
  return next;
}

// ─── input-group ───────────────────────────────────────────────────────────────

function isInputGroupContainer(node: any) {
  if (!node || typeof node !== "object") return false;
  return node.$cmp === "inputGroup" || node.$formkit === "inputGroup";
}

function normalizeInputGroup(node: SchemaNode): SchemaNode {
  const next: any = { ...node };
  next.$cmp = next.$cmp || "inputGroup";
  next.children = Array.isArray(next.children) ? next.children : [];
  const props = typeof next.props === "object" && next.props ? { ...next.props } : {};
  props.inputGroupKey =
    typeof props.inputGroupKey === "string" && props.inputGroupKey
      ? props.inputGroupKey
      : ((next.__key as string | undefined) ?? "");
  props.modelValue = next.children;
  next.props = props;
  return next;
}

// 输入组预览：children 的宽度按 layout.colspan 展示（4 → 33%、6 → 50%）。
// 逐个 child 读 col-span，改写成对应的 w-[xx%] 外框类，并去掉网格类/按钮 pt-2。
// 这些 w-[xx%] 类已出现在 ContainerChildrenGrid 的 safelist 里，Tailwind 会生成。
const INPUT_GROUP_WIDTH_CLASS: Record<number, string> = {
  1: "w-[8.33%]",
  2: "w-[16.67%]",
  3: "w-[25%]",
  4: "w-[33.33%]",
  5: "w-[41.67%]",
  6: "w-[50%]",
  7: "w-[58.33%]",
  8: "w-[66.67%]",
  9: "w-[75%]",
  10: "w-[83.33%]",
  11: "w-[91.67%]",
  12: "w-[100%]",
};
const stripGridWidthClasses = (outerClass: unknown) =>
  (typeof outerClass === "string" ? outerClass : "")
    .replace(/\bcol-span-\d+\b/g, "")
    .replace(/\bw-\[[^\]]+\]/g, "")
    .replace(/\bpt-2\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

function inputGroupSpanOf(child: any): number {
  const layoutSpan = child?.layout?.colspan;
  if (typeof layoutSpan === "number" && Number.isFinite(layoutSpan) && layoutSpan > 0) {
    return Math.max(1, Math.min(12, Math.round(layoutSpan)));
  }
  const outerClass = typeof child?.outerClass === "string" ? child.outerClass : "";
  const match = outerClass.match(/\bcol-span-(\d+)\b/);
  return match ? Math.max(1, Math.min(12, parseInt(match[1]!, 10))) : 12;
}

function decorateInputGroupChild(child: FormKitSchemaFormKit): FormKitSchemaFormKit {
  const anyChild = child as any;
  const span = inputGroupSpanOf(anyChild);
  const widthClass = INPUT_GROUP_WIDTH_CLASS[span] ?? "w-[100%]";
  const base = stripGridWidthClasses(anyChild?.outerClass);
  const outerClass = `${widthClass} ${base}`.trim();
  const next: any = { ...child, outerClass: outerClass || undefined };
  // $cmp 节点：FormKitSchema 把嵌套 props 传给包装组件再透传 FormKit，外框类在
  // props.outerClass 里同样要改写/去网格类，否则预览仍按旧 outerClass 渲染
  if (
    anyChild &&
    typeof anyChild === "object" &&
    anyChild.props &&
    typeof anyChild.props === "object"
  ) {
    const props = { ...anyChild.props };
    const propsBase = stripGridWidthClasses((props as any).outerClass);
    props.outerClass = outerClass || propsBase;
    next.props = props;
  }
  return next as FormKitSchemaFormKit;
}

function decorateInputGroupChildren(children: FormKitSchemaFormKit[]): FormKitSchemaFormKit[] {
  return children.map(decorateInputGroupChild);
}

// ─── button-group ──────────────────────────────────────────────────────────────

function isButtonGroupContainer(node: any) {
  if (!node || typeof node !== "object") return false;
  return node.$cmp === "buttonGroup" || node.$formkit === "buttonGroup";
}

function normalizeButtonGroup(node: SchemaNode): SchemaNode {
  const next: any = { ...node };
  next.$cmp = next.$cmp || "buttonGroup";
  next.children = Array.isArray(next.children) ? next.children : [];
  const props = typeof next.props === "object" && next.props ? { ...next.props } : {};
  props.buttonGroupKey =
    typeof props.buttonGroupKey === "string" && props.buttonGroupKey
      ? props.buttonGroupKey
      : ((next.__key as string | undefined) ?? "");
  props.modelValue = next.children;
  next.props = props;
  return next;
}

// 按钮组子项装饰：去掉按钮外框的 pt-2/宽度类；整体禁用时注入 disabled
function decorateButtonGroupChildren(
  children: FormKitSchemaFormKit[],
  disabled: unknown,
): FormKitSchemaFormKit[] {
  return children.map((c) => {
    const stripped = stripInputGroupOuterClass(c);
    return disabled ? applyGroupDisabled(stripped) : stripped;
  });
}

// 按钮组预览：纯展示容器，不包 group（按钮不产数据），直接 $cmp 承载子按钮
function formatButtonGroup(node: SchemaNode, ctx: ContainerFormatCtx): FormKitSchemaFormKit {
  const key = (node as any)?.__key as string | undefined;
  const normalized = normalizeButtonGroup(node);
  const rawChildren = Array.isArray(normalized.children)
    ? (normalized.children as FormKitSchemaFormKit[]).map((c, i) => ctx.format(c, i))
    : [];
  const children = decorateButtonGroupChildren(
    rawChildren,
    (normalized as any).props?.disabled,
  );
  const schemaIf = (normalized as any).if;
  const nextNode: any = {
    $el: "div",
    attrs: { class: (normalized as any).outerClass || "col-span-12" },
    children: [
      {
        $cmp: "buttonGroup",
        props: {
          ...(normalized as any).props,
          buttonGroupKey: ((normalized as any).props?.buttonGroupKey as string | undefined) ?? key ?? "",
          modelValue: children,
        },
      },
    ],
  };
  if (typeof schemaIf === "string" && schemaIf.trim()) nextNode.if = schemaIf;
  else if (typeof schemaIf === "boolean") nextNode.if = schemaIf;
  return nextNode as FormKitSchemaFormKit;
}

// ─── tabs ──────────────────────────────────────────────────────────────────────

function isTabsContainer(node: any) {
  if (!node || typeof node !== "object") return false;
  return node.$cmp === "tabs" || node.$formkit === "tabs";
}

function normalizeTabs(node: SchemaNode): SchemaNode {
  const next: any = { ...node };
  next.$cmp = next.$cmp || "tabs";
  next.children = Array.isArray(next.children) ? next.children : [];
  const props = typeof next.props === "object" && next.props ? { ...next.props } : {};
  props.tabsKey =
    typeof props.tabsKey === "string" && props.tabsKey
      ? props.tabsKey
      : ((next.__key as string | undefined) ?? "");
  props.modelValue = next.children;
  next.props = props;
  return next;
}

// ─── 注册表 ────────────────────────────────────────────────────────────────────

const defs: ContainerDefinition[] = [
  {
    id: "list",
    match: isListContainer,
    canvas: { libraryKey: "list", component: ListContainer as any },
    preview: { libraryKey: "list", component: ListContainerPreview as any },
    normalize: normalizeList,
    formatPreview: (node, ctx) => formatContainer(node, ctx, "list", normalizeList, "listKey"),
  },
  {
    id: "card",
    match: isCardContainer,
    canvas: { libraryKey: "card", component: CardContainer as any },
    preview: { libraryKey: "card", component: CardContainerPreview as any },
    normalize: normalizeCard,
    formatPreview: (node, ctx) => formatContainer(node, ctx, "card", normalizeCard, "cardKey"),
  },
  {
    id: "inputGroup",
    match: isInputGroupContainer,
    canvas: { libraryKey: "inputGroup", component: InputGroupContainer as any },
    preview: { libraryKey: "inputGroup", component: InputGroupContainerPreview as any },
    normalize: normalizeInputGroup,
    formatPreview: (node, ctx) =>
      formatContainer(
        node,
        ctx,
        "inputGroup",
        normalizeInputGroup,
        "inputGroupKey",
        decorateInputGroupChildren,
      ),
  },
  {
    id: "buttonGroup",
    match: isButtonGroupContainer,
    canvas: { libraryKey: "buttonGroup", component: ButtonGroupContainer as any },
    preview: { libraryKey: "buttonGroup", component: ButtonGroupContainerPreview as any },
    normalize: normalizeButtonGroup,
    formatPreview: (node, ctx) => formatButtonGroup(node, ctx),
  },
  {
    id: "tabs",
    match: isTabsContainer,
    canvas: { libraryKey: "tabs", component: TabsContainer as any },
    preview: { libraryKey: "tabs", component: TabsContainerPreview as any },
    normalize: normalizeTabs,
    formatPreview: (node, ctx) => formatTabs(node, ctx),
  },
  {
    id: "group",
    match: isGroupContainer,
    canvas: { libraryKey: "group", component: GroupContainer as any },
    normalize: normalizeGroup,
    formatPreview: (node, ctx) => formatGroup(node, ctx),
  },
];

export function getContainerDefinition(node: unknown): ContainerDefinition | null {
  for (const def of defs) {
    if (def.match(node)) return def;
  }
  return null;
}

/** 注册自定义容器画布/预览绑定（registerElement 扩展入口用） */
export function registerContainerDefinition(def: ContainerDefinition): void {
  defs.push(def);
}

export function normalizeContainerNode(node: unknown): unknown {
  const def = getContainerDefinition(node);
  if (!def?.normalize) return node;
  return def.normalize(node as SchemaNode);
}

export function getCanvasSchemaLibrary(): Record<string, Component> {
  const lib: Record<string, Component> = { ...buildElementSchemaLibrary() };
  for (const def of defs) {
    if (!def.canvas) continue;
    lib[def.canvas.libraryKey] = markRaw(def.canvas.component) as unknown as Component;
  }
  return lib;
}

export function getPreviewSchemaLibrary(): Record<string, Component> {
  const lib: Record<string, Component> = { ...buildElementSchemaLibrary() };
  for (const def of defs) {
    if (!def.preview) continue;
    lib[def.preview.libraryKey] = markRaw(def.preview.component) as unknown as Component;
  }
  return lib;
}

export function formatContainerPreviewNode(
  node: unknown,
  ctx: ContainerFormatCtx,
): FormKitSchemaFormKit | null {
  const def = getContainerDefinition(node);
  if (!def?.formatPreview) return null;
  return def.formatPreview(node as SchemaNode, ctx);
}

// ─── 通用预览包装（list / card / inputGroup）───────────────────────────────────

function formatContainer(
  node: SchemaNode,
  ctx: ContainerFormatCtx,
  cmp: string,
  normalize: (n: SchemaNode) => SchemaNode,
  keyProp: string,
  transformChildren?: (children: FormKitSchemaFormKit[]) => FormKitSchemaFormKit[],
): FormKitSchemaFormKit {
  const key = (node as any)?.__key as string | undefined;
  const normalized = normalize(node);
  const rawChildren = Array.isArray(normalized.children)
    ? (normalized.children as FormKitSchemaFormKit[]).map((c, i) => ctx.format(c, i))
    : [];
  const children = transformChildren ? transformChildren(rawChildren) : rawChildren;
  const schemaIf = (normalized as any).if;
  const containerName =
    ((normalized as any).props?.name as string | undefined) ??
    ((normalized as any).name as string | undefined);

  // list 容器：渲染 ListContainerPreview.vue（动态 FormKit list，内置 +/删除 交互），
  // 每条记录为 object，整体数据形态为数组 [{...},{...}]
  if (cmp === "list") {
    const containerProps = { ...(normalized as any).props };
    delete containerProps.modelValue;
    const containerNode: any = {
      $cmp: "list",
      props: {
        ...containerProps,
        listKey: ((normalized as any).props?.listKey as string | undefined) ?? key ?? "",
        name: containerName,
        modelValue: children,
        isPlaceholder: ctx.isPlaceholder,
      },
    };
    const nextNode: any = {
      $el: "div",
      attrs: { class: (normalized as any).outerClass || "col-span-12" },
      children: [containerNode],
    };
    if (typeof schemaIf === "string" && schemaIf.trim()) nextNode.if = schemaIf;
    else if (typeof schemaIf === "boolean") nextNode.if = schemaIf;
    return nextNode as FormKitSchemaFormKit;
  }

  // card / inputGroup：容器整体包裹在 $formkit: 'group' 外层，提供 JSON object 数据结构
  // 容器 props 中的 name 移入 group，避免容器组件重复携带
  const containerProps = { ...(normalized as any).props };
  delete containerProps.name;
  const containerNode: any = {
    $cmp: cmp,
    props: {
      ...containerProps,
      [keyProp]: ((normalized as any).props?.[keyProp] as string | undefined) ?? key ?? "",
      modelValue: children,
    },
  };

  const groupNode: any = {
    $formkit: "group",
    children: [containerNode],
    outerClass:
      "!border-0 !p-0 !m-0 ![&>.formkit-wrapper]:border-0 ![&>.formkit-wrapper]:p-0 ![&>.formkit-wrapper]:m-0 ![&>.formkit-wrapper>fieldset]:border-0 ![&>.formkit-wrapper>fieldset]:p-0 ![&>.formkit-wrapper>fieldset]:m-0",
  };
  if (containerName) groupNode.name = containerName;

  const nextNode: any = {
    $el: "div",
    attrs: { class: (normalized as any).outerClass || "col-span-12" },
    children: [groupNode],
  };
  if (typeof schemaIf === "string" && schemaIf.trim()) nextNode.if = schemaIf;
  else if (typeof schemaIf === "boolean") nextNode.if = schemaIf;
  return nextNode as FormKitSchemaFormKit;
}

// tabs 预览：pane 子节点也逐层格式化，每个 pane 内容包裹在 group 中提供 structured data
function formatTabs(node: SchemaNode, ctx: ContainerFormatCtx): FormKitSchemaFormKit {
  const key = (node as any)?.__key as string | undefined;
  const normalized = normalizeTabs(node);
  const panes = Array.isArray(normalized.children)
    ? (normalized.children as FormKitSchemaFormKit[]).map((pane: any, idx) => {
        const paneChildren = Array.isArray(pane?.children)
          ? (pane.children as FormKitSchemaFormKit[]).map((c, i) => ctx.format(c, i))
          : [];
        const paneLabel = pane?.label as string | undefined;
        const paneName = pane?.name as string | undefined;
        // 每个 pane 的内容包裹在 group 中，提供 JSON object 数据；组名用 pane 的 name
        //（数据字段名），未设置时回退 label
        const groupNode: any = {
          $formkit: "group",
          children: paneChildren.length
            ? [
                {
                  $el: "div",
                  attrs: { class: "grid grid-cols-12 gap-x-4 gap-y-2" },
                  children: paneChildren,
                },
              ]
            : [],
          outerClass:
            "!border-0 !p-0 !m-0 ![&>.formkit-wrapper]:border-0 ![&>.formkit-wrapper]:p-0 ![&>.formkit-wrapper]:m-0 ![&>.formkit-wrapper>fieldset]:border-0 ![&>.formkit-wrapper>fieldset]:p-0 ![&>.formkit-wrapper>fieldset]:m-0",
        };
        const paneDataKey = paneName ?? paneLabel;
        if (paneDataKey) groupNode.name = paneDataKey;
        return {
          ...pane,
          label: paneLabel,
          children: [groupNode],
          __key: pane?.__key ?? `${idx}`,
        } as any;
      })
    : [];
  const schemaIf = (normalized as any).if;
  const nextNode: any = {
    $el: "div",
    attrs: { class: (normalized as any).outerClass || "col-span-12" },
    children: [
      {
        $cmp: "tabs",
        props: {
          ...(normalized as any).props,
          tabsKey: ((normalized as any).props?.tabsKey as string | undefined) ?? key ?? "",
          modelValue: panes,
        },
      },
    ],
  };
  if (typeof schemaIf === "string" && schemaIf.trim()) nextNode.if = schemaIf;
  else if (typeof schemaIf === "boolean") nextNode.if = schemaIf;
  return nextNode as FormKitSchemaFormKit;
}

// group 预览：还原为 FormKit 原生 $formkit: 'group'，直接产出嵌套 object 数据。
// 子节点递归格式化后放入内部 grid（col-span 布局）。group 原生 schema 是 fragment
// （无包裹元素，outerClass 无处落地），外层用 $el: 'div' 承载 col-span 宽度；
// group 不展示 label/help。
function formatGroup(node: SchemaNode, ctx: ContainerFormatCtx): FormKitSchemaFormKit {
  const normalized = normalizeGroup(node);
  const rawChildren = Array.isArray(normalized.children)
    ? (normalized.children as FormKitSchemaFormKit[]).map((c, i) => ctx.format(c, i))
    : [];
  const containerName = (normalized as any).props?.name ?? (normalized as any).name;
  const schemaIf = (normalized as any).if;
  const outerClass = (normalized as any).outerClass;
  const groupNode: any = {
    $formkit: "group",
    children: rawChildren.length
      ? [
          {
            $el: "div",
            attrs: { class: "grid grid-cols-12 gap-x-4 gap-y-2" },
            children: rawChildren,
          },
        ]
      : [],
  };
  if (containerName) groupNode.name = containerName;

  const nextNode: any = {
    $el: "div",
    attrs: { class: outerClass || "col-span-12" },
    children: [groupNode],
  };
  if (typeof schemaIf === "string" && schemaIf.trim()) nextNode.if = schemaIf;
  else if (typeof schemaIf === "boolean") nextNode.if = schemaIf;
  return nextNode as FormKitSchemaFormKit;
}
