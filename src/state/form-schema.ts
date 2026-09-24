import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import type { FormNode } from '@/types/dsl'

// 选中状态：按实例创建，不再暴露模块级门面。
export interface SelectionState {
  selectedIndex: Ref<number>
  selectedKey: Ref<string | null>
  selectedTarget: Ref<'field' | 'form'>
  /** D1：多选的 key 列表。单选时恒等于 [selectedKey]（null 时为 []），由下面的
   *  watcher 跟随 selectedKey 自动同步；真正的多选（长度 > 1）只能经 setMultiSelection
   *  写入（use-canvas-commands.ts 的 selectItem/selectAllRoot 用它）。旧代码路径
   *  （各容器的 onSelect、use-canvas-schema.ts 的 selectByKey 等）完全不需要知道
   *  这个字段的存在——它们照常只改 selectedKey，多选状态会自动折叠回单选。 */
  selectedKeys: Ref<string[]>
  /** D1：原子写入多选（keys + 最后点击的锚点 key，同步生效、不触发下面把 selectedKeys
   *  折叠回 [anchorKey] 的自动同步）。多选逻辑一律经这里写，不要直接改
   *  selectedKeys.value——否则会被下面的 watcher 按"单选"语义立即覆盖。 */
  setMultiSelection: (keys: string[], anchorKey: string | null) => void
  /** 数据表格选中列下标（null = 未选中列；配合 selectedKey 定位所属数据表格节点） */
  selectedColumnIndex: Ref<number | null>
  /** 元素属性编辑目标覆盖：列元素等非树节点复用标准字段编辑器时指向的工作节点 */
  elementEditTarget: Ref<FormNode | null>
  /** 元素属性写回回调：工作节点变更后把结果落回（如 columns[i].element） */
  elementEditCommit: Ref<((node: FormNode) => void) | null>
}

// 按实例创建选中状态。
export function createSelectionState(): SelectionState {
  // 选中的根节点下标（未用 __key 定位时的回退）
  const selectedIndex = ref(0)
  // 选中的节点唯一 key（优先于 selectedIndex，支持容器内嵌套节点）
  const selectedKey = ref<string | null>(null)
  // D1：多选 key 列表，见上方接口注释
  const selectedKeys = ref<string[]>([])
  // 当前编辑目标：'form'（表单设置）| 'field'（字段/容器）
  const selectedTarget = ref<'field' | 'form'>('form')
  // 数据表格选中列下标（列非树节点，不能经 selectedKey 定位，需单独记录）
  const selectedColumnIndex = ref<number | null>(null)
  // 列元素属性编辑：非树节点编辑时把工作 DSL 节点挂到此处，标准编辑器读写它
  const elementEditTarget = ref<FormNode | null>(null)
  const elementEditCommit = ref<((node: FormNode) => void) | null>(null)

  // D1：selectedKeys 跟随 selectedKey 反向同步。selectedKey 才是全仓库既有代码路径
  // （选中 / 清空 / 切换）唯一改写的字段：它们照常只赋值 selectedKey，这里同步折叠出
  // 对应的单选态 [key]（或清空为 []），天然满足"普通点击回到单选 / 点空白清空"的
  // 要求，不需要每个既有选中入口都改一遍。真正的多选写入必须走下面的
  // setMultiSelection——用 suppressSync 标记 + flush:'sync' 让这次 selectedKey 赋值
  // 不经过这条自动折叠逻辑（两者都是同步生效，不依赖任何"数组内容"之类的启发式
  // 判断，不会像"猜测这次赋值是不是多选操作"那样在边界场景下误判）。
  let suppressSync = false
  watch(
    selectedKey,
    (key) => {
      if (suppressSync) return
      selectedKeys.value = key ? [key] : []
    },
    { flush: 'sync' },
  )

  function setMultiSelection(keys: string[], anchorKey: string | null) {
    suppressSync = true
    selectedKeys.value = keys
    selectedKey.value = anchorKey
    suppressSync = false
  }

  return {
    selectedIndex,
    selectedKey,
    selectedKeys,
    setMultiSelection,
    selectedTarget,
    selectedColumnIndex,
    elementEditTarget,
    elementEditCommit,
  }
}
