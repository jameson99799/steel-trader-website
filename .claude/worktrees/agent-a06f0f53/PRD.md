# LED Trade Website - 产品需求文档 (PRD)

## 1. 产品概述

### 1.1 产品名称
LED Trade Website（LED外贸展示网站）

### 1.2 产品定位
轻量化 B2B 外贸产品展示网站，适用于 LED 灯具、开关插座等电子电器产品的在线展示与询盘收集。

### 1.3 目标用户
- 国内外贸企业/工厂
- 需要展示产品并收集海外客户询盘的制造商
- 中小型电子电器产品出口商

### 1.4 技术栈
| 层级 | 技术选型 |
|------|----------|
| 前端框架 | Vue 3 + Vue Router 4 + Pinia |
| 构建工具 | Vite 5 |
| 后端框架 | Node.js + Express |
| 数据库 | SQLite (sql.js) |
| 认证 | JWT (jsonwebtoken) |
| 文件上传 | Multer |

---

## 2. 功能模块

### 2.1 前台展示系统

#### 2.1.1 首页 (Home)
| 功能点 | 描述 |
|--------|------|
| Hero 区域 | 展示公司标语、主标题、副标题、统计数据（年经验/产品数/出口国家） |
| 推荐产品轮播 | 展示 4 个推荐产品，支持自动轮播和手动切换 |
| 产品分类展示 | 展示一级分类卡片，点击跳转分类产品列表 |
| 产品画廊 | 瀑布流展示 8 个产品，随机布局 |
| 企业优势 | 展示 4 个核心优势（工厂直供/品质保证/快速交货/定制服务） |

#### 2.1.2 产品中心 (Products)
| 功能点 | 描述 |
|--------|------|
| 分类导航 | 左侧树形分类导航，支持三级分类展开/折叠 |
| 产品数量统计 | 每个分类显示对应产品数量 |
| 面包屑导航 | 显示当前分类路径 |
| 产品列表 | 网格展示产品卡片（图片+名称+分类） |
| URL 参数 | 支持 `?category=id` 直接定位分类 |

#### 2.1.3 产品详情 (ProductDetail)
| 功能点 | 描述 |
|--------|------|
| 产品图片 | 主图展示 + 缩略图切换 |
| 基本信息 | 产品名称、所属分类 |
| 产品描述 | 支持中英文描述 |
| 规格参数 | 表格形式展示规格参数 |
| 询盘按钮 | 弹出询盘表单，关联当前产品 |

#### 2.1.4 关于我们 (About)
| 功能点 | 描述 |
|--------|------|
| 公司介绍 | 展示公司简介、图片 |
| 数据统计 | 年经验/产品型号/出口国家/全球客户 |
| 企业优势 | 可配置的优势列表 |
| CTA 区域 | 引导联系我们 |

#### 2.1.5 联系我们 (Contact)
| 功能点 | 描述 |
|--------|------|
| 联系方式 | 邮箱、电话、WhatsApp、微信、地址 |
| 询盘表单 | 姓名*、邮箱*、电话、公司、国家、留言 |

#### 2.1.6 多语言支持
| 功能点 | 描述 |
|--------|------|
| 语言切换 | 中文/英文切换按钮 |
| 内容本地化 | 产品名称、描述、分类名称支持中英文 |
| 界面翻译 | 所有界面文案支持中英文 |
| 语言记忆 | localStorage 保存语言偏好 |

---

### 2.2 后台管理系统

#### 2.2.1 登录认证
| 功能点 | 描述 |
|--------|------|
| 登录页面 | 用户名 + 密码登录 |
| JWT 认证 | Token 有效期 7 天 |
| 路由守卫 | 未登录自动跳转登录页 |
| 默认账号 | admin / admin123 |

#### 2.2.2 控制台 (Dashboard)
| 功能点 | 描述 |
|--------|------|
| 数据统计 | 商品总数、分类数量、询盘总数、未读询盘 |
| 最新询盘 | 展示最近 5 条询盘记录 |

#### 2.2.3 首页内容管理 (Hero)
| 字段 | 类型 | 说明 |
|------|------|------|
| tag / tag_en | 文本 | 标签文字（中/英） |
| title / title_en | 文本 | 主标题（中/英） |
| subtitle / subtitle_en | 文本 | 副标题（中/英） |
| stat1_num | 文本 | 统计数字1（如：10+） |
| stat1_label / stat1_label_en | 文本 | 统计标签1（中/英） |
| stat2_num | 文本 | 统计数字2 |
| stat2_label / stat2_label_en | 文本 | 统计标签2（中/英） |
| stat3_num | 文本 | 统计数字3 |
| stat3_label / stat3_label_en | 文本 | 统计标签3（中/英） |

