# Git 日常工作流程

## 🚀 快速更新（推荐）

### 使用更新脚本

```bash
# 一键更新到 GitHub
./update-github.sh "你的更新说明"
```

**示例：**
```bash
./update-github.sh "修复了图片上传问题"
./update-github.sh "添加了产品搜索功能"
./update-github.sh "优化了首页布局"
```

## 📝 手动更新流程

### 1. 查看修改的文件

```bash
git status
```

这会显示：
- 🔴 修改的文件（红色）
- 🟢 已添加的文件（绿色）
- ⚪ 未跟踪的文件

### 2. 添加修改的文件

```bash
# 添加所有修改
git add .

# 或添加特定文件
git add src/views/Home.vue
git add server/routes/products.js
```

### 3. 提交更改

```bash
git commit -m "你的更新说明"
```

**提交信息建议：**
```bash
# 功能相关
git commit -m "feat: 添加产品搜索功能"
git commit -m "feat: 支持批量导入商品"

# Bug 修复
git commit -m "fix: 修复图片上传失败问题"
git commit -m "fix: 解决分类删除错误"

# 样式调整
git commit -m "style: 优化首页布局"
git commit -m "style: 调整移动端适配"

# 文档更新
git commit -m "docs: 更新部署文档"
git commit -m "docs: 添加 API 说明"

# 性能优化
git commit -m "perf: 优化图片加载速度"
git commit -m "perf: 减少数据库查询次数"

# 代码重构
git commit -m "refactor: 重构产品列表组件"
```

### 4. 推送到 GitHub

```bash
git push
```

## 🔄 完整示例

```bash
# 1. 查看修改
git status

# 2. 添加文件
git add .

# 3. 提交
git commit -m "fix: 修复图片上传问题"

# 4. 推送
git push
```

## 📊 查看历史

### 查看提交记录

```bash
# 详细日志
git log

# 简洁日志
git log --oneline

# 最近 5 条
git log -5

# 图形化显示
git log --graph --oneline --all
```

### 查看具体修改

```bash
# 查看未提交的修改
git diff

# 查看已添加但未提交的修改
git diff --staged

# 查看某个文件的修改
git diff src/views/Home.vue
```

## ↩️ 撤销操作

### 撤销工作区的修改

```bash
# 撤销单个文件的修改
git checkout -- src/views/Home.vue

# 撤销所有修改（危险！）
git checkout -- .
```

### 撤销已添加的文件

```bash
# 取消添加单个文件
git reset HEAD src/views/Home.vue

# 取消添加所有文件
git reset HEAD
```

### 撤销最后一次提交

```bash
# 撤销提交但保留修改
git reset --soft HEAD~1

# 撤销提交和修改（危险！）
git reset --hard HEAD~1
```

### 修改最后一次提交信息

```bash
git commit --amend -m "新的提交信息"
```

## 🌿 分支管理

### 创建和切换分支

```bash
# 创建新分支
git branch feature-search

# 切换分支
git checkout feature-search

# 创建并切换（推荐）
git checkout -b feature-search
```

### 合并分支

```bash
# 切换到主分支
git checkout main

# 合并功能分支
git merge feature-search

# 推送
git push
```

### 删除分支

```bash
# 删除本地分支
git branch -d feature-search

# 删除远程分支
git push origin --delete feature-search
```

## 🔍 常用命令

### 查看状态和信息

```bash
# 查看状态
git status

# 查看远程仓库
git remote -v

# 查看分支
git branch -a

# 查看配置
git config --list
```

### 拉取最新代码

```bash
# 拉取并合并
git pull

# 或分步操作
git fetch
git merge origin/main
```

### 暂存修改

```bash
# 暂存当前修改
git stash

# 查看暂存列表
git stash list

# 恢复暂存
git stash pop

# 删除暂存
git stash drop
```

## 🆘 常见问题

### 1. 推送被拒绝

```bash
# 先拉取远程更改
git pull --rebase

# 再推送
git push
```

### 2. 合并冲突

```bash
# 1. 拉取代码时出现冲突
git pull

# 2. 手动解决冲突文件中的标记
# <<<<<<< HEAD
# 你的修改
# =======
# 远程的修改
# >>>>>>> branch-name

# 3. 标记为已解决
git add .

# 4. 完成合并
git commit -m "解决合并冲突"

# 5. 推送
git push
```

### 3. 忘记添加文件

```bash
# 添加遗漏的文件
git add forgotten-file.js

# 修改最后一次提交
git commit --amend --no-edit
```

### 4. 提交了敏感信息

```bash
# 从最后一次提交中删除文件
git rm --cached .env
git commit --amend -m "移除敏感文件"

# 强制推送（危险！）
git push --force
```

### 5. 查看某个文件的历史

```bash
# 查看文件的修改历史
git log -- src/views/Home.vue

# 查看文件的每次修改内容
git log -p -- src/views/Home.vue
```

## 📋 工作流程建议

### 日常开发流程

```bash
# 1. 开始工作前，拉取最新代码
git pull

# 2. 创建功能分支（可选）
git checkout -b feature-new-function

# 3. 进行开发...

# 4. 提交更改
git add .
git commit -m "feat: 添加新功能"

# 5. 推送到 GitHub
git push

# 6. 如果使用分支，合并到主分支
git checkout main
git merge feature-new-function
git push
```

### 团队协作流程

```bash
# 1. 克隆仓库
git clone https://github.com/username/led-trade-website.git

# 2. 创建自己的分支
git checkout -b dev-yourname

# 3. 开发并提交
git add .
git commit -m "你的修改"

# 4. 推送到远程
git push -u origin dev-yourname

# 5. 在 GitHub 上创建 Pull Request

# 6. 代码审查通过后合并
```

## 🎯 最佳实践

1. **频繁提交**
   - 每完成一个小功能就提交
   - 不要积累太多修改

2. **清晰的提交信息**
   - 简短明了
   - 说明做了什么
   - 使用统一的格式

3. **推送前先拉取**
   - 避免冲突
   - 保持代码最新

4. **使用分支**
   - 主分支保持稳定
   - 新功能在分支开发

5. **定期备份**
   - 推送到 GitHub 就是备份
   - 重要节点打标签

## 🏷️ 版本标签

### 创建标签

```bash
# 创建标签
git tag v1.0.0

# 创建带说明的标签
git tag -a v1.0.0 -m "版本 1.0.0 发布"

# 推送标签
git push origin v1.0.0

# 推送所有标签
git push --tags
```

### 查看标签

```bash
# 列出所有标签
git tag

# 查看标签信息
git show v1.0.0
```

## 📚 快速参考

```bash
# 初始化
git init

# 克隆
git clone <url>

# 状态
git status

# 添加
git add .

# 提交
git commit -m "message"

# 推送
git push

# 拉取
git pull

# 分支
git branch
git checkout -b <branch>

# 合并
git merge <branch>

# 日志
git log

# 差异
git diff

# 撤销
git reset
git checkout --

# 暂存
git stash
```

## 🔗 有用的资源

- Git 官方文档: https://git-scm.com/doc
- GitHub 文档: https://docs.github.com
- Git 教程: https://www.liaoxuefeng.com/wiki/896043488029600
- Git 速查表: https://training.github.com/downloads/zh_CN/github-git-cheat-sheet/

---

💡 **提示：** 使用 `./update-github.sh "更新说明"` 可以一键完成所有操作！
