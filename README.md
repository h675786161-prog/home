# Home

玲 × 七的共同生活系统。

这个仓库只放程序，不放真实生活数据。真实待办、随手记、日记和登录信息保存在 Supabase 中，密钥只通过环境变量或部署平台 Secret 注入。

## 第一阶段目标

- 手机优先的 PWA，可添加到主屏幕
- 待办与随手记
- 没接数据库时也能用本地 Demo 模式
- Supabase 数据结构与 RLS
- MCP 服务骨架，让 ChatGPT 以后能读写同一份数据
- GitHub Pages 自动部署前端

## 目录

```text
apps/web/       PWA 前端
services/mcp/   MCP 服务
supabase/       数据库迁移
docs/           架构与部署说明
```

## 本地启动

需要 Node.js 20+。

```bash
npm install
npm run dev:web
```

前端默认使用 Demo 模式，数据只保存在当前浏览器的 localStorage 中。

接入 Supabase 时复制 `.env.example` 中的前端变量到 `apps/web/.env.local`。

## 安全原则

- 不提交 `.env`、Token、API Key、真实数据库文件
- 浏览器只使用 Supabase publishable key，不使用 service role key
- 数据表启用 RLS，每个用户只能访问自己的行
- MCP 的正式公网版本必须完成 OAuth 后再接入真实数据

详细说明见 `docs/ARCHITECTURE.md`。
