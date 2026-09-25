// ═══ X：字段按需加载——渲染入口冷启动只拉取用到的字段组件 ═══════════════════════════
// 打开只含文本字段的渲染入口页面，确认没有请求日期选择器/数据表格相关的 chunk；
// 再打开含日期字段的页面，确认日期组件正常渲染、可以选择日期。
import { test, expect } from './helpers'

test('渲染入口按需加载：纯文本页面不拉取日期/数据表格 chunk，日期页面能正常选择日期', async ({
  page,
}) => {
  const textPageUrls: string[] = []
  page.on('request', (req) => textPageUrls.push(req.url()))

  await page.goto('/renderer-only.html')
  await expect(page.getByTestId('renderer-only-form')).toBeVisible()
  await expect(page.getByLabel('姓名', { exact: true })).toBeVisible()

  // 按 chunk 文件名 / 模块路径判断：这些是按需加载组件对应的源文件名
  // （见 src/elements/component-loader.ts 与 elements/lazy-groups/*.ts）
  const offending = textPageUrls.filter((u) =>
    /naivedatepicker|datatablecontainerpreview|date-family|richtext|signaturepad/i.test(u),
  )
  expect(offending, `纯文本表单不应加载这些按需组件：\n${offending.join('\n')}`).toEqual([])

  // 换一个包含日期字段的页面：日期组件应该正常拉取、渲染，并且可以选择日期
  await page.goto('/renderer-only-date.html')
  const dateForm = page.getByTestId('renderer-only-date-form')
  await expect(dateForm).toBeVisible()

  // NDatePicker 的可访问名是占位符文案而不是外层 FormKit label（与文本类字段的
  // getByLabel 用法不同，见上面 renderer-only.spec.ts 那条），按占位符定位输入框
  const dateInput = page.getByPlaceholder('选择日期')
  await expect(dateInput).toBeVisible()
  await expect(dateInput).toHaveValue('')

  await dateInput.click()
  const day15 = page.locator('.n-date-panel-date', { hasText: /^15$/ })
  await expect(day15.first()).toBeVisible()
  await day15.first().click()

  await expect(dateInput).not.toHaveValue('')
})
