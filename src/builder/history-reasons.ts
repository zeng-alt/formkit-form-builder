// ═══ E2：历史面板——提交 reason → i18n key 映射 ════════════════════════════════
// 汇总自全仓库所有 commitFormDefinition/commitSchema/commitSchemaReconcile 的
// { reason } 调用点（grep `reason: '` 的结果，测试文件里的临时 reason 不计入）。
// 未登记的 reason（含并行任务后续新增的、历史遗留的）统一落到 default（「修改」），
// 不需要每加一个新提交点就回来补一条映射才能正常显示。
const REASON_LABEL_KEYS: Record<string, string> = {
  import: 'import',
  'apply-template': 'applyTemplate',
  ai: 'ai',
  clear: 'clear',
  delete: 'delete',
  'structure-delete': 'delete',
  duplicate: 'duplicate',
  'structure-duplicate': 'duplicate',
  'container-children': 'containerChildren',
  'inline-edit': 'inlineEdit',
  'field-edit': 'fieldEdit',
  resize: 'resize',
  'delete-column': 'deleteColumn',
  dnd: 'dnd',
  'structure-dnd': 'dnd',
  'structure-rename': 'rename',
  'form-name': 'formName',
  'form-id': 'formId',
  'form-version': 'formVersion',
  'form-label-position': 'formLabelPosition',
  'form-label-width': 'formLabelWidth',
  'form-submit': 'formSubmit',
  'form-size': 'formSize',
  'form-disabled': 'formDisabled',
  'form-readonly': 'formReadonly',
  'form-success-message': 'formSuccessMessage',
  'form-success-redirect': 'formSuccessRedirect',
  'form-show-reset': 'formShowReset',
  'form-submit-text': 'formSubmitText',
  'form-reset-text': 'formResetText',
  // 画布命令层（use-canvas-commands.ts）
  cut: 'cut',
  reorder: 'reorder',
  paste: 'paste',
  wrap: 'wrap',
  'convert-type': 'convertType',
}

/** 按提交 reason 取历史面板文案对应的 i18n key（拼接为 `history.reasons.<key>`）；
 *  未登记 / 空 reason 落到 default（「修改」）。 */
export function historyReasonI18nKey(reason?: string): string {
  if (reason && REASON_LABEL_KEYS[reason]) return REASON_LABEL_KEYS[reason]
  return 'default'
}
