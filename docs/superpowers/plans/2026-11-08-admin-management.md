# 管理后台管理台实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended) or superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** 将 `/admin` 扩展为包含总览、用户管理、平台模型接入和审计日志的安全管理台。

**Architecture:** 复用现有会话和管理员邮箱白名单；后端新增 `/api/admin/users`、`/api/admin/models`、`/api/admin/audit`，使用 JSON 持久化；前端在一个 AdminDashboard 中用导航切换视图。

**Tech Stack:** Express、React、TypeScript、现有 JSON 存储和 CSS。

**Spec:** `docs/superpowers/designs/2026-11-08-admin-management.md`

## Tasks

- [x] 后端增加兼容旧数据的用户管理、平台模型目录和审计日志接口。
- [x] 前端将后台拆为总览、用户、模型、审计四个视图，并增加可调外观面板。
- [x] 增加用户搜索、编辑、冻结/恢复、密码重置和模型目录新增/启停操作。
- [x] 运行类型检查、构建和后端语法检查，验证管理员权限和敏感字段脱敏。
