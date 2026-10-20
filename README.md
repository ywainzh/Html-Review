# HTML 预览

React + TypeScript + Vite 构建的移动端优先 HTML 预览工具。粘贴代码，点击预览，在当前页查看运行结果，再返回继续编辑。

## 本地开发

使用 Node.js 22.12+ 和 npm。

```sh
npm ci
npm run dev
```

默认访问 `http://localhost:5173`。开发服务监听局域网地址，同一 Wi-Fi 下的手机可使用终端输出的 Network 地址访问。

```sh
npm run build
npm run preview
```

构建产物位于 `dist/`，可部署到任意静态站点服务。运行时无需服务器 API 或环境变量。

## 代码组织

```text
src/
  app/                    应用组合、视口适配
  components/ui/          按钮和 SVG 图标
  features/preview/
    components/           代码输入、隔离预览
    hooks/                草稿、预览快照、浏览器导航
    lib/                  文档处理及单元测试
  styles/                 设计变量、全局基础样式
tests/e2e/                Chromium 与 WebKit 浏览器测试
```

组件使用 CSS Modules；公共视觉规范集中在 `src/styles/tokens.css`。TypeScript 启用严格检查，ESLint、Prettier 和 EditorConfig 统一代码格式。

## 检查与测试

```sh
npm run check
npx playwright install chromium webkit
npm run test:e2e
```

| 命令                   | 用途                           |
| ---------------------- | ------------------------------ |
| `npm run typecheck`    | TypeScript 检查                |
| `npm run lint`         | ESLint 检查                    |
| `npm run format`       | 格式化项目                     |
| `npm run format:check` | 仅检查格式                     |
| `npm test`             | Vitest 文档处理测试            |
| `npm run test:watch`   | 持续运行单元测试               |
| `npm run test:e2e`     | 两个浏览器引擎的流程与布局测试 |
| `npm run check`        | Lint、格式、单元测试和生产构建 |

测试覆盖 390×844、375×667、844×390、1440×1000，截图在 `test-results/`，报告在 `playwright-report/`。WebKit 的 iPhone 14 配置是浏览器模拟，不能替代 iPhone Chrome 真机验证。真机需额外检查系统粘贴菜单、软键盘、地址栏收缩、刘海安全区和返回手势。

桌面画布测试使用标签栏、状态信息和 JSON 内容样本，覆盖横向到达右侧控件、纵向到达页底、工具栏固定、旋转保留脚本状态和重新预览归零。Chromium 另用逐帧触摸事件验证原生滑动；WebKit 跳过该 CDP 专项。iPhone Chrome 真机的触摸滑动、安全区和返回手势仍待验证；未验证原截图对应的完整 HTML。

大段代码回归样本约 97 KB、1000 行，覆盖选择范围、横向和纵向滚动恢复。额外的 2 万行密集中文输入压力测试在本机浏览器中超时，原生输入框对照也出现相同现象；极端多行文本的输入性能仍受浏览器原生文本编辑能力限制。

## 运行行为

- 初始代码为空；代码只存在内存中，刷新后清空，不上传、不写入浏览器存储。
- 点击预览才创建运行快照；返回后保留代码、选择范围和滚动位置，不自动打开手机键盘。
- 预览统一采用至少 1280px 的桌面画布，空间更宽时填满可用宽度，保持原始比例。手机上左右滑动预览区、上下滚动网页查看内容；顶部「返回编辑」保持固定。
- 横竖屏切换只调整可视区域，保留正在运行的页面和脚本状态；重新提交预览时从左上角开始。画布基准宽度统一配置在 `src/styles/tokens.css` 的 `--preview-desktop-width`。
- 完整 HTML 和片段均可使用；缺失 viewport 时补充移动端默认值，已有 viewport 保持原样。原始输入不会被改写。
- `iframe sandbox="allow-scripts"` 运行预览；不授予同源访问、顶层导航、弹窗或表单提交权限。
- 外部 HTTPS 脚本、样式、图片可正常请求；模块脚本和 fetch 仍需资源服务器允许 CORS。请使用绝对资源地址，工具不托管代码依赖的本地文件。
- 沙箱没有宿主页面的登录态或同源存储能力。依赖这些能力、后端服务或特殊浏览器权限的页面不在首版支持范围内。
- 沙箱是浏览器权限边界，不是网络离线环境，也不是 CPU / 内存限制。粘贴的代码及其外部依赖会在点击预览后运行。
