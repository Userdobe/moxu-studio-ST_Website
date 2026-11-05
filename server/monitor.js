import { setTimeout as delay } from 'node:timers/promises'

const port = process.env.PORT || '3001'
const baseUrl = process.env.OBSERVABILITY_URL || `http://127.0.0.1:${port}`
const token = process.env.OBSERVABILITY_TOKEN
const windowName = process.env.OBSERVABILITY_WINDOW || '24h'
const validWindows = new Set(['1h', '24h', '7d', '30d'])

if (!token || token.length < 32) {
  throw new Error('请在后端和监控终端配置至少 32 位的 OBSERVABILITY_TOKEN')
}
if (!validWindows.has(windowName)) {
  throw new Error('OBSERVABILITY_WINDOW 仅支持 1h、24h、7d、30d')
}

const headers = { Authorization: `Bearer ${token}` }
const dateFormat = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

async function fetchSnapshot() {
  const response = await fetch(`${baseUrl}/internal/observability/usage?window=${windowName}`, { headers })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(`读取观测数据失败（HTTP ${response.status}）：${body?.error ?? response.statusText}`)
  }
  return response.json()
}

function renderDashboard(snapshot, latestEvent) {
  if (!process.stdout.isTTY) {
    process.stdout.write(`${JSON.stringify({ type: 'snapshot', ...snapshot })}\n`)
    if (latestEvent) process.stdout.write(`${JSON.stringify({ type: 'usage', ...latestEvent })}\n`)
    return
  }

  const lines = [
    '\u001b[2J\u001b[H',
    `墨序 · 后端实时用量监控    时间窗 ${snapshot.window}    更新于 ${dateFormat.format(new Date(snapshot.generatedAt))}`,
    '─'.repeat(104),
    `消耗积分 ${snapshot.totals.creditsConsumed}    调用次数 ${snapshot.totals.requests}    活跃用户 ${snapshot.totals.activeUsers} / ${snapshot.totals.users}    已配置模型 ${snapshot.totals.configuredModels}`,
    '',
    '用户用量',
    '排名  用户                         模型                         调用次数   消耗积分   当前余额   最近使用',
    ...snapshot.byUser.slice(0, 15).map((user, index) => {
      const identity = `${user.name} (${user.email})`.slice(0, 28).padEnd(28)
      const model = `${user.model?.provider ?? '未配置'} / ${user.model?.name ?? '-'}`.slice(0, 28).padEnd(28)
      const lastUsed = user.lastUsedAt ? dateFormat.format(new Date(user.lastUsedAt)) : '-'
      return `${String(index + 1).padStart(2)}    ${identity} ${model} ${String(user.requests).padStart(6)}   ${String(user.creditsConsumed).padStart(8)}   ${String(user.credits).padStart(8)}   ${lastUsed}`
    }),
    '',
    '最近消耗事件',
    ...snapshot.recentEvents.slice(0, 8).map((event) =>
      `${dateFormat.format(new Date(event.occurredAt))}  ${event.name} <${event.email}>  -${event.creditsConsumed}  ${event.description}`),
    '',
    '等待新的模型消耗事件…  按 Ctrl+C 退出。',
  ]
  process.stdout.write(lines.join('\n'))
}

async function* readSseEvents(stream) {
  const decoder = new TextDecoder()
  let buffer = ''
  for await (const chunk of stream) {
    buffer += decoder.decode(chunk, { stream: true })
    let separator = buffer.indexOf('\n\n')
    while (separator !== -1) {
      const block = buffer.slice(0, separator)
      buffer = buffer.slice(separator + 2)
      const event = block.split('\n').find((line) => line.startsWith('event: '))?.slice(7)
      const data = block.split('\n').filter((line) => line.startsWith('data: ')).map((line) => line.slice(6)).join('\n')
      if (event && data) yield { event, data: JSON.parse(data) }
      separator = buffer.indexOf('\n\n')
    }
  }
}

async function connect() {
  const url = `${baseUrl}/internal/observability/usage/events?window=${windowName}`
  const response = await fetch(url, { headers })
  if (!response.ok || !response.body) {
    const body = await response.json().catch(() => null)
    throw new Error(`连接实时观测失败（HTTP ${response.status}）：${body?.error ?? response.statusText}`)
  }

  for await (const event of readSseEvents(response.body)) {
    if (event.event === 'snapshot') {
      renderDashboard(event.data)
    } else if (event.event === 'usage') {
      renderDashboard(await fetchSnapshot(), event.data)
    }
  }
}

async function main() {
  while (true) {
    try {
      await connect()
      process.stderr.write('实时观测连接已关闭，3 秒后重连。\n')
    } catch (error) {
      process.stderr.write(`${error.message}\n`)
      if (/HTTP 401|HTTP 503/.test(error.message)) {
        process.exitCode = 1
        return
      }
    }
    await delay(3000)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
