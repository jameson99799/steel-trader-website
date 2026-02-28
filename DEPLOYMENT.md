# 部署指南

## 部署前检查清单

### 1. 安全检查
- [ ] 修改默认管理员密码（admin/admin123）
- [ ] 设置强密码的 JWT_SECRET 环境变量
- [ ] 检查 CORS 配置（生产环境建议限制域名）
- [ ] 确保 .gitignore 已正确配置
- [ ] 不要提交 .env 文件到版本控制

### 2. 环境要求
- Node.js >= 18.0.0
- npm >= 9.0.0
- 至少 512MB 内存
- 至少 1GB 磁盘空间

### 3. 文件权限
确保以下目录有写入权限：
- `data/` - 数据库文件
- `uploads/` - 上传文件

## 部署步骤

### 方式一：传统服务器部署

#### 1. 准备服务器
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

#### 2. 上传代码
```bash
# 方式1: 使用 Git
git clone <your-repository-url>
cd led-trade-website

# 方式2: 使用 SCP/SFTP 上传整个项目文件夹
```

#### 3. 安装依赖
```bash
npm install --production
```

#### 4. 构建前端
```bash
npm run build
```

#### 5. 配置环境变量
```bash
# 创建 .env 文件
cp .env.example .env

# 编辑 .env 文件
nano .env

# 设置以下变量：
# PORT=3001
# JWT_SECRET=<生成一个随机字符串>
# NODE_ENV=production
```

生成随机 JWT_SECRET：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 6. 创建必要目录
```bash
mkdir -p data uploads
chmod 755 data uploads
```

#### 7. 启动服务

**使用 PM2（推荐）：**
```bash
# 安装 PM2
sudo npm install -g pm2

# 启动应用
pm2 start npm --name "led-trade" -- start

# 设置开机自启
pm2 startup
pm2 save

# 查看日志
pm2 logs led-trade

# 重启应用
pm2 restart led-trade

# 停止应用
pm2 stop led-trade
```

**使用 systemd：**
```bash
# 创建服务文件
sudo nano /etc/systemd/system/led-trade.service
```

内容：
```ini
[Unit]
Description=LED Trade Website
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/led-trade-website
Environment=NODE_ENV=production
Environment=PORT=3001
Environment=JWT_SECRET=your-secret-key
ExecStart=/usr/bin/node server/index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

启动服务：
```bash
sudo systemctl daemon-reload
sudo systemctl enable led-trade
sudo systemctl start led-trade
sudo systemctl status led-trade
```

#### 8. 配置 Nginx 反向代理（推荐）

安装 Nginx：
```bash
sudo apt install nginx -y
```

创建配置文件：
```bash
sudo nano /etc/nginx/sites-available/led-trade
```

内容：
```nginx
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/led-trade /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 9. 配置 SSL（推荐）

使用 Let's Encrypt：
```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

### 方式二：Docker 部署

#### 1. 创建 Dockerfile
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .
RUN npm run build

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "server/index.js"]
```

#### 2. 创建 docker-compose.yml
```yaml
version: '3.8'

services:
  led-trade:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - ./data:/app/data
      - ./uploads:/app/uploads
    restart: unless-stopped
```

#### 3. 部署
```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## 部署后配置

### 1. 首次登录
访问 `http://your-domain.com/admin/login`
- 用户名：admin
- 密码：admin123

### 2. 立即修改密码
登录后进入"系统设置" → "修改密码"

### 3. 配置公司信息
进入"公司信息"页面，填写：
- 公司名称（中英文）
- 联系方式
- 上传 Logo 和 Favicon

### 4. 配置首页内容
进入"首页内容管理"，设置：
- 标语和标题
- 统计数据

### 5. 添加分类和商品
- 先在"分类管理"中创建产品分类
- 再在"商品管理"中添加产品

## 维护和监控

### 备份数据库
```bash
# 备份数据库
cp data/database.db data/database.db.backup.$(date +%Y%m%d)

# 定期备份（添加到 crontab）
0 2 * * * cp /path/to/led-trade-website/data/database.db /path/to/backups/database.db.$(date +\%Y\%m\%d)
```

### 查看日志
```bash
# PM2
pm2 logs led-trade

# systemd
sudo journalctl -u led-trade -f

# Docker
docker-compose logs -f
```

### 更新应用
```bash
# 拉取最新代码
git pull

# 安装依赖
npm install --production

# 重新构建
npm run build

# 重启服务
pm2 restart led-trade
# 或
sudo systemctl restart led-trade
# 或
docker-compose restart
```

## 性能优化

### 1. 启用 Gzip 压缩（Nginx）
```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;
```

### 2. 配置缓存（Nginx）
```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 3. 限制上传大小
在 Nginx 配置中：
```nginx
client_max_body_size 10M;
```

## 故障排查

### 应用无法启动
1. 检查端口是否被占用：`sudo lsof -i :3001`
2. 检查日志：`pm2 logs` 或 `journalctl -u led-trade`
3. 检查文件权限：`ls -la data/ uploads/`

### 图片上传失败
1. 检查 uploads 目录权限：`chmod 755 uploads`
2. 检查磁盘空间：`df -h`
3. 检查 Nginx 上传限制

### 数据库错误
1. 检查 data 目录权限
2. 备份并删除 database.db，重启应用会自动创建新数据库

## 安全建议

1. **定期更新依赖**
   ```bash
   npm audit
   npm update
   ```

2. **配置防火墙**
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

3. **限制管理后台访问**
   在 Nginx 中添加 IP 白名单：
   ```nginx
   location /admin {
       allow 1.2.3.4;  # 你的 IP
       deny all;
       proxy_pass http://localhost:3001;
   }
   ```

4. **定期备份**
   - 数据库文件
   - 上传的图片
   - 配置文件

5. **监控日志**
   定期检查异常访问和错误日志

## 支持

如有问题，请查看：
- README.md - 基本使用说明
- PRD.md - 产品需求文档
- GitHub Issues - 提交问题
