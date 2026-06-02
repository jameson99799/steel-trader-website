# GitHub 上传指南

## 方式一：使用命令行（推荐）

### 1. 初始化 Git 仓库

```bash
# 进入项目目录
cd led-trade-website

# 初始化 Git 仓库
git init

# 查看文件状态
git status
```

### 2. 在 GitHub 创建新仓库

1. 访问 https://github.com
2. 点击右上角的 "+" → "New repository"
3. 填写仓库信息：
   - Repository name: `led-trade-website`（或你喜欢的名字）
   - Description: `LED外贸展示网站 - B2B产品展示系统`
   - 选择 Public 或 Private
   - **不要**勾选 "Initialize this repository with a README"
4. 点击 "Create repository"

### 3. 添加文件到 Git

```bash
# 添加所有文件
git add .

# 查看将要提交的文件
git status

# 提交到本地仓库
git commit -m "Initial commit: LED Trade Website v1.0.0"
```

### 4. 连接到 GitHub 仓库

```bash
# 添加远程仓库（替换 YOUR_USERNAME 为你的 GitHub 用户名）
git remote add origin https://github.com/YOUR_USERNAME/led-trade-website.git

# 或使用 SSH（如果已配置 SSH key）
git remote add origin git@github.com:YOUR_USERNAME/led-trade-website.git

# 验证远程仓库
git remote -v
```

### 5. 推送代码到 GitHub

```bash
# 推送到 main 分支
git branch -M main
git push -u origin main
```

如果遇到认证问题，GitHub 现在需要使用 Personal Access Token：

#### 创建 Personal Access Token

1. 访问 https://github.com/settings/tokens
2. 点击 "Generate new token" → "Generate new token (classic)"
3. 设置：
   - Note: `LED Trade Website`
   - Expiration: 选择过期时间
   - 勾选 `repo` 权限
4. 点击 "Generate token"
5. **复制生成的 token**（只显示一次）

#### 使用 Token 推送

```bash
# 推送时会要求输入用户名和密码
# Username: 你的 GitHub 用户名
# Password: 粘贴刚才复制的 token

git push -u origin main
```

## 方式二：使用 GitHub Desktop（图形界面）

### 1. 下载安装 GitHub Desktop

访问 https://desktop.github.com/ 下载并安装

### 2. 登录 GitHub 账号

打开 GitHub Desktop，登录你的 GitHub 账号

### 3. 添加本地仓库

1. 点击 "File" → "Add local repository"
2. 选择项目文件夹 `led-trade-website`
3. 如果提示未初始化，点击 "create a repository"

### 4. 发布到 GitHub

1. 点击 "Publish repository"
2. 填写仓库名称和描述
3. 选择 Public 或 Private
4. 点击 "Publish repository"

## 方式三：使用 VS Code（如果你在用）

### 1. 打开源代码管理

点击左侧的源代码管理图标（或按 Ctrl+Shift+G）

### 2. 初始化仓库

点击 "Initialize Repository"

### 3. 提交更改

1. 在消息框输入：`Initial commit: LED Trade Website v1.0.0`
2. 点击 "✓" 提交

### 4. 发布到 GitHub

1. 点击 "Publish to GitHub"
2. 选择仓库名称和可见性
3. 点击 "Publish"

## 上传前检查

### 确认 .gitignore 已配置

查看 `.gitignore` 文件，确保以下内容被忽略：

```
node_modules/
dist/
data/*.db
uploads/*
!uploads/.gitkeep
.env
.env.local
*.log
.DS_Store
```

### 删除敏感信息

```bash
# 确保没有提交敏感信息
git rm --cached .env 2>/dev/null || true
git rm --cached data/*.db 2>/dev/null || true

# 如果已经提交了，需要从历史中删除
# git filter-branch --force --index-filter \
#   "git rm --cached --ignore-unmatch .env" \
#   --prune-empty --tag-name-filter cat -- --all
```

## 后续更新代码

### 日常提交流程

