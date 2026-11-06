import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Activity, ArrowDownRight, ArrowUpRight, Clock3, Cpu, LogOut, RefreshCw, ShieldCheck, Users } from 'lucide-react'
import './admin.css'

type UsageSnapshot = {
  generatedAt: string
  window: string
  totals: {
    users: number
    activeUsers: number
    configuredModels: number
    requests: number
    creditsConsumed: number
  }
  byUser: {
    userId: string
    username: string
    email: string
    name: string
    credits: number
    model: { provider: string; name: string } | null
    requests: number
    creditsConsumed: number
    lastUsedAt: string
  }[]
  series: { timestamp: string; requests: number; creditsConsumed: number }[]
  recentEvents: {
    id: string
    username: string
    email: string
    name: string
    creditsConsumed: number
    balance: number
    description: string
    model: { provider: string; name: string } | null
    occurredAt: string
  }[]
}

type AdminUser = { username: string; email: string; name: string }
type ApiResult<T> = { data?: T; error?: string }
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')
const windows = [
  { value: '1h', label: '最近 1 小时' },
  { value: '24h', label: '最近 24 小时' },
  { value: '7d', label: '最近 7 天' },
  { value: '30d', label: '最近 30 天' },
] as const
const numberFormat = new Intl.NumberFormat('zh-CN')
const timeFormat = new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

