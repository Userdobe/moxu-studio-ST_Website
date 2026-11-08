# 后台监控闭环实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended) or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有墨序 Studio 中补齐管理员对注册、新增项目、积分消耗、模型调用和模型配置更新的只读监控。

**Architecture:** 复用 `store.transactions` 作为事件账本，非计费事件使用 `amount: 0`，在服务端统一按时间窗口聚合为监控快照；前端继续使用 `/admin`、会话认证和现有轮询，扩展统计卡片、摘要表和事件列表。

**Tech Stack:** Node.js、Express 5、React 18、TypeScript、Vite、现有 JSON 文件持久化。

**Spec:** `docs/superpowers/designs/2026-11-08-admin-observability.md`

## Global Constraints

- 后台保持只读，不新增用户、项目、积分或模型配置管理写接口。
- API Key 只加密保存，不进入监控响应。
- 统计窗口继续支持 `1h`、`24h`、`7d`、`30d`。
- 旧 `accounts.json` 和旧交易数据必须继续可读。
- 不新增运行时依赖。

## Review Focus

- 注册欢迎积分不能被错误统计为模型消耗。
- 新增项目事件不能改变用户余额。
- 模型配置清除事件也要可见，并且不能泄露密钥。
- 空数据、旧数据和未知事件类型必须安全展示。
- 管理员权限校验必须继续在服务端执行。

## Tasks

### Task 1: 建立监控聚合的失败测试

**Files:** `server/observability.test.js`（新建）、必要时 `server/index.js` 导出纯函数。

- [x] 提取一个无副作用的快照聚合函数，输入用户与事件，输出 totals、事件类型汇总和时间序列。
- [x] 写最小 Node 测试，覆盖注册事件、新增项目、模型更新、usage 交易和 welcome 交易的分类。
- [x] 运行测试并确认在新字段实现前失败。

### Task 2: 记录后端业务事件并扩展快照

**Files:** `server/index.js`。

- [x] 新增统一 `addEvent`/交易记录辅助逻辑，确保 amount 为 0 的事件不改变积分余额。
- [x] 注册成功后记录 `user_registered`；项目创建成功后记录 `project_created`。
- [x] 模型保存和清除成功后记录 `model_updated`，只记录模型类型、服务商和模型名等非敏感信息。
- [x] 扩展 `getUsageSnapshot`，返回注册数、新增项目数、模型更新数、按事件类型汇总和最近事件。
- [x] 保持现有 usage 统计语义，不把 welcome、充值或零金额事件计入模型调用和积分消耗。
- [x] 运行失败测试，确认转绿；运行 `node --check server/index.js`。

### Task 3: 扩展后台监控界面

**Files:** `src/AdminDashboard.tsx`、`src/admin.css`。

- [x] 扩展快照类型，兼容缺少新增字段的旧响应。
- [x] 增加“新增用户”“新增项目”“模型更新”统计入口，保留现有积分消耗、模型调用、活跃用户和模型配置指标。
- [x] 将最近事件按注册、项目、模型更新、模型调用显示不同标签和金额样式。
- [x] 增加轻量用户/项目/模型摘要区域，保持只读和现有响应式布局。
- [x] 处理空状态、加载状态、错误状态和小屏布局。

### Task 4: 验证与交付

**Files:** 无新增功能文件；更新 README 时仅在确有接口变化时修改。

- [x] 运行 `node server/observability.test.js`。
- [x] 运行 `npm run lint`。
- [x] 运行 `npm run build`。
- [x] 运行 `node --check server/index.js`。
- [x] 使用本地服务验证 `/api/health` 和 `/admin` 页面仍可访问，并汇报改动与验证结果。
