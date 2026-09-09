# Architecture

## 核心原则

Home 的源码可以公开，但用户数据必须私有。

```text
手机 / PWA ─────┐
                ├─ Supabase Auth + Postgres + RLS
ChatGPT ─ MCP ──┘
```

前端和 MCP 都访问同一份数据库，因此在 App 勾掉的任务，ChatGPT 再查询时也会看到已完成状态。

## 为什么第一版不自建 REST API

Supabase 已提供浏览器客户端、认证、Postgres、RLS 和实时能力。第一版直接使用这些能力，减少一个需要长期维护的后端。

如果以后出现复杂事务、批处理或跨服务编排，再单独增加业务 API。

## 前端

`apps/web` 是 React + Vite PWA。

没有 Supabase 环境变量时进入 Demo 模式，只使用浏览器 localStorage。这样仓库第一次部署后就能直接打开和体验，不需要先配数据库。

配置 Supabase 后，登录账户并通过 RLS 访问自己的数据。

## 数据库

`supabase/migrations/0001_init.sql` 创建：

- `tasks`
- `notes`
- `journal_entries`

所有表都启用 RLS，策略以 `auth.uid() = user_id` 为边界。

## MCP

`services/mcp` 使用 MCP TypeScript SDK v2 和 Streamable HTTP。

当前版本已经定义读取和写入工具，但公网真实数据接入仍有一道安全闸：默认 `MCP_ALLOW_NO_AUTH=false`，没有认证时服务拒绝 MCP 请求。

正式接 ChatGPT 时计划使用 Supabase Auth 的 OAuth 2.1 Server：

1. ChatGPT 通过 MCP 的 OAuth 流程取得用户访问令牌。
2. MCP 服务验证并转发该用户令牌。
3. Supabase RLS 继续决定它能访问哪些行。
4. MCP 不需要 service role key，也不会绕过 RLS。

这样 ChatGPT 和 PWA 都以同一个用户身份访问 Home。

## 部署

### PWA

GitHub Actions 构建 `apps/web` 并发布到 GitHub Pages。公共仓库使用 GitHub-hosted runner 不消耗私仓 Actions 分钟额度。

### MCP

MCP 需要长期在线的 HTTPS 服务，不能部署在 GitHub Pages。部署平台暂不锁死，等 OAuth 和 Supabase 项目确定后再选最省事的常驻方案。
