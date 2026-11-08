const windows = {
  '1h': { durationMs: 60 * 60 * 1000, bucketMs: 60 * 1000 },
  '24h': { durationMs: 24 * 60 * 60 * 1000, bucketMs: 15 * 60 * 1000 },
  '7d': { durationMs: 7 * 24 * 60 * 60 * 1000, bucketMs: 60 * 60 * 1000 },
  '30d': { durationMs: 30 * 24 * 60 * 60 * 1000, bucketMs: 6 * 60 * 60 * 1000 },
}

const trackedTypes = new Set(['user_registered', 'project_created', 'model_updated', 'usage'])

export function buildObservabilitySnapshot({ now = Date.now(), windowName = '24h', users, transactions, modelConfigFor }) {
  const { durationMs, bucketMs } = windows[windowName]
  const windowStart = now - durationMs
  const usersById = new Map(users.map((user) => [user.id, user]))
  const events = transactions.filter((transaction) => {
    const time = Date.parse(transaction.createdAt)
    return Number.isFinite(time) && time >= windowStart && time <= now && trackedTypes.has(transaction.type)
  })
  const usage = events.filter((transaction) => transaction.type === 'usage')
  const userUsage = new Map()
  const buckets = Array.from({ length: Math.ceil(durationMs / bucketMs) }, (_, index) => ({
    timestamp: new Date(windowStart + index * bucketMs).toISOString(), requests: 0, creditsConsumed: 0,
  }))
  const eventTotals = Object.fromEntries([...trackedTypes].map((type) => [type, 0]))

  for (const transaction of events) {
    eventTotals[transaction.type] += 1
    if (transaction.type !== 'usage') continue
    const user = usersById.get(transaction.userId)
    if (!user) continue
    const amount = Math.abs(transaction.amount)
    const summary = userUsage.get(user.id) ?? { user, requests: 0, creditsConsumed: 0, lastUsedAt: transaction.createdAt }
    summary.requests += 1
    summary.creditsConsumed += amount
    if (Date.parse(transaction.createdAt) > Date.parse(summary.lastUsedAt)) summary.lastUsedAt = transaction.createdAt
    userUsage.set(user.id, summary)
    const bucket = buckets[Math.floor((Date.parse(transaction.createdAt) - windowStart) / bucketMs)]
    if (bucket) { bucket.requests += 1; bucket.creditsConsumed += amount }
  }

  const byUser = [...userUsage.values()].map(({ user, requests, creditsConsumed, lastUsedAt }) => ({
    userId: user.id, username: user.username ?? user.email, email: user.email, name: user.name,
    credits: user.credits,
    model: modelConfigFor?.(user, 'chat') ? { provider: modelConfigFor(user, 'chat').provider, name: modelConfigFor(user, 'chat').model } : null,
    requests, creditsConsumed, lastUsedAt,
  })).sort((left, right) => right.creditsConsumed - left.creditsConsumed)

  const recentEvents = events.slice().sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)).slice(0, 100).flatMap((transaction) => {
    const user = usersById.get(transaction.userId)
    return user ? [{
      id: transaction.id, type: transaction.type, username: user.username ?? user.email, email: user.email, name: user.name,
      creditsConsumed: transaction.type === 'usage' ? Math.abs(transaction.amount) : 0,
      balance: transaction.balance, description: transaction.description,
      model: modelConfigFor?.(user, 'chat') ? { provider: modelConfigFor(user, 'chat').provider, name: modelConfigFor(user, 'chat').model } : null,
      occurredAt: transaction.createdAt,
    }] : []
  })

  return {
    generatedAt: new Date(now).toISOString(), window: windowName,
    totals: {
      users: users.length, activeUsers: byUser.length,
      configuredModels: users.filter((user) => ['chat', 'image', 'video', 'audio'].some((kind) => Boolean(modelConfigFor?.(user, kind)))).length,
      requests: usage.length, creditsConsumed: usage.reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0),
      registrations: eventTotals.user_registered, projectsCreated: eventTotals.project_created, modelUpdates: eventTotals.model_updated,
    },
    eventTotals, byUser, series: buckets, recentEvents,
  }
}
