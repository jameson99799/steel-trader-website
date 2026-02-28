# 方案二：Docker 部署指南

**适用：** 任何支持 Docker 的 Linux 服务器（Ubuntu / CentOS / Debian）

---

## 首次部署（一条命令搞定）

在服务器终端运行：
```bash
curl -fsSL https://raw.githubusercontent.com/jameson99799/steel-trader-website/master/docker-setup.sh -o docker-setup.sh && bash docker-setup.sh
```

脚本自动完成：安装 Docker → 克隆代码 → 创建 .env → 构建镜像 → 启动容器（含 Nginx）

> **首次构建约 3-5 分钟**（需要下载 Node.js 镜像并编译）

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
cd /www/wwwroot/steel-trader && bash docker-update.sh
```

更新时 Docker 会重新构建镜像并替换容器（约 2-3 分钟），期间网站短暂不可访问。

---

## 常用 Docker 命令

```bash
# 查看容器状态
docker compose ps

# 查看实时日志
docker compose logs -f

# 只看 Node.js 日志
docker compose logs -f steel-trader

# 重启所有容器
docker compose restart

# 停止所有容器
docker compose down

# 重新构建并启动
docker compose up -d --build

# 进入容器调试
docker exec -it steel-trader-app sh

# 查看磁盘占用
docker system df
```

---

## 重要：数据持久化

数据库、上传图片存储在以下位置（**容器重建后数据不丢失**）：

| 内容 | 位置 |
|------|------|
| 数据库 | /www/wwwroot/steel-trader/data/database.db |
| 上传图片 | /www/wwwroot/steel-trader/uploads/ |
| 日志 | /www/wwwroot/steel-trader/logs/ |

---

## 排错

**容器启动失败？**
```bash
docker compose logs steel-trader  # 查看具体错误
```

**端口 80 被占用？**
```bash
sudo lsof -i :80        # 查看占用进程
sudo systemctl stop nginx  # 如果系统 nginx 冲突，停掉它
docker compose up -d    # 重新启动
```

**磁盘不足？**
```bash
docker system prune -f  # 清理无用镜像和缓存
```

---

## PM2 vs Docker 对比

| 对比项 | PM2 + Nginx | Docker |
|--------|-------------|--------|
| 搭建难度 | 简单 | 更简单 |
| 更新速度 | 快（秒级） | 慢（2-3分钟重建） |
| 资源占用 | 低 | 略高 |
| 环境隔离 | 与系统共享 | 完全隔离 |
| Google SEO | 无影响 | 无影响 |
| 推荐场景 | 单台服务器 | 多台/频繁部署 |
