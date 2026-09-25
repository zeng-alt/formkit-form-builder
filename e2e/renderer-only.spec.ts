// ═══ V3：只用渲染入口的独立页面 ═══════════════════════════════════════════════════
// 覆盖 build-tools/check-bundle.mjs 覆盖不到的运行时事实：真的用浏览器打开一个只
// import '@zeng-alt/formkit-form-builder/renderer' 的页面，表单能正常渲染、校验、
// 提交（含条件必填），并且监听网络请求，确认全程没有加载任何 codemirror /
// drag-and-drop 模块。
import { test, expect } from './helpers'

test('渲染入口独立页面：字段 + 容器 + 条件必填正常渲染和提交，且不加载 codemirror / drag-and-drop', async ({
  page,
}) => {
  const loadedUrls: string[] = []
  page.on('request', (req) => loadedUrls.push(req.url()))

  await page.goto('/renderer-only.html')

  const form = page.getByTestId('renderer-only-form')
  await expect(form).toBeVisible()

  // 字段：姓名
  await expect(page.getByLabel('姓名', { exact: true })).toBeVisible()
  // 容器（card）里的字段：邮箱
  await expect(page.getByLabel('邮箱')).toBeVisible()
  // 条件必填字段：电话，未填姓名时不是必填，可以直接提交成功
  const phoneInput = page.getByLabel('电话（填写姓名后必填）')
  await expect(phoneInput).toBeVisible()

  await page.getByLabel('姓名', { exact: true }).fill('张三')
  await page.getByLabel('邮箱').fill('zhangsan@example.com')

  // 填了姓名后电话变为必填：不填直接提交应该被 FormKit 校验拦住，不会触发 onSubmit
  await form.getByRole('button', { name: '提交' }).click()
  await expect(page.getByTestId('renderer-only-submitted')).toHaveCount(0)
  await expect(page.getByRole('list').filter({ hasText: '电话' })).toContainText('不得留空')

  // 补上电话后可以正常提交
  await phoneInput.fill('13800000000')
  await form.getByRole('button', { name: '提交' }).click()

  const submitted = page.getByTestId('renderer-only-submitted')
  await expect(submitted).toBeVisible()
  await expect(submitted).toContainText('张三')
  await expect(submitted).toContainText('13800000000')

  // 网络请求里不能出现 codemirror / drag-and-drop 相关模块
  const offending = loadedUrls.filter((u) => /codemirror|drag-and-drop/i.test(u))
  expect(offending, `不应加载这些模块：\n${offending.join('\n')}`).toEqual([])
})
