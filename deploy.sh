#!/bin/bash

# LED Trade Website 部署脚本
# 使用方法: ./deploy.sh

set -e

echo "🚀 开始部署 LED Trade Website..."

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未检测到 Node.js，请先安装 Node.js"
    exit 1
fi

echo "✓ Node.js 版本: $(node --version)"

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo "❌ 未检测到 npm"
    exit 1
fi

echo "✓ npm 版本: $(npm --version)"

# 安装依赖
echo "📦 安装依赖..."
npm install --production

# 构建前端
echo "🔨 构建前端..."
npm run build

# 创建必要目录
echo "📁 创建必要目录..."
mkdir -p data uploads logs

# 检查环境变量
if [ ! -f .env ]; then
    echo "⚠️  未找到 .env 文件，从示例创建..."
    cp .env.example .env
    echo "⚠️  请编辑 .env 文件设置 JWT_SECRET"
fi

# 检查 PM2
if command -v pm2 &> /dev/null; then
    echo "🔄 使用 PM2 启动应用..."
    pm2 delete led-trade 2>/dev/null || true
    pm2 start ecosystem.config.cjs
    pm2 save
    echo "✓ 应用已启动"
    echo ""
    echo "查看日志: pm2 logs led-trade"
    echo "重启应用: pm2 restart led-trade"
    echo "停止应用: pm2 stop led-trade"
else
    echo "⚠️  未安装 PM2，使用 node 直接启动"
    echo "建议安装 PM2: npm install -g pm2"
    echo ""
    echo "启动命令: NODE_ENV=production node server/index.js"
fi

echo ""
echo "✅ 部署完成！"
echo ""
echo "📝 下一步："
echo "1. 访问 http://localhost:3001/admin/login"
echo "2. 使用默认账号登录: admin / admin123"
echo "3. 立即修改密码"
echo "4. 配置公司信息和首页内容"
echo ""
echo "📖 详细文档请查看 DEPLOYMENT.md"
