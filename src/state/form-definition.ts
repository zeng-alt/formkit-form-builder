import { computed, ref } from "vue";
import type { ComputedRef, Ref } from "vue";
import type { FormKitSchemaFormKit } from "@formkit/core";
import type { FormDefinition, FormSettings } from "../types/dsl";
import { dslToSchema, schemaToDsl } from "../dsl";

// 默认画布初始节点（带稳定 __key，保证投影 / 选中一致）
const DEFAULT_CHILDREN: FormKitSchemaFormKit[] = [
  {
    $formkit: "submit",
    type: "submit",
    name: "submit_button",
    label: "Submit",
    __key: "submit_default",
  },
];

// 表单级设置默认值（未显式提供时使用）
const DEFAULT_FORM_NAME = "form";
const DEFAULT_SETTINGS: FormSettings = { layout: "vertical", labelWidth: 80, labelAlign: "top" };

// 纯函数：组装 form 包裹节点。name / settings 未显式提供时回落 fallback（实例的当前表单级设置）。
function buildWrappedSchema(
  children: FormKitSchemaFormKit[],
  source?: Pick<FormDefinition, "name" | "settings">,
  fallback?: Pick<FormDefinition, "name" | "settings">,
): FormKitSchemaFormKit[] {
  const name = source?.name ?? fallback?.name ?? DEFAULT_FORM_NAME;
  const settings = source?.settings ?? fallback?.settings ?? DEFAULT_SETTINGS;
  return [
    {
      $formkit: "form",
      name,
      props: {
        labelPosition: settings.labelAlign === "left" ? "left" : "top",
        labelWidth: settings.labelWidth ?? 80,
      },
      children: children as any,
    },
  ];
}

export interface FormDefinitionState {
  formDefinition: Ref<FormDefinition>
  formSchema: ComputedRef<FormKitSchemaFormKit[]>
  commitSchemaChildren: (
    children: FormKitSchemaFormKit[],
    source?: Pick<FormDefinition, "name" | "settings">,
  ) => FormDefinition
}

// 按实例创建表单定义状态（DSL 真源 + 只读 schema 投影）。
export function createFormDefinitionState(initialDefinition?: FormDefinition): FormDefinitionState {
  // 规范表单定义：唯一真源。画布 / DnD 的 schema（formSchema）是其只读投影。
  const formDefinition = ref<FormDefinition>(
    initialDefinition ?? schemaToDsl(buildWrappedSchema(DEFAULT_CHILDREN, { name: DEFAULT_FORM_NAME, settings: DEFAULT_SETTINGS })),
  );

  // schema 投影（只读）：渲染 / DnD / 画布使用，由 DSL 派生
  const formSchema = computed<FormKitSchemaFormKit[]>(() => {
    const wrapped = dslToSchema(formDefinition.value);
    const children = wrapped[0]?.children;
    return Array.isArray(children) ? (children as FormKitSchemaFormKit[]) : [];
  });

  // 由 schema 投影提交 → 转回 DSL（供 DnD / 容器更新 / legacy 导入使用）
  // source 用于覆盖表单级设置（如导入带 name / settings 的外部 schema）
  const commitSchemaChildren = (
    children: FormKitSchemaFormKit[],
    source?: Pick<FormDefinition, "name" | "settings">,
  ): FormDefinition =>
    schemaToDsl(buildWrappedSchema(children, source, formDefinition.value), { id: formDefinition.value?.id });

  return { formDefinition, formSchema, commitSchemaChildren };
}

// 模块级默认实例（向后兼容）：未使用 createFormBuilderState 提供实例的消费方继续走单例。
export const defaultFormDefinitionState = createFormDefinitionState();
export const { formDefinition, formSchema, commitSchemaChildren } = defaultFormDefinitionState;
