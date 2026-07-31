# 产品详情缩略图图库恢复实施计划

> **供智能执行者使用：** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans`，逐项执行本计划。所有步骤使用复选框跟踪。

**目标：** 恢复产品详情主图下方的缩略图列表，并保留图片、MP4、WebM、选中高亮及点击切换功能。

**架构：** 继续使用 `ProductDetail.vue` 已有的 `images` 计算属性作为唯一图库数据源，不新增状态或接口。通过一个聚焦的 Node 源码回归测试锁定模板绑定，生产构建负责验证 Vue 模板可编译。

**技术栈：** Vue 3、Vite、Node.js 内置测试运行器 `node:test`、`node:assert/strict`

## 全局约束

- 只修复产品详情缩略图绑定，不恢复整个 7 月 31 日提交。
- 不修改产品数据、API、数据库、后台上传流程或主图布局。
- 缩略图仅在媒体数量大于 1 时显示。
- 图片、MP4 和 WebM 缩略图必须继续受支持。
- 桌面和移动端继续使用现有 `.thumbnail-btn` 样式及横向滚动布局。

---

### 任务 1：恢复产品详情缩略图绑定

**文件：**

- 新建：`test/productDetailGallery.test.js`
- 修改：`src/views/ProductDetail.vue:50-56`

**接口：**

- 输入：`ProductDetail.vue` 已有的 `images: ComputedRef<string[]>` 和 `currentImage: Ref<string>`。
- 输出：使用 `images` 渲染的 `.thumbnail-btn` 列表；点击按钮把对应媒体 URL 写入 `currentImage`。
- 不新增模块导出、组件属性、事件或 API。

- [ ] **步骤 1：编写失败的回归测试**

新建 `test/productDetailGallery.test.js`：

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync(
  new URL('../src/views/ProductDetail.vue', import.meta.url),
  'utf8'
)

test('product detail renders selectable thumbnails from the existing images source', () => {
  assert.match(source, /<div class="thumbnails" v-if="images\.length > 1">/)
  assert.match(source, /v-for="\(img, index\) in images"/)
  assert.match(source, /:class="\['thumbnail-btn', \{ active: currentImage === img \}\]"/)
  assert.match(source, /@click="currentImage = img"/)
  assert.doesNotMatch(source, /\bgalleryImages\b/)
  assert.doesNotMatch(source, /['"]thumb-btn['"]/)
})

test('product detail keeps image and video thumbnail rendering', () => {
  assert.match(source, /img\.toLowerCase\(\)\.endsWith\('\.mp4'\)/)
  assert.match(source, /img\.toLowerCase\(\)\.endsWith\('\.webm'\)/)
  assert.match(source, /<video v-if="img &&/)
  assert.match(source, /<img v-else :src="img"/)
})
```

- [ ] **步骤 2：运行聚焦测试并确认按预期失败**

运行：

```bash
node --test test/productDetailGallery.test.js
```

预期：第一个测试失败，失败信息指出模板中不存在 `v-for="(img, index) in images"`；第二个测试通过。这证明测试能够捕获当前缩略图缺失问题。

- [ ] **步骤 3：实施最小模板修复**

把 `src/views/ProductDetail.vue` 的缩略图区域改为：

```vue
<div class="thumbnails" v-if="images.length > 1">
  <button v-for="(img, index) in images" :key="index"
      :class="['thumbnail-btn', { active: currentImage === img }]"
      @click="currentImage = img">
      <video v-if="img && (img.toLowerCase().endsWith('.mp4') || img.toLowerCase().endsWith('.webm'))" :src="img" style="width:100%;height:100%;object-fit:cover;" preload="metadata"></video>
      <img v-else :src="img" :alt="`Product image ${index + 1}`" />
    </button>
</div>
```

- [ ] **步骤 4：重新运行聚焦测试并确认通过**

运行：

```bash
node --test test/productDetailGallery.test.js
```

预期：2 个测试全部通过，0 个失败。

- [ ] **步骤 5：运行完整测试套件**

运行：

```bash
npm test
```

预期：所有测试通过，0 个失败。

- [ ] **步骤 6：运行生产构建**

运行：

```bash
npm run build
```

预期：Vite 退出码为 0，并生成 `dist/index.html`；允许现有 chunk-size 警告，但不允许模板编译错误或缺失模块错误。

- [ ] **步骤 7：检查变更范围并提交**

运行：

```bash
git diff --check
git diff -- src/views/ProductDetail.vue test/productDetailGallery.test.js
git add src/views/ProductDetail.vue test/productDetailGallery.test.js docs/superpowers/plans/2026-07-31-product-detail-thumbnail-gallery.md
git commit -m "fix: restore product detail thumbnails"
```

预期：源码只包含两处模板绑定修复；测试仅覆盖图库绑定和图片/视频分支；提交成功。
