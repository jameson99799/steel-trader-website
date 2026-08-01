# 站点头部固定定位恢复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复关键 CSS 创建错误滚动容器的问题，使桌面端整个站点头部及移动端现有导航在页面滚动时保持固定。

**Architecture:** 保留 `SiteHeader.vue` 现有 `position: sticky; top: 0`，只在 `index.html` 的关键 CSS 中把 `html, body` 的 `overflow-x` 从 `hidden` 改为 `clip`。通过源码回归测试锁定 sticky 与 overflow 约束，再用完整测试、生产构建和浏览器滚动测量验证交付结果。

**Tech Stack:** Vue 3、CSS、Vite、Node.js 内置测试运行器、Microsoft Edge DevTools Protocol

## Global Constraints

- 桌面端固定整个站点头部，包括黑色联系方式栏和白色主导航栏。
- 平板和手机继续使用当前响应式规则；黑色栏保持隐藏，现有移动导航固定在顶部。
- 保留横向溢出裁剪，页面不能出现横向滚动条。
- 不改变导航高度、视觉样式、菜单、下拉框、语言选择器或正文间距。
- 不把 `.site-header` 改成 `position: fixed`。
- 不修改 `SiteHeader.vue` 的现有 sticky 实现，除非回归测试证明该实现缺失。
- 必须先观察新增测试因 `overflow-x:hidden` 失败，再编写最小修复。

---

### Task 1：建立站点头部 sticky 回归测试

**Files:**
- Create: `test/siteHeaderSticky.test.js`
- Read: `index.html:30-44`
- Read: `src/components/SiteHeader.vue:325-332`

**Interfaces:**
- Consumes: `index.html` 的关键 CSS和 `SiteHeader.vue` 的 `.site-header` 样式。
- Produces: 一个由 `npm test` 自动执行的源码回归测试，锁定 `overflow-x: clip`、`position: sticky` 和 `top: 0`。

- [ ] **Step 1：创建失败测试**

创建 `test/siteHeaderSticky.test.js`：

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const indexHtml = fs.readFileSync(
  new URL('../index.html', import.meta.url),
  'utf8'
)

const siteHeader = fs.readFileSync(
  new URL('../src/components/SiteHeader.vue', import.meta.url),
  'utf8'
)

test('critical CSS clips horizontal overflow without breaking sticky positioning', () => {
  assert.match(
    indexHtml,
    /html,\s*body\s*\{[^}]*overflow-x:\s*clip;/
  )
  assert.doesNotMatch(
    indexHtml,
    /html,\s*body\s*\{[^}]*overflow-x:\s*hidden;/
  )
})

