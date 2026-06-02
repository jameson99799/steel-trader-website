# SunSea Steel External API — 完整使用指南

> 此文档面向 AI 系统和开发者，涵盖所有 API 端点的完整使用方法和示例。
> Base URL: `https://your-domain.com/api/external`

---

## 认证方式

所有 API 请求需在 HTTP Header 中携带 API Key：

```
X-API-Key: ext_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

获取/重新生成 API Key: 在网站后台 → 设置 → 外部 API 中操作，或通过管理员接口：
- `GET /api/external/key` — 获取当前 Key（需管理员登录 Token）
- `POST /api/external/key/generate` — 重新生成 Key（需管理员登录 Token）

---

## 一、产品管理 (Products)

### 1.1 获取产品列表（支持搜索）

```
GET /api/external/products?search=PPGI&category_id=3&status=1&page=1&limit=20
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `search` | string | 搜索产品名称（中/英）和英文描述 |
| `category_id` | integer | 按分类ID筛选 |
| `status` | integer | 0=草稿，1=已发布 |
| `page` | integer | 页码，默认1 |
| `limit` | integer | 每页数量，默认50 |

**响应示例：**
```json
{
  "products": [
    {
      "id": 5,
      "name": "PPGI钢卷",
      "name_en": "PPGI Steel Coil",
      "slug": "ppgi-steel-coil-5",
      "category_id": 3,
      "description_en": "Prepainted galvanized steel...",
      "images": "/uploads/ppgi-1.webp,/uploads/ppgi-2.webp",
      "is_featured": 1,
      "status": 1,
      "created_at": "2025-12-01T10:00:00Z"
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 20
}
```

### 1.2 获取单个产品（完整数据）

```
GET /api/external/products/5
```

返回产品的所有字段，包括 `detail_content`（HTML详情页）、`specs`（JSON规格参数）、`faq_items`（JSON FAQ）。

### 1.3 创建产品

```
POST /api/external/products
Content-Type: application/json
```

```json
{
  "name": "PPGI钢卷",
  "name_en": "PPGI Steel Coil",
  "category_id": 3,
  "description": "预涂层镀锌钢卷，颜色可定制",
  "description_en": "Prepainted galvanized steel coil with custom RAL colors",
  "specs": "[{\"name\":\"Thickness\",\"value\":\"0.12-1.2mm\"},{\"name\":\"Width\",\"value\":\"600-1250mm\"}]",
  "detail_content": "<style>...</style><div class='hero'>...</div>...",
  "images": "/uploads/ppgi-main.webp",
  "is_featured": 1,
  "sort_order": 10,
  "status": 1,
  "seo_title": "PPGI Steel Coil | SunSea Steel",
  "seo_description": "Premium PPGI coils with custom colors...",
  "seo_keywords": "PPGI, prepainted, steel coil",
  "faq_items": "[{\"question\":\"What is MOQ?\",\"answer\":\"25MT per spec\"}]"
}
```

**必填字段：** `name` 或 `name_en`（至少一个）

### 1.4 更新产品

```
PUT /api/external/products/5
Content-Type: application/json
```

只传需要更新的字段：
```json
{
  "name_en": "New PPGI Steel Coil Name",
  "status": 0
}
```

### 1.5 删除产品

```
DELETE /api/external/products/5
```

---

## 二、文章/新闻管理 (News)

### 2.1 获取文章列表（支持搜索）