```bash
# 1. 查看修改的文件
git status

# 2. 添加修改的文件
git add .
# 或添加特定文件
git add src/views/Home.vue

# 3. 提交更改
git commit -m "描述你的修改"

# 4. 推送到 GitHub
git push
```

### 提交信息规范

建议使用清晰的提交信息：

```bash
# 功能添加
git commit -m "feat: 添加产品搜索功能"

# Bug 修复
git commit -m "fix: 修复图片上传失败问题"

# 文档更新
git commit -m "docs: 更新部署文档"

# 样式调整
git commit -m "style: 优化首页布局"

# 性能优化
git commit -m "perf: 优化图片加载速度"

# 重构代码
git commit -m "refactor: 重构产品列表组件"
```

## 创建 README 徽章（可选）

在 README.md 顶部添加徽章：

```markdown
# LED Trade Website

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green)
![License](https://img.shields.io/badge/license-MIT-blue)

LED外贸展示网站 - 轻量化 B2B 外贸产品展示系统
```

## 设置 GitHub Pages（可选）

如果想使用 GitHub Pages 托管静态网站：

1. 进入仓库的 Settings
2. 找到 "Pages" 选项
3. Source 选择 "GitHub Actions"
4. 创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm install
        
      - name: Build
        run: npm run build
        
      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

## 常见问题

### 1. 推送时要求输入密码

GitHub 已不支持密码认证，需要使用 Personal Access Token。

### 2. 文件太大无法推送

```bash
# 查看大文件
find . -type f -size +50M

# 如果是 node_modules，确保在 .gitignore 中
echo "node_modules/" >> .gitignore
git rm -r --cached node_modules/
git commit -m "Remove node_modules"
```

### 3. 推送被拒绝

```bash
# 先拉取远程更改
git pull origin main --rebase

# 再推送
git push origin main
```

### 4. 撤销最后一次提交

```bash
# 撤销提交但保留更改
git reset --soft HEAD~1

# 撤销提交和更改
git reset --hard HEAD~1
```

### 5. 查看提交历史

```bash
# 查看提交日志
git log

# 简洁查看
git log --oneline

# 查看图形化历史
git log --graph --oneline --all
```

## 分支管理（可选）

### 创建开发分支

```bash
# 创建并切换到开发分支
git checkout -b develop

# 推送到远程
git push -u origin develop
```

### 合并分支

```bash
# 切换到主分支
git checkout main

# 合并开发分支
git merge develop

# 推送
git push
```

## 协作开发

### 克隆仓库

```bash
# 其他人克隆你的仓库
git clone https://github.com/YOUR_USERNAME/led-trade-website.git
cd led-trade-website
npm install
```

### 拉取最新代码

```bash
# 拉取并合并
git pull

# 或分步操作
git fetch
git merge origin/main
```

## 完整示例

```bash
# 1. 初始化并提交
cd led-trade-website
git init
git add .
git commit -m "Initial commit: LED Trade Website v1.0.0"

# 2. 连接 GitHub（替换 YOUR_USERNAME）
git remote add origin https://github.com/YOUR_USERNAME/led-trade-website.git

# 3. 推送代码
git branch -M main
git push -u origin main

# 4. 后续更新
git add .
git commit -m "Update: 优化首页布局"
git push
```

## 下一步

上传成功后：

1. ✅ 在 GitHub 仓库页面查看代码
2. ✅ 编辑 README.md 添加仓库链接
3. ✅ 添加 Topics 标签（vue, nodejs, express, sqlite）
4. ✅ 设置仓库描述
5. ✅ 邀请协作者（如需要）

## 有用的 Git 命令

```bash
# 查看状态
git status

# 查看差异
git diff

# 查看远程仓库
git remote -v

# 查看分支
git branch -a

# 删除远程分支
git push origin --delete branch-name

# 标签管理
git tag v1.0.0
git push origin v1.0.0

# 查看配置
git config --list
```

## 资源链接

- Git 官方文档: https://git-scm.com/doc
- GitHub 文档: https://docs.github.com
- GitHub Desktop: https://desktop.github.com
- Git 教程: https://www.liaoxuefeng.com/wiki/896043488029600

祝你上传顺利！🎉
