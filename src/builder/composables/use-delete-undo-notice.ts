// ═══ H7：删除元素后提供撤销 ═══════════════════════════════════════════════════
// 删除的两条路径（画布上的删除按钮、H5 键盘快捷键）共用这一份提示逻辑：删除提交
// 后弹一条带「撤销」按钮的通知，点击时只有在“删除之后没有发生过别的编辑”才真正
// 调用 undo()——判断依据是 formDefinition 是否仍是删除提交后的那个引用（DSL 全程
// 不可变更新，只要发生过任何新的提交，formDefinition.value 就会换成新对象），
// 不满足就什么也不做（避免撤销到别的操作，而不是撤销错东西）。
import { h } from 'vue'
import { NButton, useNotification } from 'naive-ui'
import { useFormBuilderI18n } from '@/i18n/context'
import type { FormDefinition } from '@/types/dsl'
import type { ShallowRef } from 'vue'

export function useDeleteUndoNotice(state: {
  formDefinition: ShallowRef<FormDefinition>
  undo: () => void
}) {
  const notification = useNotification()
  const { t } = useFormBuilderI18n()

  /** 在删除提交之后立即调用，传入删除提交后读到的 formDefinition.value（即本次删除
   *  产出的那个引用）。几秒后自动消失（naive-ui notification 默认行为的 duration）。 */
  function notify(afterDelete: FormDefinition) {
    notification.info({
      title: t('builder.deletedNotice'),
      duration: 6000,
      action: () =>
        h(
          NButton,
          {
            text: true,
            type: 'primary',
            size: 'small',
            onClick: () => {
              if (state.formDefinition.value === afterDelete) state.undo()
            },
          },
          { default: () => t('builder.undo') },
        ),
    })
  }

  return { notify }
}
