# 方案一：PM2 + Nginx 部署指南

**适用：** Ubuntu 20.04 / 22.04，有 sudo 权限的用户

---

## 首次部署（一条命令搞定）

在服务器终端运行：
```bash
curl -fsSL https://raw.githubusercontent.com/jameson99799/steel-trader-website/master/server-setup.sh -o server-setup.sh && bash server-setup.sh
```

脚本自动完成：安装 Node.js 20 → Git → Nginx → PM2 → 克隆代码 → 构建 → 配置 Nginx → 启动

---

## 完成后

- 网站：http://43.159.129.164 或 http://www.sunseasteel.com
- 后台：http://43.159.129.164/admin/login
- 账号：admin / admin123 **请立即修改密码**

---

## 日常更新代码

**第一步（本地电脑）** — 推送到 GitHub：
```bash
git add -A && git commit -m "你的修改说明" && git push origin master
```

**第二步（服务器）** — FinalShell 终端：
```bash
cd /www/wwwroot/steel-trader && bash server-update.sh
```

---

## 常用 PM2 命令

```bash
pm2 status                  # 查看运行状态
pm2 logs led-trade          # 实时日志
pm2 logs led-trade --lines 50  # 最近50行日志
pm2 restart led-trade       # 重启服务
pm2 stop led-trade          # 停止服务
pm2 start led-trade         # 启动服务
```

---

## 常用 Nginx 命令

```bash
sudo nginx -t               # 测试配置是否正确
sudo systemctl reload nginx # 重新加载配置
sudo systemctl restart nginx # 完全重启
sudo systemctl status nginx # 查看状态
sudo tail -f /var/log/nginx/error.log # 查看错误日志
```

---

## 文件位置

| 内容 | 路径 |
|------|------|
| 项目代码 | /www/wwwroot/steel-trader/ |
| 数据库 | /www/wwwroot/steel-trader/data/database.db |
| 上传图片 | /www/wwwroot/steel-trader/uploads/ |
| 日志 | /www/wwwroot/steel-trader/logs/ |
| Nginx 配置 | /etc/nginx/sites-available/led-trade |

---

## 排错

**网站打不开？**
```bash
pm2 status                   # 检查 PM2 是否运行
pm2 logs led-trade --lines 20  # 看有没有报错
sudo systemctl status nginx  # Nginx 是否运行
```

**Nginx 报 502？** → PM2 没启动，运行 `pm2 start led-trade`

**看到 "Welcome to nginx"？** → 运行：
```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo systemctl reload nginx
```
