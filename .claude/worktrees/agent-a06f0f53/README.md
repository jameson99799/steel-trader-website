# LED Trade Website

LED外贸展示网站 - 轻量化 B2B 外贸产品展示网站

## 技术栈

- 前端：Vue 3 + Vue Router 4 + Pinia + Vite 5
- 后端：Node.js + Express
- 数据库：SQLite (sql.js)
- 认证：JWT
- 文件上传：Multer

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式（同时启动前后端）
npm run dev

# 仅启动后端
npm run dev:server

# 仅启动前端
npm run dev:client

# 构建生产版本
npm run build

# 生产环境运行
npm run start
```

## 访问地址

- 前台：http://localhost:3000
- 后台：http://localhost:3000/admin/login
- API：http://localhost:3001/api

## 默认管理员账号

- 用户名：admin
- 密码：admin123

## 功能特性

### 前台
- 首页展示（Hero区域、推荐产品、分类展示、企业优势）
- 产品中心（三级分类导航、产品列表）
- 产品详情（多图展示、规格参数、询盘功能）
- 关于我们
- 联系我们（询盘表单）
- 中英文切换

### 后台
- 控制台（数据统计、最新询盘）
- 首页内容管理
- 分类管理（三级分类）
- 商品管理（多图上传、规格参数）
- 询盘管理
- 公司信息管理
- 系统设置（修改密码）

## 图片上传建议

### 公司信息
- **Logo**: 200×60px，PNG/SVG格式，透明背景
- **Favicon**: 32×32px 或 64×64px，ICO/PNG格式
- **关于我们图片**: 800×600px，JPG/PNG格式

### 分类管理
- **分类图片**: 400×300px，JPG/PNG格式

### 商品管理
- **商品图片**: 800×800px，JPG/PNG格式，支持多图上传（最多10张）

## 项目结构

```
led-trade-website/
├── data/                    # 数据库文件
├── dist/                    # 构建输出
├── public/                  # 静态资源
├── server/                  # 后端代码
│   ├── db.js               # 数据库初始化
│   ├── index.js            # 服务入口
│   ├── middleware/         # 中间件
│   └── routes/             # API 路由
├── src/                     # 前端代码
│   ├── api/                # API 封装
│   ├── components/         # 公共组件
│   ├── composables/        # 组合式函数
│   ├── router/             # 路由配置
│   ├── views/              # 页面组件
│   ├── App.vue             # 根组件
│   ├── main.js             # 入口文件
│   └── style.css           # 全局样式
├── uploads/                 # 上传文件目录
└── package.json            # 项目配置
```

## 注意事项

1. 首次运行会自动创建数据库和默认管理员账号
2. 上传的文件保存在 `uploads/` 目录
3. 数据库文件保存在 `data/` 目录
4. 修改公司名称后，网站标题会自动更新
5. 上传 Favicon 后，网站图标会自动更新
6. 支持的图片格式：JPG, PNG, GIF, WebP, SVG, ICO, BMP
7. 单个文件最大 5MB

## 生产部署

```bash
# 1. 构建前端
npm run build

# 2. 设置环境变量
export NODE_ENV=production
export PORT=3001

# 3. 启动服务
npm run start
```

生产环境下，Express 会同时提供 API 服务和静态文件服务。

## 许可证

MIT
