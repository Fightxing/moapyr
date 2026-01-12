# MOAPYR 资源站部署指南

本文档将指导您如何将 MOAPYR 项目完整部署到 Cloudflare 平台。

## 前置准备

在开始之前，请确保您已满足以下条件：

1.  **Cloudflare 账号**: 拥有一个有效的 Cloudflare 账号。
2.  **Node.js**: 本地已安装 Node.js (建议 v18 或更高版本)。
3.  **Wrangler CLI**: Cloudflare 的命令行工具。如果没有安装，请运行：
    ```bash
    npm install -g wrangler
    ```
4.  **登录 Wrangler**:
    在终端运行以下命令并按提示在浏览器中登录：
    ```bash
    wrangler login
    ```

---

## 第一步：后端部署 (Cloudflare Workers)

后端负责处理 API 请求、数据库读写以及生成文件上传/下载的签名链接。

### 1. 进入后端目录
```bash
cd backend
```

### 2. 创建 D1 数据库
Cloudflare D1 是一个 Serverless SQL 数据库。
运行以下命令创建数据库：
```bash
npx wrangler d1 create moapyr-db
```
**关键步骤**：命令执行成功后，控制台会输出一段 `[[d1_databases]]` 配置。请复制其中的 `database_id`，并打开 `backend/wrangler.toml` 文件，替换掉默认的 `database_id`。

### 3. 初始化数据库表结构
将定义好的表结构写入数据库：
```bash
npx wrangler d1 execute moapyr-db --file=./schema.sql --remote
```

### 4. 创建 R2 存储桶
Cloudflare R2 用于存储大文件（模组文件）。
```bash
npx wrangler r2 bucket create moapyr-files
```
*注意：请确保 `backend/wrangler.toml` 中的 `bucket_name` 与您创建的名称一致（默认为 `moapyr-files`）。*

### 5. 配置敏感信息 (Secrets)
由于 Worker 原生环境不支持为客户端生成“预签名 URL” (Presigned URL)，我们需要使用 AWS SDK，这需要 R2 的 S3 兼容凭证。

1.  前往 [Cloudflare R2 仪表盘](https://dash.cloudflare.com/?to=/:account/r2/api-tokens)。
2.  点击 **"Manage R2 API Tokens"** -> **"Create API token"**。
3.  权限选择 **"Object Read & Write"** (读写权限)。
4.  创建后，记录下 **Access Key ID**, **Secret Access Key** 和 **Endpoint** 中的 **Account ID**。

回到终端，依次执行以下命令（按提示输入对应的值）：

```bash
# 设置 R2 账户 ID (通常是 Endpoint URL 中 https://<ACCOUNT_ID>.r2... 的部分)
npx wrangler secret put R2_ACCOUNT_ID

# 设置 Access Key ID
npx wrangler secret put R2_ACCESS_KEY_ID

# 设置 Secret Access Key
npx wrangler secret put R2_SECRET_ACCESS_KEY

# 设置管理员后台的访问密钥 (自定义一个密码)
npx wrangler secret put AUTH_SECRET
```

### 6. 部署 Worker
```bash
npm run deploy
```
部署成功后，控制台会输出 Worker 的访问地址，例如：`https://backend.your-name.workers.dev`。**请记下这个地址，前端部署时需要用到。**

---

## 第二步：前端部署 (Cloudflare Pages)

前端是用户交互的界面，我们将使用 Cloudflare Pages 进行托管。

### 1. 进入前端目录
```bash
cd ../frontend
```

### 2. 设置生产环境 API 地址
您有两种方式配置 API 地址：

**方法 A：构建时注入 (推荐)**
在构建命令中传入环境变量：
*(Windows 用户建议使用 cross-env 或在 Pages 后台配置，这里演示手动修改代码的最简方式)*

打开 `frontend/src/api.ts`，找到：
```typescript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787/api';
```
确保它能读取到环境变量。

### 3. 构建项目
运行构建命令，生成静态文件：
```bash
npm run build
```
这将在 `frontend/dist` 目录下生成最终的网页文件。

### 4. 发布到 Cloudflare Pages
您可以直接使用 Wrangler 将 `dist` 目录上传发布：

```bash
npx wrangler pages deploy dist --project-name moapyr-frontend
```

**或者 (推荐)**：
在 Cloudflare Dashboard 中连接您的 GitHub/GitLab 仓库，创建一个新的 Pages 项目。
*   **构建命令**: `npm run build`
*   **构建输出目录**: `dist`
*   **环境变量**: 在 Pages 设置中添加 `VITE_API_URL`，值为您第一步中获得的后端地址（注意要带上 `/api` 后缀，例如 `https://backend.your-name.workers.dev/api`）。

---

## 验证部署

1.  打开前端部署后的网址（Pages 提供的域名）。
2.  尝试使用搜索功能，确认没有报错（此时列表为空）。
3.  访问 `/upload` 页面，尝试上传一个小文件。
    *   如果成功，应该会提示“上传成功”。
4.  访问 `/admin` 页面，输入您设置的 `AUTH_SECRET`。
    *   您应该能看到刚才上传的待审核资源。
    *   点击“通过”，然后回到首页，应该能搜到该资源。

## 故障排查

*   **上传失败**: 检查 `R2_ACCOUNT_ID` 等 Secrets 是否正确设置。检查浏览器控制台的网络请求（CORS 错误通常意味着后端地址配错，或者 Worker 挂了）。
*   **数据库报错**: 确认 `wrangler.toml` 中的 `database_id` 是否正确替换。

祝您的项目运行顺利！
