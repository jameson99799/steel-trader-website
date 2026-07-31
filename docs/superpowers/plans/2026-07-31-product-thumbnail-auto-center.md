# 产品详情激活缩略图自动居中 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 主图通过左右箭头或缩略图切换后，在激活缩略图离开横向可视区域时，将它平滑滚动到缩略图栏中央。

**Architecture:** 在 `ProductDetail.vue` 内保存缩略图容器和各按钮的 DOM 引用，监听现有 `currentImage` 状态。DOM 更新完成后比较激活按钮与容器的水平边界，仅在按钮未完整可见时调用 `scrollIntoView`，保持现有图片、视频、循环切换和手动横向滚动逻辑不变。

**Tech Stack:** Vue 3 Composition API、Vite、Node.js 内置测试运行器

## Global Constraints

- 所有实现都限定在产品详情图库组件及其回归测试中。
- 不改变产品图片数据结构、主图切换顺序、缩略图样式或服务端接口。
- 必须先看到新增测试失败，再编写实现代码。
- 激活缩略图已经完整可见时不滚动，避免首次加载和普通切换造成不必要位移。
- `scrollIntoView` 必须使用 `behavior: 'smooth'`、`block: 'nearest'`、`inline: 'center'`。

---

## Task 1：添加缩略图同步滚动回归测试

**Files:**
- Modify: `test/productDetailGallery.test.js`
- Test: `test/productDetailGallery.test.js`

- [ ] **Step 1：在现有测试文件追加失败测试**

在 `test/productDetailGallery.test.js` 追加：

```js
test('active thumbnail follows main image navigation', () => {
  assert.match(source, /<div class="thumbnails"[^>]*ref="thumbnailContainer"/)
  assert.match(source, /:ref="el => setThumbnailButton\(el, index\)"/)
  assert.match(source, /import \{[^}]*nextTick[^}]*\} from 'vue'/)
  assert.match(source, /watch\(currentImage, centerActiveThumbnail\)/)
  assert.match(source, /await nextTick\(\)/)
  assert.match(source, /buttonRect\.left < containerRect\.left \|\| buttonRect\.right > containerRect\.right/)
  assert.match(
    source,
    /button\.scrollIntoView\(\{[\s\S]*?behavior: 'smooth'[\s\S]*?block: 'nearest'[\s\S]*?inline: 'center'/
  )
})
```

- [ ] **Step 2：运行目标测试并确认 RED**

Run:

```powershell
node --test test/productDetailGallery.test.js
```

Expected: 新增的 `active thumbnail follows main image navigation` 测试失败，原有 2 个测试通过；失败信息指出模板尚无 `thumbnailContainer` 引用或实现尚无同步滚动逻辑。

- [ ] **Step 3：暂不提交失败状态**

失败测试与下一任务的实现代码在同一个功能提交中提交，避免 `main` 出现刻意失败的中间提交。

---

## Task 2：实现激活缩略图按需平滑居中

**Files:**
- Modify: `src/views/ProductDetail.vue:50-56`
- Modify: `src/views/ProductDetail.vue:256-272`
- Modify: `src/views/ProductDetail.vue:407-419`
- Test: `test/productDetailGallery.test.js`

- [ ] **Step 1：给容器和循环按钮绑定 DOM 引用**

把缩略图模板改为：

```vue
<div ref="thumbnailContainer" class="thumbnails" v-if="images.length > 1">
  <button v-for="(img, index) in images" :key="index"
      :ref="el => setThumbnailButton(el, index)"
      :class="['thumbnail-btn', { active: currentImage === img }]"
      @click="currentImage = img">
```

其余 `<video>`、`<img>` 和闭合标签保持不变。

- [ ] **Step 2：导入 `nextTick` 并声明 DOM 引用**

把 Vue 导入改为：

```js
import { ref, computed, onMounted, watch, nextTick } from 'vue'
```

在现有页面状态引用附近加入：

```js
const thumbnailContainer = ref(null)
const thumbnailButtons = ref([])
```

- [ ] **Step 3：收集按钮引用并实现按需居中**

在 `currentImageIndex` 后、`prevImage` 前加入：

```js
const setThumbnailButton = (el, index) => {
  if (el) {
    thumbnailButtons.value[index] = el
  } else {
    delete thumbnailButtons.value[index]
  }
}

const centerActiveThumbnail = async () => {
  await nextTick()

  const container = thumbnailContainer.value
  const button = thumbnailButtons.value[currentImageIndex.value]
  if (!container || !button) return

  const containerRect = container.getBoundingClientRect()
  const buttonRect = button.getBoundingClientRect()
  const isOutsideHorizontalView = buttonRect.left < containerRect.left || buttonRect.right > containerRect.right

  if (isOutsideHorizontalView) {
    button.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center'
    })
  }
}

watch(currentImage, centerActiveThumbnail)
```

函数 ref 在元素卸载时收到 `null`，对应索引会被删除，避免语言或产品切换后继续使用旧 DOM。

- [ ] **Step 4：运行目标测试并确认 GREEN**

Run:

```powershell
node --test test/productDetailGallery.test.js
```

Expected: 3 个测试全部通过，输出 `fail 0`。

- [ ] **Step 5：检查本次修改内容**

Run:

```powershell
git diff --check
git diff -- src/views/ProductDetail.vue test/productDetailGallery.test.js
```

Expected: `git diff --check` 无输出且退出码为 0；差异只包含 DOM 引用、按需滚动逻辑和对应测试。

- [ ] **Step 6：提交功能实现**

Run:

```powershell
git add src/views/ProductDetail.vue test/productDetailGallery.test.js
git commit -m "feat: keep active thumbnail centered"
```

Expected: 生成一个包含 2 个文件的功能提交。

---

## Task 3：完整验证并推送 GitHub main

**Files:**
- Verify: `src/views/ProductDetail.vue`
- Verify: `test/productDetailGallery.test.js`
- Verify: `package.json`

- [ ] **Step 1：运行完整自动化测试**

Run:

```powershell
npm.cmd test
```

Expected: 全部测试通过，`fail 0`；在当前 45 个测试基础上新增 1 个，预计共 46 个测试。

- [ ] **Step 2：运行生产构建**

Run:

```powershell
npm.cmd run build
```

Expected: Vite 输出 `built in ...` 并退出码为 0。资源分块大小警告可以保留，它不属于本功能错误。

- [ ] **Step 3：确认工作区和提交内容**

Run:

```powershell
git status --short
git log -2 --oneline
git show --stat --oneline HEAD
```

Expected: 功能文件已提交；若计划文档提交后工作区应为空，最近提交中能看到计划提交和功能提交。

- [ ] **Step 4：推送到 GitHub `main`**

Run:

```powershell
git push origin main
```

Expected: GitHub `main` 更新到本地最新功能提交。

- [ ] **Step 5：核对远端提交 SHA**

Run:

```powershell
$localSha = git rev-parse HEAD
$remoteSha = (git ls-remote origin refs/heads/main).Split("`t")[0]
if ($localSha -ne $remoteSha) { throw "远端 main 与本地 HEAD 不一致" }
Write-Output "GitHub main verified: $localSha"
```

Expected: 输出 `GitHub main verified: <SHA>`，确认服务器随后可用 `bash server-update.sh` 拉取此版本。
