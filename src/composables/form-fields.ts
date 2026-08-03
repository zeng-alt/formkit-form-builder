import type { WritableComputedRef } from "vue";
import { computed } from "vue";
import { selectedIndex, selectedKey, selectedTarget } from "@/state/form-schema";
import { formDefinition } from "@/state/form-definition";
import { findDslNodeByKey, updateDslNodeAtKey } from "@/utils/schema/dsl-tree";
import { commitFormDefinition } from "./schema-history";
import { exprToJs, resolveValidation, parseExprString, parseValidation } from "@/dsl";
import { isExprValue } from "@/dsl/compile";
import type { FieldNode, FormNode, OptionItem } from "@/types/dsl";

// 当前选中节点：直接读 DSL 真源（formDefinition），而非 FormKit schema 投影。
export const selectedField = computed<FormNode | undefined>(() => {
  const root = formDefinition.value?.root?.children;
  if (!Array.isArray(root)) return undefined;
  const key = selectedKey.value;
  if (key) return findDslNodeByKey(root, key)?.node;
  return root[selectedIndex.value];
});

export function useFormField() {
  const normalizeName = (value: string) => {
    let name = value
      .trim()
      .replace(/[^a-zA-Z0-9_]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
    if (!name) return "";
    if (/^\d/.test(name)) name = `field_${name}`;
    return name;
  };

  // DSL 写路径：克隆选中节点 → 应用变更 → 按 key 打补丁提交（不原地改真源，保证 undo 快照正确）
  const patchSelected = (mutate: (node: FormNode) => FormNode) => {
    const def = formDefinition.value;
    const root = Array.isArray(def?.root?.children) ? def.root.children : [];
    if (!root.length) return;
    const idx = Math.max(0, Math.min(selectedIndex.value, root.length - 1));
    const key = selectedKey.value ?? root[idx]?.key ?? root[idx]?.id;
    const target = key ? (findDslNodeByKey(root, key)?.node ?? root[idx]) : root[idx];
    if (!target) return;
    const nextNode = mutate({ ...target } as FormNode) as FormNode;
    nextNode.id = target.id;
    const nextChildren = key
      ? updateDslNodeAtKey(root, key, nextNode).nodes
      : root.map((n, i) => (i === idx ? nextNode : n));
    commitFormDefinition(
      { ...def, root: { ...def.root, children: nextChildren } },
      { reason: "field-edit", merge: true },
    );
  };

  const setFieldProp = (key: keyof FormNode, value: unknown) => {
    patchSelected((node) => {
      const record = node as unknown as Record<string, unknown>;
      if (value === undefined) delete record[key];
      else record[key] = value;
      return node;
    });
  };

  const setPropsProp = (key: string, value: unknown) => {
    patchSelected((node) => {
      const props = { ...node.props };
      if (value === undefined) delete props[key];
      else props[key] = value;
      node.props = Object.keys(props).length ? props : undefined;
      return node;
    });
  };

  const createPropsProp = <T>(key: string, defaultValue: T): WritableComputedRef<T, T> => {
    return computed({
      get: () => {
        const value = selectedField.value?.props?.[key];
        return (value ?? defaultValue) as T;
      },
      set: (value: T) => setPropsProp(key, value),
    });
  };

  const createButtonProp = <T>(key: string, defaultValue: T): WritableComputedRef<T, T> => {
    return computed({
      get: () => {
        const value = selectedField.value?.props?.[key];
        return (value ?? defaultValue) as T;
      },
      set: (value: T) => setPropsProp(key, value),
    });
  };

  // ─── 校验（DSL 存 ValidationRule[]，编辑层仍走 pipe 字符串）───────────────────
  const validationString = computed({
    get: () => {
      const rules = (selectedField.value as FieldNode | undefined)?.validation;
      return resolveValidation(rules).validation ?? "";
    },
    set: (value: string) => {
      const next = value.trim();
      patchSelected((node) => {
        if (node.category !== "field") return node;
        const field = node as FieldNode;
        if (next) {
          const rules = (parseValidation(next) ?? []).filter((r) => r.rule);
          field.validation = rules.length ? rules : undefined;
        } else {
          field.validation = undefined;
        }
        return node;
      });
    },
  });

  const validationStringLength = computed(() => {
    if (!validationString.value) return 0;
    return validationString.value.split("|").length;
  });

  const createValidationValue = (validationType: string, active: boolean = true) => {
    return computed({
      get: () => getParameterizedValidation(validationType),
      set: (value: string) => {
        updateValidationString(`${validationType}:${value}`, active);
      },
    });
  };

  const createValidationMessageValue = (validationType: string) => {
    return computed<string>({
      get: () => {
        const rules = (selectedField.value as FieldNode | undefined)?.validation;
        const rule = rules?.find((r) => r.rule === validationType);
        return rule?.message ?? "";
      },
      set: (value: string) => {
        patchSelected((node) => {
          if (node.category !== "field") return node;
          const field = node as FieldNode;
          const rules = [...(field.validation ?? [])];
          const idx = rules.findIndex((r) => r.rule === validationType);
          const trimmed = value.trim();
          if (idx >= 0) {
            const next = { ...rules[idx]! };
            if (trimmed) next.message = trimmed;
            else delete next.message;
            rules[idx] = next;
          } else if (trimmed) {
            rules.push({ rule: validationType, message: trimmed });
          }
          field.validation = rules.length ? rules : undefined;
          return node;
        });
      },
    });
  };

  // ─── 基础属性 ─────────────────────────────────────────────────────────────────
  const fieldName = computed({
    get: () => selectedField.value?.name || "",
    set: (newName: string) => {
      const nextName = normalizeName(newName);
      setFieldProp("name", nextName || undefined);
    },
  });

  const label = computed({
    get: () => selectedField.value?.label || "",
    set: (newLabel: string) => {
      patchSelected((node) => {
        const v = newLabel.trim();
        if (v) node.label = v;
        else delete node.label;
        return node;
      });
    },
  });

  const help = computed({
    get: () => {
      const value = selectedField.value?.props?.help;
      return typeof value === "string" ? value : "";
    },
    set: (newHelp: string) => setPropsProp("help", newHelp.trim() || undefined),
  });

  const placeholder = computed({
    get: () => {
      const value = selectedField.value?.props?.placeholder;
      return typeof value === "string" ? value : "";
    },
    set: (newPlaceholder: string) =>
      setPropsProp("placeholder", newPlaceholder.trim() || undefined),
  });

  const buttonText = computed<string>({
    get: () => {
      const node = selectedField.value;
      const value =
        node?.props?.buttonText ??
        node?.props?.text ??
        node?.label;
      return typeof value === "string" ? value : "";
    },
    set: (value: string) => {
      const next = value.trim();
      setPropsProp("buttonText", next || undefined);
    },
  });

  // ─── 值 / 表达式 ─────────────────────────────────────────────────────────────
  const fieldValue = computed<string>({
    get: () => {
      const node: any = selectedField.value;
      if (!node) return "";
      const value = node.value;
      if (isExprValue(value)) return "";
      if (value !== undefined && value !== null) return String(value);
      const propValue = node.props?.value ?? node.props?.text;
      if (propValue !== undefined && propValue !== null) return String(propValue);
      return "";
    },
    set: (newValue: string) => {
      patchSelected((node) => {
        if (node.category === "field") {
          (node as FieldNode).value = newValue === "" ? undefined : newValue;
        } else {
          const props = { ...node.props };
          const targetKey = "value" in props || !("text" in props) ? "value" : "text";
          if (newValue === "") delete props[targetKey];
          else props[targetKey] = newValue;
          node.props = Object.keys(props).length ? props : undefined;
        }
        return node;
      });
    },
  });

  const useExpressionValue = computed({
    get: () => isExprValue((selectedField.value as FieldNode | undefined)?.value),
    set: (value: boolean) => {
      patchSelected((node) => {
        if (node.category !== "field") return node;
        const field = node as FieldNode;
        if (value) {
          if (!isExprValue(field.value)) {
            const current = field.value;
            const raw = current !== undefined && current !== null ? String(current) : "";
            field.value = { $expr: parseExprString(raw || "$") };
          }
        } else if (isExprValue(field.value)) {
          field.value = undefined;
        }
        return node;
      });
    },
  });

  const valueExpression = computed<string>({
    get: () => {
      const value = (selectedField.value as FieldNode | undefined)?.value;
      if (!isExprValue(value)) return "";
      return exprToJs(value.$expr, "var");
    },
    set: (value: string) => {
      patchSelected((node) => {
        if (node.category !== "field") return node;
        const field = node as FieldNode;
        if (value.trim()) field.value = { $expr: parseExprString(value) };
        else field.value = undefined;
        return node;
      });
    },
  });

  const ifExpression = computed<string>({
    get: () => {
      const visibleIf = selectedField.value?.visibleIf;
      if (!visibleIf) return "";
      // var 模式：编辑器显示 $field（与表达式求值器 / FormKit schema 一致）
      return exprToJs(visibleIf, "var");
    },
    set: (value: string) => {
      const next = value.trim();
      setFieldProp("visibleIf", next ? parseExprString(next) : undefined);
    },
  });

  // ─── 数字 / 文件 / 范围 ───────────────────────────────────────────────────────
  const whichNumber = computed<string>({
    get: () => {
      const value = selectedField.value?.props?.number;
      return typeof value === "string" ? value : "integer";
    },
    set: (value: string) => {
      patchSelected((node) => {
        const props = { ...node.props };
        props.number = value;
        props.step = value === "integer" ? "1" : "0.1";
        node.props = Object.keys(props).length ? props : undefined;
        return node;
      });
    },
  });

  const numOfFiles = computed({
    get: () => {
      const value = selectedField.value?.props?.multiple;
      return typeof value === "string" ? value : "false";
    },
    set: (value: string) => setPropsProp("multiple", value),
  });

  const min = computed<number | undefined>({
    get: () => selectedField.value?.props?.min as number | undefined,
    set: (newMin: number | undefined) => setPropsProp("min", newMin),
  });

  const max = computed<number | undefined>({
    get: () => selectedField.value?.props?.max as number | undefined,
    set: (newMax: number | undefined) => setPropsProp("max", newMax),
  });

  // ─── 选项 ─────────────────────────────────────────────────────────────────────
  const modelValue = computed<string[]>({
    get: () => {
      const node: any = selectedField.value;
      const options = node?.options ?? node?.props?.options;
      return Array.isArray(options) ? (options as string[]) : [];
    },
    set: (newOptions: string[]) => {
      patchSelected((node) => {
        if (node.category === "field") {
          (node as FieldNode).options = newOptions as unknown as OptionItem[];
        } else {
          const props = { ...node.props };
          props.options = newOptions;
          node.props = Object.keys(props).length ? props : undefined;
        }
        return node;
      });
    },
  });

  const optionsRaw = computed<unknown>({
    get: () => {
      const node: any = selectedField.value;
      return node?.options ?? node?.props?.options ?? [];
    },
    set: (newOptions: unknown) => {
      patchSelected((node) => {
        if (node.category === "field") {
          (node as FieldNode).options = newOptions as OptionItem[];
        } else {
          const props = { ...node.props };
          props.options = newOptions;
          node.props = Object.keys(props).length ? props : undefined;
        }
        return node;
      });
    },
  });

  // ─── 校验字符串工具（保持 pipe 字符串语义）────────────────────────────────────
  const updateValidationString = (value: string, active: boolean = true) => {
    const currentValidation = validationString.value.split("|").filter(Boolean);
    let newValidation: string[];

    if (!value.includes(":")) {
      if (currentValidation.includes(value)) {
        newValidation = currentValidation.filter((item: string) => item !== value);
      } else {
        newValidation = [...currentValidation, value];
      }
      validationString.value = newValidation.join("|");
      return;
    } else {
      const [validationType, validationValue] = value.split(":");
      if (currentValidation.includes(value) && !active) {
        newValidation = currentValidation.filter((item: string) => item !== value);
      } else {
        const indexOfType = currentValidation.findIndex((item: string) =>
          item.startsWith(`${validationType}:`),
        );
        if (indexOfType === -1) {
          newValidation = [...currentValidation, value];
        } else {
          newValidation = [
            ...currentValidation.slice(0, indexOfType),
            `${validationType}:${validationValue}`,
            ...currentValidation.slice(indexOfType + 1),
          ];
        }
      }
      validationString.value = newValidation.join("|");
      return;
    }
  };

  const isActive = (fn: (arg0: string) => boolean, strVal: string) => {
    return computed(() => fn(strVal));
  };

  const getParameterizedValidation = (validationType: string) => {
    if (!validationString.value) return "";

    const validations = validationString.value.split("|");
    const validation = validations.find((item: string) => item.startsWith(`${validationType}`));

    if (!validation) return "";

    return validation.replace(`${validationType}:`, "");
  };

  // ─── 状态 ─────────────────────────────────────────────────────────────────────
  const selectedIsForm = computed(() => selectedTarget.value === "form");
  const hasField = computed(() => selectedIsForm.value || !!selectedField.value);

  const isValidationChecked = (validationType: string) => {
    if (!hasField.value) return false;
    const rules = (selectedField.value as FieldNode | undefined)?.validation;
    if (!rules?.length) return false;
    return rules.some((r) => r.rule === validationType);
  };

  const currentFieldType = computed(() => {
    if (!hasField.value) return null;
    if (selectedIsForm.value) return "form";
    const node = selectedField.value;
    if (!node) return null;
    return node.type;
  });

  const formName = computed<string>({
    get: () => formDefinition.value?.name ?? "form",
    set: (value: string) => {
      const next = value.trim();
      const def = formDefinition.value;
      commitFormDefinition({ ...def, name: next || "form" }, { reason: "form-name", merge: true });
    },
  });

  const formLabelPosition = computed<"top" | "left">({
    get: () => (formDefinition.value?.settings?.labelAlign === "left" ? "left" : "top"),
    set: (value: "top" | "left") => {
      const def = formDefinition.value;
      commitFormDefinition(
        { ...def, settings: { ...def.settings, labelAlign: value } },
        { reason: "form-label-position", merge: true },
      );
    },
  });

  const formLabelWidth = computed<number>({
    get: () => formDefinition.value?.settings?.labelWidth ?? 80,
    set: (value: number) => {
      const n = Number(value);
      const next = Number.isFinite(n) ? Math.max(0, Math.min(2000, Math.round(n))) : 120;
      const def = formDefinition.value;
      commitFormDefinition(
        { ...def, settings: { ...def.settings, labelWidth: next } },
        { reason: "form-label-width", merge: true },
      );
    },
  });

  const availableFieldNames = computed(() => {
    const names = new Set<string>();
    const walk = (nodes: FormNode[]) => {
      for (const node of nodes) {
        if (node.name && typeof node.name === "string") names.add(node.name);
        const children = (node as { children?: FormNode[] }).children;
        if (Array.isArray(children)) walk(children);
      }
    };
    walk(formDefinition.value?.root?.children ?? []);
    return Array.from(names);
  });

  const rowSpan = computed<number>({
    get: () => {
      const node = selectedField.value;
      return node?.layout?.rowspan ?? 1;
    },
    set: (value: number) => {
      const nextSpan = Math.max(1, Math.min(6, Math.round(value)));
      patchSelected((node) => {
        const layout = { ...node.layout };
        if (nextSpan > 1) layout.rowspan = nextSpan;
        else delete layout.rowspan;
        node.layout = Object.keys(layout).length ? layout : undefined;
        let classes = typeof node.outerClass === "string" ? node.outerClass : "";
        if (nextSpan > 1) {
          if (/\brow-span-\d+\b/.test(classes)) {
            classes = classes.replace(/\brow-span-\d+\b/g, `row-span-${nextSpan}`);
          } else {
            classes = `${classes} row-span-${nextSpan}`.replace(/\s+/g, " ").trim();
          }
        } else {
          classes = classes
            .replace(/\brow-span-\d+\b/g, "")
            .replace(/\s+/g, " ")
            .trim();
        }
        if (classes) node.outerClass = classes;
        else delete node.outerClass;
        return node;
      });
    },
  });

  const colSpan = computed<number>({
    get: () => {
      const node = selectedField.value
      return node?.layout?.colspan ?? 12
    },
    set: (value: number) => {
      const nextSpan = Math.max(1, Math.min(12, Math.round(value)))
      patchSelected((node) => {
        const layout = { ...node.layout }
        if (nextSpan < 12) layout.colspan = nextSpan
        else delete layout.colspan
        node.layout = Object.keys(layout).length ? layout : undefined
        // 同步 outerClass 里的 col-span-N：nodeOuterClass 优先用原始字符串，
        // 只改 layout 不改类名会导致画布仍按旧 col-span-N 渲染
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

  const bindEvents = computed<Record<string, unknown>>({
    get: () => {
      const value = selectedField.value?.props?.__bind;
      if (value && typeof value === "object") return value as Record<string, unknown>;
      return {};
    },
    set: (value: Record<string, unknown>) => {
      const hasAny = value && typeof value === "object" && Object.keys(value).length > 0;
      setPropsProp("__bind", hasAny ? value : undefined);
    },
  });

  return {
    fieldName,
    useExpressionValue,
    valueExpression,
    ifExpression,
    label,
    buttonText,
    placeholder,
    fieldValue,
    updateValidationString,
    isActive,
    createValidationValue,
    createValidationMessageValue,
    validationStringLength,
    currentFieldType,
    availableFieldNames,
    hasField,
    selectedIsForm,
    formName,
    formLabelPosition,
    formLabelWidth,
    help,
    whichNumber,
    validationString,
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
  };
}