#### 2.2.4 分类管理 (Categories)
| 字段 | 类型 | 说明 |
|------|------|------|
| name | 文本* | 分类名称（中文） |
| name_en | 文本 | 分类名称（英文） |
| parent_id | 整数 | 父分类ID（0为一级分类） |
| sort_order | 整数 | 排序值 |
| image | 图片 | 分类图片 |

| 功能点 | 描述 |
|--------|------|
| 树形展示 | 支持三级分类层级展示 |
| 添加子分类 | 在任意分类下添加子分类 |
| 编辑分类 | 修改分类信息和上级分类 |
| 删除保护 | 有子分类或商品时禁止删除 |

#### 2.2.5 商品管理 (Products)
| 字段 | 类型 | 说明 |
|------|------|------|
| name | 文本* | 商品名称（中文） |
| name_en | 文本 | 商品名称（英文） |
| category_id | 整数* | 所属分类 |
| description | 长文本 | 商品描述（中文） |
| description_en | 长文本 | 商品描述（英文） |
| specs | JSON | 规格参数（数组格式） |
| images | 文本 | 商品图片（逗号分隔） |
| is_featured | 整数 | 是否首页推荐（0/1） |
| sort_order | 整数 | 排序值 |
| status | 整数 | 状态（0下架/1上架） |

| 功能点 | 描述 |
|--------|------|
| 商品列表 | 表格展示，显示图片、名称、分类、推荐、状态 |
| 添加商品 | 弹窗表单，支持多图上传 |
| 规格编辑 | 可视化添加/删除规格参数 |
| 图片管理 | 支持多图上传、删除单张图片 |

#### 2.2.6 询盘管理 (Inquiries)
| 字段 | 类型 | 说明 |
|------|------|------|
| name | 文本* | 客户姓名 |
| email | 文本* | 客户邮箱 |
| phone | 文本 | 联系电话 |
| company | 文本 | 公司名称 |
| country | 文本 | 国家 |
| message | 长文本 | 留言内容 |
| product_id | 整数 | 关联商品ID |
| is_read | 整数 | 已读状态（0/1） |

| 功能点 | 描述 |
|--------|------|
| 询盘列表 | 表格展示，未读高亮显示 |
| 未读统计 | 显示未读询盘数量 |
| 查看详情 | 弹窗显示完整询盘信息 |
| 标记已读 | 查看后自动标记已读 |
| 删除询盘 | 支持删除询盘记录 |

#### 2.2.7 公司信息管理 (Company)
| 字段 | 类型 | 说明 |
|------|------|------|
| name / name_en | 文本 | 公司名称（中/英） |
| description / description_en | 长文本 | 公司简介（中/英） |
| phone | 文本 | 联系电话 |
| email | 文本 | 邮箱地址 |
| address / address_en | 文本 | 公司地址（中/英） |
| whatsapp | 文本 | WhatsApp 号码 |
| wechat | 文本 | 微信号 |
| logo | 图片 | 公司 Logo |
| favicon | 图片 | 网站图标 |
| about_image | 图片 | 关于我们页面图片 |
| advantages / advantages_en | 长文本 | 企业优势（中/英，每行一条） |

#### 2.2.8 系统设置 (Settings)
| 功能点 | 描述 |
|--------|------|
| 修改密码 | 输入原密码 + 新密码 + 确认密码 |

---

## 3. API 接口

### 3.1 认证接口 (/api/auth)
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /login | 用户登录 | 否 |
| POST | /change-password | 修改密码 | 是 |
| GET | /me | 获取当前用户 | 是 |

### 3.2 分类接口 (/api/categories)
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | / | 获取所有分类 | 否 |
| GET | /tree | 获取分类树 | 否 |
| POST | / | 创建分类 | 是 |
| PUT | /:id | 更新分类 | 是 |
| DELETE | /:id | 删除分类 | 是 |

### 3.3 商品接口 (/api/products)
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | / | 获取商品列表 | 否 |
| GET | /:id | 获取商品详情 | 否 |
| POST | / | 创建商品 | 是 |
| PUT | /:id | 更新商品 | 是 |
| DELETE | /:id | 删除商品 | 是 |

**商品列表查询参数：**
- `category_id` - 分类ID
- `featured` - 是否推荐（1）
- `status` - 状态（0/1）
- `page` - 页码（默认1）
- `limit` - 每页数量（默认20）

### 3.4 公司信息接口 (/api/company)
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | / | 获取公司信息 | 否 |
| PUT | / | 更新公司信息 | 是 |

### 3.5 询盘接口 (/api/inquiries)
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | / | 提交询盘 | 否 |
| GET | / | 获取询盘列表 | 是 |
| PUT | /:id/read | 标记已读 | 是 |
| DELETE | /:id | 删除询盘 | 是 |

### 3.6 Hero 内容接口 (/api/hero)
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | / | 获取 Hero 内容 | 否 |
| PUT | / | 更新 Hero 内容 | 是 |

---

## 4. 数据库设计

