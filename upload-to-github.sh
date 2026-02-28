#!/bin/bash

# LED Trade Website - GitHub 上传脚本
# 使用方法: ./upload-to-github.sh

set -e

echo "🚀 准备上传到 GitHub..."
echo ""

# 检查是否已安装 git
if ! command -v git &> /dev/null; then
    echo "❌ 未检测到 Git，请先安装 Git"
    echo "访问: https://git-scm.com/downloads"
    exit 1
fi

echo "✓ Git 版本: $(git --version)"
echo ""

# 检查是否已初始化 git
if [ ! -d .git ]; then
    echo "📦 初始化 Git 仓库..."
    git init
    echo "✓ Git 仓库已初始化"
else
    echo "✓ Git 仓库已存在"
fi

echo ""

# 检查 .gitignore
if [ ! -f .gitignore ]; then
    echo "⚠️  未找到 .gitignore 文件"
    exit 1
fi

echo "📝 检查要提交的文件..."
git status
echo ""

# 询问是否继续
read -p "是否继续提交这些文件？(y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 已取消"
    exit 1
fi

# 添加文件
echo "📦 添加文件到 Git..."
git add .

# 提交
echo ""
read -p "请输入提交信息 (默认: Initial commit): " commit_message
commit_message=${commit_message:-"Initial commit: LED Trade Website v1.0.0"}

git commit -m "$commit_message"
echo "✓ 已提交到本地仓库"
echo ""

# 检查是否已配置远程仓库
if git remote | grep -q origin; then
    echo "✓ 远程仓库已配置"
    remote_url=$(git remote get-url origin)
    echo "  URL: $remote_url"
    echo ""
    
    # 推送
    echo "🚀 推送到 GitHub..."
    git push -u origin main || git push -u origin master
    
    echo ""
    echo "✅ 上传成功！"
    echo ""
    echo "🌐 访问你的仓库: $remote_url"
else
    echo "⚠️  未配置远程仓库"
    echo ""
    echo "请按以下步骤操作："
    echo ""
    echo "1. 在 GitHub 创建新仓库"
    echo "   访问: https://github.com/new"
    echo ""
    echo "2. 复制仓库 URL，然后运行："
    echo "   git remote add origin https://github.com/YOUR_USERNAME/led-trade-website.git"
    echo ""
    echo "3. 推送代码："
    echo "   git branch -M main"
    echo "   git push -u origin main"
    echo ""
    echo "或者运行以下命令配置远程仓库："
    echo ""
    read -p "请输入 GitHub 仓库 URL (或按 Enter 跳过): " repo_url
    
    if [ -n "$repo_url" ]; then
        git remote add origin "$repo_url"
        echo "✓ 远程仓库已配置"
        echo ""
        
        # 推送
        echo "🚀 推送到 GitHub..."
        git branch -M main
        git push -u origin main
        
        echo ""
        echo "✅ 上传成功！"
        echo ""
        echo "🌐 访问你的仓库: $repo_url"
    else
        echo ""
        echo "请手动配置远程仓库后再推送"
    fi
fi

echo ""
echo "📖 详细指南请查看: GITHUB-GUIDE.md"