test('site header keeps the complete header sticky at the viewport top', () => {
  assert.match(
    siteHeader,
    /\.site-header\s*\{[^}]*position:\s*sticky;[^}]*top:\s*0;/
  )
})
```

- [ ] **Step 2：运行目标测试并确认 RED**

Run:

```powershell
node --test test/siteHeaderSticky.test.js
```

Expected: 共 2 个测试；`critical CSS clips horizontal overflow without breaking sticky positioning` 失败，原因是当前 `index.html` 仍包含 `overflow-x:hidden`；`.site-header` 测试通过。

- [ ] **Step 3：检查失败原因符合预期**

确认失败不是文件路径、正则语法或编码错误。若 sticky 测试也失败，停止执行并重新检查 `SiteHeader.vue`，不得同时修改两个根因。

---

### Task 2：最小修改关键 CSS 并转为 GREEN

**Files:**
- Modify: `index.html:38`
- Test: `test/siteHeaderSticky.test.js`

**Interfaces:**
- Consumes: Task 1 创建的两个源码断言。
- Produces: `html, body` 使用 `overflow-x: clip` 的关键 CSS，不建立干扰 sticky 的 body 滚动容器。

- [ ] **Step 1：实施单行根因修复**

把 `index.html` 中：

```css
html, body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; background:#fff; color:#0f172a; overflow-x:hidden; }
```

改为：

```css
html, body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; background:#fff; color:#0f172a; overflow-x:clip; }
```

不得修改这一行的其他字体、背景色或颜色声明。

- [ ] **Step 2：运行目标测试并确认 GREEN**

Run:

```powershell
node --test test/siteHeaderSticky.test.js
```

Expected: 2 个测试全部通过，输出 `fail 0`。

- [ ] **Step 3：检查修改范围**

Run:

```powershell
git diff --check
git diff -- index.html test/siteHeaderSticky.test.js
```

Expected: `git diff --check` 退出码为 0；运行代码只有 `hidden` 到 `clip` 的单词替换，另有一个新测试文件。

- [ ] **Step 4：提交根因修复**

Run:

```powershell
git add index.html test/siteHeaderSticky.test.js
git commit -m "fix: restore sticky site header"
```

Expected: 生成包含 2 个文件的功能提交。

---

### Task 3：完整测试和生产构建验证

**Files:**
- Verify: `index.html`
- Verify: `src/components/SiteHeader.vue`
- Verify: `test/siteHeaderSticky.test.js`
- Verify generated: `dist/index.html`

**Interfaces:**
- Consumes: Task 2 提交的关键 CSS 修复。
- Produces: 完整测试、构建产物规则和构建成功证据。

- [ ] **Step 1：运行完整自动化测试**

Run:

```powershell
npm.cmd test
```

Expected: 当前 46 个测试加上新增 2 个测试，共 48 个测试通过，输出 `fail 0`。

- [ ] **Step 2：运行生产构建**

Run:

```powershell
npm.cmd run build
```

Expected: Vite 输出 `built in ...`，739 个左右模块完成转换，退出码为 0。现有资源分块大小提示不属于失败。

- [ ] **Step 3：核对构建后的关键 CSS**

Run:

```powershell
$distHtml = Get-Content -Raw -Encoding UTF8 'dist/index.html'
if ($distHtml -notmatch 'html,\s*body\s*\{[^}]*overflow-x:clip;') {
  throw 'dist/index.html 未包含 overflow-x:clip'
}
if ($distHtml -match 'html,\s*body\s*\{[^}]*overflow-x:hidden;') {
  throw 'dist/index.html 仍包含会破坏 sticky 的 overflow-x:hidden'
}
Write-Output 'Built critical CSS verified: overflow-x:clip'
```

Expected: 输出 `Built critical CSS verified: overflow-x:clip`。

---

### Task 4：浏览器滚动验收和 GitHub 推送

**Files:**
- Verify: `dist/index.html`
- Verify: `src/components/SiteHeader.vue`
- Verify repository: Git `main`

**Interfaces:**
- Consumes: Task 3 验证过的生产构建。
- Produces: 浏览器滚动证据、GitHub `main` 提交和远端 SHA 一致性证明。

- [ ] **Step 1：启动本地生产预览**

Run in a hidden/background process:

```powershell
node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4174
```

Expected: `http://127.0.0.1:4174` 返回 HTTP 200。验证完成后只终止此次启动并监听 4174 端口的进程。

- [ ] **Step 2：在桌面视口执行浏览器滚动测量**

使用隔离的 Microsoft Edge 临时配置访问 `http://127.0.0.1:4174/en/products/ppgi-pre-painted-galvanized-steel-coil`，视口设为 1920×900。等待 `.site-header` 出现后执行：

```js
const header = document.querySelector('.site-header')
document.querySelector('.site-main').style.minHeight = '3000px'

const before = {
  top: header.getBoundingClientRect().top,
  height: header.getBoundingClientRect().height,
  horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
}

window.scrollTo(0, 1200)
await new Promise(resolve => setTimeout(resolve, 500))

const after = {
  top: header.getBoundingClientRect().top,
  height: header.getBoundingClientRect().height,
  scrollY: window.scrollY,
  horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
}
```

Expected:

```json
{
  "before": { "top": 0, "height": 136, "horizontalOverflow": 0 },
  "after": { "top": 0, "height": 136, "scrollY": 1200, "horizontalOverflow": 0 }
}
```

允许 `scrollY` 因页面实际最大高度小于 1200 而低于 1200，但必须大于 500；`before.top` 和 `after.top` 必须为 0。

- [ ] **Step 3：最终检查工作区和提交**

Run:

```powershell
git status --short
git log -3 --oneline
git show --stat --oneline HEAD
```

Expected: 工作区无未提交修改；最近提交包含设计文档、实施计划和 `fix: restore sticky site header`。

- [ ] **Step 4：推送 GitHub `main`**

Run:

```powershell
git push origin main
```

Expected: GitHub `main` 更新到本地最新提交。

- [ ] **Step 5：核对远端 SHA**

Run:

```powershell
$localSha = git rev-parse HEAD
$remoteSha = (git ls-remote origin refs/heads/main).Split("`t")[0]
if ($localSha -ne $remoteSha) {
  throw '远端 main 与本地 HEAD 不一致'
}
Write-Output "GitHub main verified: $localSha"
```

Expected: 输出 `GitHub main verified: <SHA>`。
