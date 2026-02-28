FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm install --production

# 复制项目文件
COPY . .

# 构建前端
RUN npm run build

# 创建必要的目录
RUN mkdir -p data uploads

# 暴露端口
EXPOSE 3001

# 设置环境变量
ENV NODE_ENV=production

# 启动应用
CMD ["node", "server/index.js"]