async function request<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${apiBaseUrl}${url}`, {
      ...init,
      credentials: 'include',
      headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
    })
    const body = await response.json().catch(() => ({})) as T & { error?: string }
    if (!response.ok) return { error: body.error || `请求失败（${response.status}）` }
    return { data: body }
  } catch (error) {
    return { error: error instanceof Error ? `连接后端失败：${error.message}` : '连接后端失败，请检查服务状态' }
  }
}

function formatTime(value?: string) {
  if (!value) return '—'
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timeFormat.format(timestamp) : '—'
}

function AdminDashboard() {
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [windowName, setWindowName] = useState<(typeof windows)[number]['value']>('24h')
  const [snapshot, setSnapshot] = useState<UsageSnapshot | null>(null)
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [loginBusy, setLoginBusy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadUsage = useCallback(async () => {
    setLoading(true)
    const result = await request<UsageSnapshot>(`/api/admin/usage?window=${windowName}`)
    if (result.data) {
      setSnapshot(result.data)
      setError('')
    } else {
      setError(result.error ?? '读取监控数据失败')
    }
    setLoading(false)
  }, [windowName])

  useEffect(() => {
    document.title = '后台监控 · 墨序 Studio'
    document.body.classList.add('admin-page')
    void request<{ user: AdminUser }>('/api/admin/me').then((result) => {
      if (result.data) {
        setAdmin(result.data.user)
        setAuthorized(true)
      } else if (result.error === '请先登录' || result.error === '登录已失效，请重新登录') {
        setAuthorized(false)
      } else {
        setError(result.error ?? '后台验证失败')
        setAuthorized(false)
      }
    })
    return () => document.body.classList.remove('admin-page')
  }, [])

  useEffect(() => {
    if (!authorized) return
    void loadUsage()
    const timer = window.setInterval(() => { void loadUsage() }, 30_000)
    return () => window.clearInterval(timer)
  }, [authorized, loadUsage])

  const chartSeries = useMemo(() => {
    if (!snapshot?.series.length) return []
    const source = snapshot.series
    const step = Math.max(1, Math.ceil(source.length / 48))
    return source.filter((_, index) => index % step === 0).slice(-48)
  }, [snapshot])
  const maxCredits = Math.max(1, ...chartSeries.map((point) => point.creditsConsumed))

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoginBusy(true)
    setError('')
    const result = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: loginId, password }),
    })
    setPassword('')
    if (!result.data) {
      setError(result.error ?? '登录失败')
      setLoginBusy(false)
      return
    }
    const identity = await request<{ user: AdminUser }>('/api/admin/me')
    if (!identity.data) {
      setError(identity.error ?? '登录成功，但当前账号没有后台权限')
      setAuthorized(false)
      setLoginBusy(false)
      return
    }
    setAdmin(identity.data.user)
    setAuthorized(true)
    setLoginBusy(false)
  }

  const logout = async () => {
    await request('/api/auth/logout', { method: 'POST' })
    setAdmin(null)
    setSnapshot(null)
    setAuthorized(false)
    setError('')
  }

  if (authorized !== true) {
    return (
      <main className="admin-login-shell">
        <div className="admin-login-card">
          <div className="admin-brand"><span className="admin-brand-mark">墨</span><span>MOXU <b>STUDIO</b></span></div>
          <div className="admin-overline">SECURE ADMIN CONSOLE</div>
          <h1>后台监控</h1>
          <p className="admin-login-description">使用已授权的墨序账号登录。后台权限由服务器端管理员邮箱白名单控制。</p>
          <form onSubmit={(event) => { void login(event) }} className="admin-login-form">
            <label>邮箱或用户名<input autoComplete="username" value={loginId} onChange={(event) => setLoginId(event.target.value)} required placeholder="管理员账号" /></label>
            <label>密码<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required placeholder="输入账号密码" /></label>
            {error && <div role="alert" className="admin-error">{error}</div>}
            <button type="submit" disabled={loginBusy}>{loginBusy ? '验证中…' : '安全登录'}<ShieldCheck size={16} /></button>
          </form>
          <div className="admin-login-foot"><ShieldCheck size={14} /> 仅管理员邮箱可查看汇总用量与账号用量</div>
        </div>
      </main>
    )
  }

  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <a className="admin-brand" href="/" aria-label="返回墨序工作台"><span className="admin-brand-mark">墨</span><span>MOXU <b>STUDIO</b></span></a>
        <div className="admin-topbar-right">
          <span className="admin-live"><i /> 实时监控</span>
          <span className="admin-account">{admin?.name || admin?.username}</span>
          <button className="admin-logout" onClick={() => { void logout() }}><LogOut size={15} /> 退出</button>
        </div>
      </header>

      <section className="admin-content">
        <div className="admin-heading-row">
          <div>
            <div className="admin-overline">SYSTEM OVERVIEW / 01</div>
            <h1>运营监控</h1>
            <p>查看模型使用、积分消耗与账号活跃情况。数据只读，不展示模型密钥。</p>
          </div>
          <div className="admin-heading-actions">
            <label className="admin-window-select"><span className="sr-only">统计时间范围</span>
              <select value={windowName} onChange={(event) => setWindowName(event.target.value as typeof windowName)}>
                {windows.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <button className="admin-refresh" onClick={() => { void loadUsage() }} disabled={loading}><RefreshCw size={15} className={loading ? 'admin-spin' : ''} /> 刷新</button>
          </div>
        </div>

        {error && <div role="alert" className="admin-banner-error">{error}</div>}
        {!snapshot && loading && <div className="admin-loading"><span className="admin-loader" />正在读取用量数据…</div>}
        {snapshot && <>
          <div className="admin-stats-grid">
            <article className="admin-stat-card"><div className="admin-stat-label">积分消耗 <ArrowDownRight size={15} /></div><strong>{numberFormat.format(snapshot.totals.creditsConsumed)}</strong><small>所选时间范围内</small></article>
            <article className="admin-stat-card"><div className="admin-stat-label">模型调用 <Activity size={15} /></div><strong>{numberFormat.format(snapshot.totals.requests)}</strong><small>成功计入的使用记录</small></article>
            <article className="admin-stat-card"><div className="admin-stat-label">活跃用户 <Users size={15} /></div><strong>{numberFormat.format(snapshot.totals.activeUsers)}<em> / {numberFormat.format(snapshot.totals.users)}</em></strong><small>产生过使用的账号</small></article>
            <article className="admin-stat-card"><div className="admin-stat-label">已配置模型 <Cpu size={15} /></div><strong>{numberFormat.format(snapshot.totals.configuredModels)}</strong><small>至少配置一种模型的账号</small></article>
          </div>

          <section className="admin-panel admin-chart-panel">
            <div className="admin-panel-heading"><div><h2>积分消耗趋势</h2><p>{windows.find((item) => item.value === windowName)?.label} · 自动每 30 秒更新</p></div><span className="admin-updated"><Clock3 size={13} /> 更新于 {formatTime(snapshot.generatedAt)}</span></div>
            <div className="admin-chart" role="img" aria-label="积分消耗趋势图">
              {chartSeries.map((point, index) => (
                <div className="admin-chart-column" key={`${point.timestamp}-${index}`} title={`${formatTime(point.timestamp)} · ${point.creditsConsumed} 积分`}>
                  <i style={{ height: `${Math.max(point.creditsConsumed ? 4 : 1, (point.creditsConsumed / maxCredits) * 100)}%` }} />
                </div>
              ))}
            </div>
            <div className="admin-chart-axis"><span>{chartSeries[0] ? formatTime(chartSeries[0].timestamp) : '—'}</span><span>积分消耗</span><span>{chartSeries.at(-1) ? formatTime(chartSeries.at(-1)?.timestamp) : '—'}</span></div>
          </section>

          <div className="admin-data-grid">
            <section className="admin-panel">
              <div className="admin-panel-heading"><div><h2>账号用量</h2><p>按积分消耗排序</p></div><span className="admin-count">{snapshot.byUser.length} 位</span></div>
              <div className="admin-table-wrap">
                <table><thead><tr><th>账号</th><th>聊天模型</th><th>调用</th><th>消耗</th><th>余额</th></tr></thead>
                  <tbody>{snapshot.byUser.length ? snapshot.byUser.map((user) => (
                    <tr key={user.userId}><td><b>{user.name || user.username}</b><small>{user.email}</small></td><td>{user.model ? <><b>{user.model.name}</b><small>{user.model.provider}</small></> : <span className="admin-muted">未配置</span>}</td><td>{numberFormat.format(user.requests)}</td><td className="admin-consumption">−{numberFormat.format(user.creditsConsumed)}</td><td>{numberFormat.format(user.credits)}</td></tr>
                  )) : <tr><td className="admin-empty" colSpan={5}>此时间范围内暂无模型用量</td></tr>}</tbody>
                </table>
              </div>
            </section>

            <section className="admin-panel">
              <div className="admin-panel-heading"><div><h2>最近用量事件</h2><p>最近记录</p></div><span className="admin-count">{snapshot.recentEvents.length}</span></div>
              <div className="admin-events-list">{snapshot.recentEvents.slice(0, 12).map((event) => (
                <article className="admin-event" key={event.id}>
                  <span className="admin-event-mark"><ArrowUpRight size={14} /></span>
                  <div className="admin-event-main"><b>{event.name || event.username}</b><small>{event.description} · {formatTime(event.occurredAt)}</small></div>
                  <strong>−{numberFormat.format(event.creditsConsumed)}</strong>
                </article>
              ))}{!snapshot.recentEvents.length && <div className="admin-empty-events">暂无用量事件</div>}</div>
            </section>
          </div>
        </>}
        <footer className="admin-footer"><span>MOXU STUDIO · ADMIN CONSOLE</span><span>安全只读视图</span></footer>
      </section>
    </main>
  )
}

export default AdminDashboard
