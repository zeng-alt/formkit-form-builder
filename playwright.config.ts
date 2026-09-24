import { defineConfig, devices } from '@playwright/test'

// ═══ E2E 冒烟测试配置 ═══════════════════════════════════════════════════════════
// 只跑 chromium 一个项目：这里验证的是设计器自身的交互逻辑（拖拽、快捷键、样式
// 计算值），不是跨浏览器兼容性，多浏览器矩阵收益不大、反而拖慢反馈。
//
// 本机 chromium 路径通过 PW_CHROMIUM_PATH 环境变量传入（未设置时不传
// executablePath，退回 Playwright 自带的下载逻辑）——本机已经预置了与
// @playwright/test 版本对应的 chromium 可执行文件，不需要也不应该在本机执行
// `playwright install` 再下载一份。
const chromiumExecutablePath = process.env.PW_CHROMIUM_PATH

export default defineConfig({
  testDir: 'e2e',
  // 只有 8 条用例，总耗时本来就很短；改成单 worker 顺序跑，换来的是排除"多个
  // Chromium 实例抢 CPU 拖慢渲染/事件循环"这个变量——快捷键/拖拽这类时序敏感的
  // 用例在并发跑时明显更容易撞上偶发的时序窗口（例如复制紧接着粘贴那条用例，
  // 见 copy-paste-multiselect.spec.ts 的注释），单 worker 顺序跑更稳定、也更贴近
  // 真实用户单标签页操作时的资源环境。
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  // 本地允许失败重试排查，CI 上不重试——冒烟测试要求本身就是稳定通过，重试掩盖
  // flaky 而不是暴露它。
  retries: 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
  use: {
    baseURL: 'http://localhost:5299',
    // 失败时保留 trace 和截图，方便排查；平时不保留，避免产物堆积
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(chromiumExecutablePath
          ? { launchOptions: { executablePath: chromiumExecutablePath } }
          : {}),
      },
    },
  ],
  // 独立起一个开发服务器（5299），不复用正在跑的 5199：两者都是同一份 playground，
  // 端口错开纯粹是为了不干扰手工调试用的那个实例。
  webServer: {
    command: 'pnpm exec vite --port 5299 --strictPort',
    url: 'http://localhost:5299',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