### 4.1 用户表 (users)
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### 4.2 分类表 (categories)
```sql
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  name_en TEXT,
  parent_id INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  image TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### 4.3 商品表 (products)
```sql
CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER,
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  description_en TEXT,
  specs TEXT,
  images TEXT,
  is_featured INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  status INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### 4.4 轮播图表 (banners)
```sql
CREATE TABLE banners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  image TEXT NOT NULL,
  link TEXT,
  sort_order INTEGER DEFAULT 0,
  status INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### 4.5 公司信息表 (company)
```sql
CREATE TABLE company (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  name_en TEXT,
  description TEXT,
  description_en TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  address_en TEXT,
  whatsapp TEXT,
  wechat TEXT,
  logo TEXT,
  favicon TEXT,
  about_image TEXT,
  advantages TEXT,
  advantages_en TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### 4.6 询盘表 (inquiries)
```sql
CREATE TABLE inquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  country TEXT,
  message TEXT,
  product_id INTEGER,
  is_read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### 4.7 Hero 内容表 (hero_content)
```sql
CREATE TABLE hero_content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tag TEXT,
  tag_en TEXT,
  title TEXT,
  title_en TEXT,
  subtitle TEXT,
  subtitle_en TEXT,
  stat1_num TEXT,
  stat1_label TEXT,
  stat1_label_en TEXT,
  stat2_num TEXT,
  stat2_label TEXT,
  stat2_label_en TEXT,
  stat3_num TEXT,
  stat3_label TEXT,
  stat3_label_en TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

---

## 5. 页面路由

### 5.1 前台路由
| 路径 | 组件 | 说明 |
|------|------|------|
| / | Home.vue | 首页 |
| /products | Products.vue | 产品列表 |
| /products/:id | ProductDetail.vue | 产品详情 |
| /category/:id | Category.vue | 分类页面 |
| /about | About.vue | 关于我们 |
| /contact | Contact.vue | 联系我们 |

### 5.2 后台路由
| 路径 | 组件 | 说明 |
|------|------|------|
| /admin/login | Login.vue | 登录页 |
| /admin | Layout.vue | 后台布局 |
| /admin/dashboard | Dashboard.vue | 控制台 |
| /admin/hero | Hero.vue | 首页内容管理 |
| /admin/categories | Categories.vue | 分类管理 |
| /admin/products | Products.vue | 商品管理 |
| /admin/inquiries | Inquiries.vue | 询盘管理 |
| /admin/company | Company.vue | 公司信息 |
| /admin/settings | Settings.vue | 系统设置 |

---

## 6. 部署配置

### 6.1 环境变量
| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| PORT | 3001 | 服务端口 |
| JWT_SECRET | 自动生成 | JWT 密钥 |
| NODE_ENV | development | 运行环境 |

### 6.2 资源占用
- 内存：约 50-100MB
- 磁盘：约 50MB（不含上传文件）

### 6.3 运行命令
```bash
# 开发环境
npm run dev          # 同时启动前后端
npm run dev:server   # 仅启动后端
npm run dev:client   # 仅启动前端

# 生产环境
npm run build        # 构建前端
npm run start        # 启动生产服务
```

### 6.4 访问地址
- 前端：http://localhost:3000
- 后台：http://localhost:3000/admin/login
- API：http://localhost:3001/api

---

## 7. 文件结构

```
led-trade-website/
├── data/                    # 数据目录
│   └── database.db          # SQLite 数据库文件
├── dist/                    # 构建输出目录
├── public/                  # 静态资源
├── server/                  # 后端代码
│   ├── db.js               # 数据库初始化
│   ├── index.js            # 服务入口
│   ├── middleware/         # 中间件
│   │   ├── auth.js         # JWT 认证
│   │   └── upload.js       # 文件上传
│   └── routes/             # API 路由
│       ├── auth.js         # 认证接口
│       ├── categories.js   # 分类接口
│       ├── company.js      # 公司信息接口
│       ├── hero.js         # Hero 内容接口
│       ├── inquiries.js    # 询盘接口
│       └── products.js     # 商品接口
├── src/                     # 前端代码
│   ├── api/                # API 封装
│   ├── components/         # 公共组件
│   │   ├── SiteHeader.vue  # 网站头部
│   │   └── SiteFooter.vue  # 网站底部
│   ├── composables/        # 组合式函数
│   │   ├── useLang.js      # 多语言
│   │   └── useTitle.js     # 页面标题
│   ├── router/             # 路由配置
│   ├── views/              # 页面组件
│   │   ├── admin/          # 后台页面
│   │   └── *.vue           # 前台页面
│   ├── App.vue             # 根组件
│   ├── main.js             # 入口文件
│   └── style.css           # 全局样式
├── uploads/                 # 上传文件目录
├── index.html              # HTML 模板
├── package.json            # 项目配置
└── vite.config.js          # Vite 配置
```

---

## 8. 版本信息

- 版本号：1.0.0
- 文档更新日期：2026-01-07
