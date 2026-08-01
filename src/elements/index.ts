// 元素注册中心：集中管理所有可拖拽元素（字段 / 容器 / 静态展示）。
// 新增元素只需在 definitions/ 中添加一条 ElementDefinition，即可同时驱动：
//   - 左侧元素面板（icon / tooltip / category / 默认 schema）
//   - 画布渲染（formkit input 注册）
//   - 右侧属性编辑面板（editor）
import { fieldElements } from './definitions/fields'
import { staticElements } from './definitions/static'
import { containerElements } from './definitions/containers'
import { registerElements } from './registry'

registerElements([...fieldElements, ...staticElements, ...containerElements])

export * from './types'
export * from './constants'
export {
  registerElement,
  registerElements,
  getElementDefinition,
  getElementDefinitions,
  getFieldEditorComponent,
  createFieldProps,
  fieldProps,
  createDefaultFormElements,
  buildFormkitInputs,
  SHARED_FORMKIT_PROPS,
} from './registry'