```
GET /api/external/news?search=steel&status=1&page=1&limit=20
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `search` | string | 搜索文章标题（中/英）和英文摘要 |
| `status` | integer | 0=草稿，1=已发布 |
| `page` | integer | 页码，默认1 |
| `limit` | integer | 每页数量，默认50 |

**响应字段：** `id, title, title_en, slug, summary_en, cover_image, status, created_at`

### 2.2 获取单篇文章

```
GET /api/external/news/10
```

返回完整文章数据，包括 `content`（HTML正文）。

### 2.3 创建文章

```
POST /api/external/news
Content-Type: application/json
```

```json
{
  "title": "钢材市场分析",
  "title_en": "Steel Market Analysis 2025",
  "summary": "中文摘要",
  "summary_en": "English summary...",
  "content": "<h2>Market Overview</h2><p>...</p>",
  "cover_image": "/uploads/news-cover.webp",
  "seo_title": "Steel Market Analysis | SunSea Steel",
  "seo_description": "Comprehensive analysis of...",
  "seo_keywords": "steel market, price trend",
  "status": 1,
  "render_mode": "direct"
}
```

**必填字段：** `title` 或 `title_en`
**render_mode：** `direct`（默认，HTML直接渲染，SEO最优）或 `iframe`（独立iframe渲染，适合有自定义`<style>`标签的内容）

### 2.4 更新文章

```
PUT /api/external/news/10
```

只传需要更新的字段。

### 2.5 删除文章

```
DELETE /api/external/news/10
```

---

## 三、邮件模板管理 (Email Templates)

### 3.1 获取模板列表（支持搜索）

```
GET /api/external/templates?search=cold email&page=1&limit=20
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `search` | string | 搜索模板名称、备注、邮件主题 |
| `page` | integer | 页码，默认1 |
| `limit` | integer | 每页数量，默认50 |

**响应字段：** `id, name, subject, note, template_type, is_default, created_at, updated_at`
> 注意：列表不返回 `html_body`，需通过 GET /:id 获取

### 3.2 获取单个模板（含完整HTML）

```
GET /api/external/templates/8
```

返回所有字段，包括 `html_body`（邮件正文HTML）。

### 3.3 创建模板

```
POST /api/external/templates
Content-Type: application/json
```

```json
{
  "name": "Product Launch - English",
  "subject": "Introducing Our New Steel Products | FADA STEEL",
  "html_body": "<div style='max-width:600px;margin:0 auto;...'>...</div>",
  "note": "新产品发布英文邮件",
  "template_type": "html"
}
```

**必填字段：** `name`, `html_body`
**template_type：** `html`（推荐，支持完整内联样式）或 `rich`（富文本编辑器格式）

### 3.4 更新模板

```
PUT /api/external/templates/8
```

只传需要更新的字段。

### 3.5 删除模板

```
DELETE /api/external/templates/8
```

---

## 四、模板变量说明

所有模板中可使用以下变量，系统会在发送时自动替换：

| 变量 | 说明 | 示例值 |
|------|------|--------|
| `{{name}}` | 收件人姓名 | John Smith |
| `{{company}}` | 收件人公司 | ABC Trading Co. |
| `{{first_name}}` | 收件人名 | John |
| `{{last_name}}` | 收件人姓 | Smith |
| `{{email}}` | 发件人公司邮箱 | jameson@fadasteel.com |
| `{{phone}}` | 发件人电话 | +86-13800138000 |
| `{{whatsapp_link}}` | WhatsApp点击聊天链接 | https://wa.me/8613800138000 |
| `{{company_name}}` | 发件人公司名（英文） | SunSea Steel |

---

## 五、分类ID对照表

通过 `GET /api/external/docs` 可动态获取最新分类列表。

---

## 六、内容生成规范

### 6.1 图片处理规则

- **占位图片**：使用 `data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7`
- **替换提示**：在占位图后添加 `<span class="replace-tip">📷 请上传XXX图片</span>`
- 管理后台会自动隐藏`.replace-tip`，admin编辑时显示为黄色提示，点击可上传

### 6.2 邮件模板最佳实践

- 使用内联样式（不用 `<style>` 块），确保跨邮件客户端兼容
- 最大宽度 600px + `margin:0 auto` 居中
- 复杂布局使用 `<table>` 而非 `<div>`（兼容Outlook）
- 文字+产品信息混合，避免纯图片邮件（防垃圾邮件过滤器）
- 必须包含标准签名块（参见模板示例）
- 不要使用JavaScript或外部CSS
- 图片不要使用点击放大功能（邮件客户端不支持JS）

### 6.3 产品详情页结构（detail_content）

完整HTML页面，推荐包含：
1. `<style>` — CSS变量和样式定义
2. Hero Banner — 渐变背景+产品标题
3. 产品概览 — 左文右图布局
4. 技术规格表 — 参数表格
5. 应用场景 — 卡片网格
6. 优势介绍 — 图标卡片
7. FAQ — 问答卡片
8. CTA — 询价按钮，使用 `{{email}}` 和 `{{whatsapp_link}}`

