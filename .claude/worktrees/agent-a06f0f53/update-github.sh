#!/bin/bash

# LED Trade Website - GitHub 更新脚本
# 使用方法: ./update-github.sh "你的更新说明"

set -e

# 检查是否提供了提交信息
if [ -z "$1" ]; then
    echo "❌ 请提供更新说明"
    echo ""
    echo "使用方法:"
    echo "  ./update-github.sh \"修复了图片上传问题\""
    echo ""
    exit 1
fi

COMMIT_MESSAGE="$1"

echo "🔄 准备更新到 GitHub..."
echo ""

# 检查 Git 状态
echo "📝 检查修改的文件..."
git status
echo ""

# 询问是否继续
read -p "是否继续提交这些更改？(y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 已取消"
    exit 1
fi

# 添加所有更改
echo "📦 添加更改的文件..."
git add .

# 提交
echo "💾 提交更改..."
git commit -m "$COMMIT_MESSAGE"

# 推送到 GitHub
echo "🚀 推送到 GitHub..."
git push

echo ""
echo "✅ 更新成功！"
echo ""
echo "📝 提交信息: $COMMIT_MESSAGE"
echo "🌐 查看你的仓库: $(git remote get-url origin)"
