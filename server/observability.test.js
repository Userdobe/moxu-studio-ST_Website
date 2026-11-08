import assert from 'node:assert/strict'
import test from 'node:test'
import { buildObservabilitySnapshot } from './observability.js'

const now = Date.now()
const iso = (offset = 0) => new Date(now - offset).toISOString()

test('分类统计注册、项目、模型更新和模型调用事件', () => {
  const snapshot = buildObservabilitySnapshot({
    now,
    windowName: '24h',
    users: [
      { id: 'u1', email: 'one@example.com', username: 'one', name: 'One', credits: 87, modelConfigs: {} },
    ],
    transactions: [
      { id: 'welcome', userId: 'u1', type: 'welcome', amount: 100, balance: 100, description: '新用户体验积分', createdAt: iso() },
      { id: 'signup', userId: 'u1', type: 'user_registered', amount: 0, balance: 100, description: '用户注册', createdAt: iso() },
      { id: 'project', userId: 'u1', type: 'project_created', amount: 0, balance: 100, description: '新增画布项目', createdAt: iso() },
      { id: 'model', userId: 'u1', type: 'model_updated', amount: 0, balance: 100, description: '更新聊天模型', createdAt: iso() },
      { id: 'usage', userId: 'u1', type: 'usage', amount: -13, balance: 87, description: 'AI 剧本视频分镜推理', createdAt: iso() },
    ],
  })

  assert.deepEqual(snapshot.totals, {
    users: 1,
    activeUsers: 1,
    configuredModels: 0,
    requests: 1,
    creditsConsumed: 13,
    registrations: 1,
    projectsCreated: 1,
    modelUpdates: 1,
  })
  assert.deepEqual(snapshot.eventTotals, {
    user_registered: 1,
    project_created: 1,
    model_updated: 1,
    usage: 1,
  })
  assert.equal(snapshot.recentEvents.length, 4)
  assert.ok(snapshot.recentEvents.some((event) => event.type === 'usage' && event.creditsConsumed === 13))
})