### 6.4 标准邮件签名格式

```html
<div style="margin-top:30px;padding-top:20px;border-top:2px solid #e0e6ed;font-family:Arial,sans-serif;font-size:13px;color:#555;line-height:1.8">
  <p style="margin:0 0 4px"><strong>Best Regards</strong></p>
  <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:#1f4e79">Mr Jameson / Sales Manager / International Dept.</p>
  <p style="margin:0 0 4px">📱 Mobile / WhatsApp / Wechat: <a href="{{whatsapp_link}}" style="color:#25d366;text-decoration:none">{{phone}}</a></p>
  <p style="margin:0 0 12px">📧 Email: <a href="mailto:{{email}}" style="color:#0563c1;text-decoration:none">{{email}}</a></p>
  <p style="margin:0;font-weight:700;color:#1f4e79;font-size:13px">SHANDONG FADA STEEL CO., LTD</p>
  <p style="margin:0;font-size:12px;color:#777">SHANDONG YANGGU NEW GLOBAL STEEL CO., LTD</p>
  <p style="margin:0;font-size:12px;color:#777">FADA STEEL PTE. LTD. (SINGAPORE BRANCH)</p>
  <p style="margin:4px 0 0;font-size:12px;color:#777">📍 ADD: YANGGU, LIAOCHENG CITY, SHANDONG PROVINCE, CHINA</p>
  <p style="margin:2px 0 0">🌐 <a href="https://www.fadasteel.com" style="color:#0563c1;text-decoration:none;font-weight:600">WWW.FADASTEEL.COM</a></p>
</div>
```

---

## 七、完整请求示例 (cURL)

### 搜索产品

```bash
curl -H "X-API-Key: ext_xxx" "https://your-domain.com/api/external/products?search=PPGI&status=1"
```

### 获取单个产品

```bash
curl -H "X-API-Key: ext_xxx" "https://your-domain.com/api/external/products/5"
```

### 创建邮件模板

```bash
curl -X POST -H "X-API-Key: ext_xxx" -H "Content-Type: application/json" \
  -d '{"name":"Test Template","subject":"Test","html_body":"<p>Hello {{name}}</p>","template_type":"html"}' \
  "https://your-domain.com/api/external/templates"
```

### 搜索文章

```bash
curl -H "X-API-Key: ext_xxx" "https://your-domain.com/api/external/news?search=market"
```

### 更新产品

```bash
curl -X PUT -H "X-API-Key: ext_xxx" -H "Content-Type: application/json" \
  -d '{"name_en":"Updated Name","status":1}' \
  "https://your-domain.com/api/external/products/5"
```

### 删除模板

```bash
curl -X DELETE -H "X-API-Key: ext_xxx" "https://your-domain.com/api/external/templates/8"
```

---

## 八、API 端点速查表

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/external/products` | 产品列表+搜索 |
| GET | `/api/external/products/:id` | 单个产品详情 |
| POST | `/api/external/products` | 创建产品 |
| PUT | `/api/external/products/:id` | 更新产品 |
| DELETE | `/api/external/products/:id` | 删除产品 |
| GET | `/api/external/news` | 文章列表+搜索 |
| GET | `/api/external/news/:id` | 单篇文章详情 |
| POST | `/api/external/news` | 创建文章 |
| PUT | `/api/external/news/:id` | 更新文章 |
| DELETE | `/api/external/news/:id` | 删除文章 |
| GET | `/api/external/templates` | 模板列表+搜索 |
| GET | `/api/external/templates/:id` | 单个模板详情(含html_body) |
| POST | `/api/external/templates` | 创建模板 |
| PUT | `/api/external/templates/:id` | 更新模板 |
| DELETE | `/api/external/templates/:id` | 删除模板 |
| GET | `/api/external/docs` | API 文档(JSON格式) |

---

## 九、错误码说明

| HTTP Code | 说明 |
|-----------|------|
| 200 | 成功 |
| 400 | 请求参数错误（缺少必填字段） |
| 401 | 未提供 X-API-Key |
| 403 | API Key 无效 |
| 404 | 资源不存在 |

错误响应格式：
```json
{ "error": "错误描述信息" }
```
