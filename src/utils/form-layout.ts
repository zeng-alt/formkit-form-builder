// ═══ 表单级标签布局：画布与运行时共享 ══════════════════════════════════════════
// 标签位置/宽度此前在 use-canvas-schema.ts（画布）与 FormRenderer.vue（运行时）
// 各写一份类名拼接，已经出现漂移（运行时多一个 fk-label-left 标记类，画布没有）；
// 默认标签宽度也到处散落着字面量 80（部分非法输入兜底甚至是 120）。这里收敛成
// 唯一实现，画布/运行时/各编辑器全部改用它，不再各自拼一份。

/** 表单级标签宽度默认值（settings.labelWidth 缺省/非法时的兜底） */
export const DEFAULT_LABEL_WIDTH = 80

/** 表单级设置的默认值：外部手写/生成的定义可能整个漏掉 settings（类型上必填，
 *  运行时不保证），schema-adapter 直接读 settings.labelAlign 会抛错——定义进入
 *  设计器 / 渲染器的入口（dsl/keys.ts 的 ensureDslKeys）统一以此兜底，不再到处 `?.`。 */
export const DEFAULT_FORM_SETTINGS: Readonly<{ labelWidth: number; labelAlign: 'top' | 'left' }> = {
  labelWidth: DEFAULT_LABEL_WIDTH,
  labelAlign: 'top',
}

/**
 * 按标签位置返回表单根元素上要挂的标签布局类：
 * - top（默认）：仅通用的标签字号/字重类；
 * - left：额外加 fk-label-left 标记类 + 标签/输入区水平排列的一整套类
 *   （标签定宽 = --fk-label-width CSS 变量，见 formLabelWidthStyle）。
 */
export function formLabelLayoutClass(labelAlign: 'top' | 'left' | undefined): string {
  const common = ['[&_.formkit-label]:text-xs', '[&_.formkit-label]:font-bold'].join(' ')
  if (labelAlign !== 'left') return common
  return [
    common,
    'fk-label-left',
    '[&_.formkit-wrapper]:flex',
    '[&_.formkit-wrapper]:flex-row',
    '[&_.formkit-wrapper]:items-start',
    '[&_.formkit-wrapper]:gap-3',
    '[&_.formkit-label]:mb-0',
    '[&_.formkit-label]:w-[var(--fk-label-width)]',
    '[&_.formkit-label]:shrink-0',
    '[&_.formkit-label]:pt-1',
    '[&_.formkit-inner]:flex-1',
    '[&_.formkit-inner]:min-w-0',
  ].join(' ')
}

/** 表单根元素上要挂的 `--fk-label-width` CSS 变量（left 布局的标签类读它定宽） */
export function formLabelWidthStyle(width: number | undefined): Record<string, string> {
  const w = Number.isFinite(width) ? Number(width) : DEFAULT_LABEL_WIDTH
  return { '--fk-label-width': `${w}px` }
}
