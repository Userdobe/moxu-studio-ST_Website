import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { Activity, ArrowDownRight, ArrowUpRight, Boxes, Clock3, Cpu, Database, Download, Image as ImageIcon, KeyRound, LayoutDashboard, LogOut, Moon, Palette, Pause, Play, Plus, RefreshCw, Search, ShieldCheck, Sun, Users, X } from 'lucide-react'
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
    registrations?: number
    projectsCreated?: number
    modelUpdates?: number
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
    type?: 'user_registered' | 'project_created' | 'model_updated' | 'usage'
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
type ShowcaseItem = {
  id: string
  kind: 'image' | 'video'
  title: string
  caption: string
  tag?: string
  duration?: string
  art: string
  mediaUrl?: string
  visible?: boolean
  order?: number
  createdAt?: string
}

const emptyShowcaseForm = { kind: 'image' as ShowcaseItem['kind'], title: '', caption: '', tag: '', duration: '', art: 'art-rain', mediaUrl: '', order: '', visible: true }

type ManagedUser = { id: string; username: string; email: string; name: string; active: boolean; credits: number; createdAt: string; models: string[] }
type ModelProvider = { id: string; kind: string; provider: string; model: string; baseUrl: string; enabled: boolean; createdAt: string }
type AuditLog = { id: string; adminEmail: string; action: string; target: string; details: string; createdAt: string }
type ApiResult<T> = { data?: T; error?: string }
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')
const windows = [
  { value: '1h', label: '最近 1 小时' },
  { value: '24h', label: '最近 24 小时' },
  { value: '7d', label: '最近 7 天' },
  { value: '30d', label: '最近 30 天' },
] as const
const viewLabels = { overview: '运营监控', users: '用户管理', models: '模型接入', showcase: '作品展示', audit: '审计日志' } as const
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
  const [view, setView] = useState<'overview' | 'users' | 'models' | 'showcase' | 'audit'>('overview')
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([])
  const [modelProviders, setModelProviders] = useState<ModelProvider[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [showcaseItems, setShowcaseItems] = useState<ShowcaseItem[]>([])
  const [showcaseForm, setShowcaseForm] = useState(emptyShowcaseForm)
  const [editingShowcaseId, setEditingShowcaseId] = useState('')
  const [showcaseSaving, setShowcaseSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [auditQuery, setAuditQuery] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [countdown, setCountdown] = useState(30)
  const [managementLoading, setManagementLoading] = useState(false)
  const [modelForm, setModelForm] = useState({ kind: 'chat', provider: '', model: '', baseUrl: '' })
  const [saving, setSaving] = useState(false)
  const [appearanceOpen, setAppearanceOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [accent, setAccent] = useState('#d3ef86')
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable')
  const [radius, setRadius] = useState<'soft' | 'sharp'>('soft')

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
    document.title = '管理控制台 · 墨序 Studio'
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
    try {
      const saved = JSON.parse(localStorage.getItem('moxu-admin-appearance') ?? '{}')
      if (saved.theme === 'dark' || saved.theme === 'light') setTheme(saved.theme)
      if (typeof saved.accent === 'string') setAccent(saved.accent)
      if (saved.density === 'compact' || saved.density === 'comfortable') setDensity(saved.density)
      if (saved.radius === 'sharp' || saved.radius === 'soft') setRadius(saved.radius)
    } catch { /* ignore malformed local preferences */ }
  }, [])

  useEffect(() => {
    localStorage.setItem('moxu-admin-appearance', JSON.stringify({ theme, accent, density, radius }))
  }, [accent, density, radius, theme])

  useEffect(() => {
    if (!authorized) return
    setCountdown(30)
    void loadUsage()
  }, [authorized, loadUsage])

  useEffect(() => {
    if (!authorized || !autoRefresh) return
    if (countdown <= 0) {
      setCountdown(30)
      void loadUsage()
      return
    }
    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [authorized, autoRefresh, countdown, loadUsage])

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    if (!appearanceOpen) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setAppearanceOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [appearanceOpen])

  const loadManagement = useCallback(async () => {
    if (view === 'overview') return
    setManagementLoading(true)
    try {
      if (view === 'users') {
        const result = await request<ManagedUser[]>(`/api/admin/users?search=${encodeURIComponent(search)}`)
        if (result.data) setManagedUsers(result.data); else setError(result.error ?? '读取用户失败')
      } else if (view === 'models') {
        const result = await request<ModelProvider[]>('/api/admin/models')
        if (result.data) setModelProviders(result.data); else setError(result.error ?? '读取模型接入失败')
      } else if (view === 'showcase') {
        const result = await request<ShowcaseItem[]>('/api/admin/showcase')
        if (result.data) setShowcaseItems(result.data); else setError(result.error ?? '读取展示作品失败')
      } else if (view === 'audit') {
        const result = await request<AuditLog[]>('/api/admin/audit')
        if (result.data) setAuditLogs(result.data); else setError(result.error ?? '读取审计日志失败')
      }
    } finally {
      setManagementLoading(false)
    }
  }, [search, view])

  useEffect(() => { if (authorized) void loadManagement() }, [authorized, loadManagement])

  const chartSeries = useMemo(() => {
    if (!snapshot?.series.length) return []
    const source = snapshot.series
    const step = Math.max(1, Math.ceil(source.length / 48))
    return source.filter((_, index) => index % step === 0).slice(-48)
  }, [snapshot])
  const maxCredits = Math.max(1, ...chartSeries.map((point) => point.creditsConsumed))
  const eventLabel = (type?: UsageSnapshot['recentEvents'][number]['type']) => ({
    user_registered: '注册', project_created: '新增项目', model_updated: '模型更新', usage: '模型调用',
  }[type ?? 'usage'] ?? '事件')

  const resetShowcaseForm = () => { setShowcaseForm(emptyShowcaseForm); setEditingShowcaseId('') }

  const saveShowcase = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!showcaseForm.title.trim()) { setError('请填写作品标题'); return }
    setShowcaseSaving(true); setError('')
    const payload = {
      kind: showcaseForm.kind,
      title: showcaseForm.title.trim(),
      caption: showcaseForm.caption.trim(),
      tag: showcaseForm.tag.trim(),
      duration: showcaseForm.duration.trim(),
      art: showcaseForm.art,
      mediaUrl: showcaseForm.mediaUrl.trim(),
      order: showcaseForm.order ? Number(showcaseForm.order) : undefined,
      visible: showcaseForm.visible,
    }
    const result = await request<ShowcaseItem>(editingShowcaseId ? `/api/admin/showcase/${editingShowcaseId}` : '/api/admin/showcase', {
      method: editingShowcaseId ? 'PATCH' : 'POST',
      body: JSON.stringify(payload),
    })
    setShowcaseSaving(false)
    if (!result.data) { setError(result.error ?? '保存展示作品失败'); return }
    resetShowcaseForm()
    if (authorized) void loadManagement()
  }

  const editShowcase = (item: ShowcaseItem) => {
    setEditingShowcaseId(item.id)
    setShowcaseForm({ kind: item.kind, title: item.title, caption: item.caption, tag: item.tag ?? '', duration: item.duration ?? '', art: item.art, mediaUrl: item.mediaUrl ?? '', order: item.order ? String(item.order) : '', visible: item.visible !== false })
  }

  const deleteShowcase = async (item: ShowcaseItem) => {
    if (!window.confirm(`删除展示作品「${item.title}」？`)) return
    const result = await request(`/api/admin/showcase/${item.id}`, { method: 'DELETE' })
    if (result.error) { setError(result.error); return }
    if (editingShowcaseId === item.id) resetShowcaseForm()
    if (authorized) void loadManagement()
  }

  const toggleShowcase = async (item: ShowcaseItem) => {
    const result = await request(`/api/admin/showcase/${item.id}`, { method: 'PATCH', body: JSON.stringify({ visible: item.visible === false }) })
    if (result.error) setError(result.error); else if (authorized) void loadManagement()
  }

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

  const updateUser = async (user: ManagedUser, active: boolean) => {
    const result = await request(`/api/admin/users/${user.id}`, { method: 'PATCH', body: JSON.stringify({ active }) })
    if (!result.data) return setError(result.error ?? '用户状态更新失败')
    void loadManagement()
  }

  const createUser = async () => {
    const email = window.prompt('新用户邮箱')?.trim()
    const password = email ? window.prompt('初始密码（至少 10 位）') : ''
    if (!email || !password) return
    const result = await request('/api/admin/users', { method: 'POST', body: JSON.stringify({ email, password }) })
    if (!result.data) setError(result.error ?? '创建用户失败'); else void loadManagement()
  }

  const deleteUser = async (user: ManagedUser) => {
    if (!window.confirm(`确定冻结并删除 ${user.email}？项目和交易记录会保留。`)) return
    const result = await request(`/api/admin/users/${user.id}`, { method: 'DELETE' })
    if (!result.data) setError(result.error ?? '删除用户失败'); else void loadManagement()
  }

  const resetPassword = async (user: ManagedUser) => {
    const password = window.prompt(`为 ${user.email} 设置新密码（至少 10 位）`)
    if (!password) return
    const result = await request(`/api/admin/users/${user.id}/reset-password`, { method: 'POST', body: JSON.stringify({ password }) })
    if (!result.data) setError(result.error ?? '密码重置失败'); else window.alert('密码已重置，旧登录会话已失效')
  }

  const addModel = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true)
    const result = await request<ModelProvider>('/api/admin/models', { method: 'POST', body: JSON.stringify(modelForm) })
    if (result.data) { setModelProviders((current) => [result.data!, ...current]); setModelForm({ kind: 'chat', provider: '', model: '', baseUrl: '' }) } else setError(result.error ?? '模型接入失败')
    setSaving(false)
  }

  const toggleModel = async (model: ModelProvider) => {
    const result = await request<ModelProvider>(`/api/admin/models/${model.id}`, { method: 'PATCH', body: JSON.stringify({ enabled: !model.enabled }) })
    if (result.data) setModelProviders((current) => current.map((item) => item.id === model.id ? result.data! : item)); else setError(result.error ?? '模型状态更新失败')
  }

  const filteredAuditLogs = useMemo(() => {
    const query = auditQuery.trim().toLowerCase()
    if (!query) return auditLogs
    return auditLogs.filter((log) => [log.action, log.target, log.adminEmail, log.details].some((value) => value?.toLowerCase().includes(query)))
  }, [auditLogs, auditQuery])

  const exportUsageCsv = () => {
    if (!snapshot?.byUser.length) return
    const rows: (string | number)[][] = [['账号', '邮箱', '聊天模型', '调用次数', '积分消耗', '余额', '最近使用时间']]
    for (const user of snapshot.byUser) {
      rows.push([
        user.name || user.username,
        user.email,
        user.model ? `${user.model.provider} / ${user.model.name}` : '未配置',
        user.requests,
        user.creditsConsumed,
        user.credits,
        formatTime(user.lastUsedAt),
      ])
    }
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `墨序账号用量-${windowName}-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  if (authorized !== true) {
    return (
      <main className="admin-login-shell">
        <div className="admin-login-card">
          <div className="admin-brand"><span className="admin-brand-mark">墨</span><span>MOXU <b>STUDIO</b></span></div>
          <div className="admin-overline">SECURE ADMIN CONSOLE</div>
          <h1>管理控制台</h1>
          <p className="admin-login-description">使用已授权的墨序账号登录，查看用量、管理账号与首页作品。权限由服务端管理员邮箱白名单控制。</p>
          <form onSubmit={(event) => { void login(event) }} className="admin-login-form">
            <label>邮箱或用户名<input autoComplete="username" value={loginId} onChange={(event) => setLoginId(event.target.value)} required placeholder="管理员账号" /></label>
            <label>密码<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required placeholder="输入账号密码" /></label>
            {error && <div role="alert" className="admin-error">{error}</div>}
            <button type="submit" disabled={loginBusy}>{loginBusy ? '验证中…' : '安全登录'}<ShieldCheck size={16} /></button>
          </form>
          <div className="admin-login-foot"><ShieldCheck size={14} /> 仅管理员邮箱可访问；敏感操作全部留痕</div>
        </div>
      </main>
    )
  }

  return (
    <div className={`admin-frame admin-theme-${theme} admin-density-${density} admin-radius-${radius}`} style={{ '--admin-accent': accent } as CSSProperties}>
      <aside className="admin-sidebar">
        <a className="admin-brand" href="/" aria-label="返回墨序工作台"><span className="admin-brand-mark">墨</span><span className="admin-brand-text">MOXU <b>STUDIO</b><small>ADMIN CONSOLE</small></span></a>
        <div className="admin-nav-group">
          <span className="admin-nav-label">工作台</span>
          <nav className="admin-nav" aria-label="管理后台导航">
            {([["overview", "总览", LayoutDashboard], ["users", "用户管理", Users], ["models", "模型接入", Boxes], ["showcase", "作品展示", ImageIcon], ["audit", "审计日志", Database]] as const).map(([key, label, Icon]) => <button key={key} className={view === key ? 'active' : ''} onClick={() => setView(key)}><Icon size={16} />{label}{view === key && <i />}</button>)}
          </nav>
        </div>
        <div className="admin-sidebar-foot">
          <span className={`admin-live${error ? ' admin-live-error' : ''}`}><i /> {error ? '接口异常' : '系统正常'}</span>
          <small>v1.0 · 内部运营</small>
          <a className="admin-side-back" href="/">返回创作台 <span>→</span></a>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-breadcrumb"><span>墨序工作室</span><i>/</i><b>{viewLabels[view]}</b></div>
          <div className="admin-topbar-right">
            <button className="admin-appearance-trigger" onClick={() => setAppearanceOpen((open) => !open)}><Palette size={15} />外观</button>
            <span className="admin-account-chip"><span className="admin-avatar">{(admin?.name || admin?.username || 'A').slice(0, 1)}</span><span className="admin-account-text"><b>{admin?.name || admin?.username}</b><small>{admin?.email}</small></span></span>
            <button className="admin-logout" onClick={() => { void logout() }} aria-label="退出登录" title="退出登录"><LogOut size={15} /></button>
          </div>
        </header>

        <section className="admin-content">
          {appearanceOpen && <aside className="admin-appearance-panel"><div className="admin-appearance-heading"><div><b>外观设置</b><small>只保存在当前浏览器</small></div><button onClick={() => setAppearanceOpen(false)} aria-label="关闭外观设置"><X size={16} /></button></div><div className="admin-appearance-group"><span>主题</span><div className="admin-segmented"><button className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')}><Sun size={14} />浅色</button><button className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')}><Moon size={14} />深色</button></div></div><div className="admin-appearance-group"><span>强调色</span><div className="admin-color-options">{['#d3ef86', '#8fd6c2', '#e8b56d', '#d79ab8'].map((color) => <button key={color} className={accent === color ? 'active' : ''} style={{ background: color }} onClick={() => setAccent(color)} aria-label={`使用${color}强调色`} />)}</div></div><div className="admin-appearance-group"><span>信息密度</span><div className="admin-segmented"><button className={density === 'comfortable' ? 'active' : ''} onClick={() => setDensity('comfortable')}>舒展</button><button className={density === 'compact' ? 'active' : ''} onClick={() => setDensity('compact')}>紧凑</button></div></div><div className="admin-appearance-group"><span>圆角</span><div className="admin-segmented"><button className={radius === 'soft' ? 'active' : ''} onClick={() => setRadius('soft')}>柔和</button><button className={radius === 'sharp' ? 'active' : ''} onClick={() => setRadius('sharp')}>利落</button></div></div></aside>}
        {view !== 'overview' && <div className="admin-heading-row"><div><div className="admin-overline">ADMINISTRATION / {view.toUpperCase()}</div><h1>{view === 'users' ? '用户管理' : view === 'models' ? '模型接入' : view === 'showcase' ? '作品展示' : '审计日志'}</h1><p>高权限操作均会留下审计记录，密钥只显示掩码。</p></div><button className="admin-refresh" onClick={() => { void loadManagement() }}><RefreshCw size={15} />刷新</button></div>}
        {view === 'users' && <section className="admin-panel admin-management-panel"><div className="admin-toolbar"><label className="admin-search"><Search size={15} /><input placeholder="搜索姓名、邮箱或登录名" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />{searchInput && <button type="button" className="admin-search-clear" aria-label="清空搜索" onClick={() => setSearchInput('')}><X size={13} /></button>}</label><span className="admin-count">{managementLoading ? '读取中…' : `${managedUsers.length} 位用户`}</span><button className="admin-inline-action" onClick={() => { void createUser() }}><Plus size={13} />新增用户</button></div><div className="admin-table-wrap"><table><thead><tr><th>用户</th><th>状态</th><th>积分</th><th>模型</th><th>注册时间</th><th>操作</th></tr></thead><tbody>{managedUsers.map((user) => <tr key={user.id}><td><b>{user.name}</b><small>{user.email} · {user.username}</small></td><td><span className={user.active ? 'admin-status-active' : 'admin-status-off'}>{user.active ? '正常' : '已冻结'}</span></td><td>{numberFormat.format(user.credits)}</td><td>{user.models.length || '未配置'}</td><td>{formatTime(user.createdAt)}</td><td className="admin-row-actions"><button onClick={() => { void updateUser(user, !user.active) }}>{user.active ? <><Pause size={13} />冻结</> : <><Play size={13} />恢复</>}</button><button onClick={() => { void resetPassword(user) }}><KeyRound size={13} />重置密码</button>{user.email !== admin?.email && <button onClick={() => { void deleteUser(user) }}>删除</button>}</td></tr>)}{!managedUsers.length && <tr><td className="admin-empty" colSpan={6}>{managementLoading ? '正在读取用户…' : searchInput ? '没有匹配的用户，换个关键词试试' : '暂无用户'}</td></tr>}</tbody></table></div></section>}
        {view === 'models' && <><section className="admin-panel admin-management-panel"><div className="admin-panel-heading"><div><h2>新增平台模型</h2><p>只保存接入信息，不保存 API Key</p></div></div><form className="admin-model-form" onSubmit={(event) => { void addModel(event) }}><select value={modelForm.kind} onChange={(event) => setModelForm({ ...modelForm, kind: event.target.value })}><option value="chat">聊天模型</option><option value="image">图片模型</option><option value="video">视频模型</option><option value="audio">音频模型</option></select><input placeholder="服务商" value={modelForm.provider} onChange={(event) => setModelForm({ ...modelForm, provider: event.target.value })} required /><input placeholder="模型名称" value={modelForm.model} onChange={(event) => setModelForm({ ...modelForm, model: event.target.value })} required /><input placeholder="HTTPS Base URL" value={modelForm.baseUrl} onChange={(event) => setModelForm({ ...modelForm, baseUrl: event.target.value })} required /><button disabled={saving}><Plus size={15} />接入模型</button></form></section><section className="admin-panel admin-management-panel"><div className="admin-panel-heading"><div><h2>平台模型目录</h2><p>全局接入配置</p></div><span className="admin-count">{modelProviders.length} 个</span></div><div className="admin-table-wrap"><table><thead><tr><th>模型</th><th>类型</th><th>地址</th><th>状态</th><th>操作</th></tr></thead><tbody>{modelProviders.map((model) => <tr key={model.id}><td><b>{model.model}</b><small>{model.provider}</small></td><td>{model.kind}</td><td>{model.baseUrl}</td><td>{model.enabled ? <span className="admin-status-active">已启用</span> : <span className="admin-status-off">已停用</span>}</td><td><button className="admin-inline-action" onClick={() => { void toggleModel(model) }}>{model.enabled ? '停用' : '启用'}</button></td></tr>)}{!modelProviders.length && <tr><td className="admin-empty" colSpan={5}>暂无平台模型接入</td></tr>}</tbody></table></div></section></>}
        {view === 'showcase' && <>
          <section className="admin-panel admin-management-panel">
            <div className="admin-panel-heading"><div><h2>{editingShowcaseId ? '编辑展示作品' : '新增展示作品'}</h2><p>展示在创作首页「灵感作品集」，保存后即时生效</p></div>{editingShowcaseId && <button type="button" className="admin-inline-action" onClick={resetShowcaseForm}>取消编辑</button>}</div>
            <form className="admin-showcase-form" onSubmit={(event) => { void saveShowcase(event) }}>
              <select value={showcaseForm.kind} onChange={(event) => { const kind = event.target.value as ShowcaseItem['kind']; setShowcaseForm({ ...showcaseForm, kind, art: kind === 'video' ? 'video-rain' : 'art-rain' }) }}><option value="image">画面</option><option value="video">短片</option></select>
              <input placeholder="作品标题" value={showcaseForm.title} onChange={(event) => setShowcaseForm({ ...showcaseForm, title: event.target.value })} required />
              <input placeholder="副标题 / 出处" value={showcaseForm.caption} onChange={(event) => setShowcaseForm({ ...showcaseForm, caption: event.target.value })} />
              {showcaseForm.kind === 'image'
                ? <input placeholder="标签，如 雨夜" value={showcaseForm.tag} onChange={(event) => setShowcaseForm({ ...showcaseForm, tag: event.target.value })} />
                : <input placeholder="时长，如 00:38" value={showcaseForm.duration} onChange={(event) => setShowcaseForm({ ...showcaseForm, duration: event.target.value })} />}
              <select value={showcaseForm.art} onChange={(event) => setShowcaseForm({ ...showcaseForm, art: event.target.value })}>
                {(showcaseForm.kind === 'video' ? ['video-rain', 'video-dawn', 'video-alley'] : ['art-rain', 'art-glass', 'art-letter', 'art-alley']).map((style) => <option key={style} value={style}>{style}</option>)}
              </select>
              <input placeholder="封面图 URL（可选，https）" value={showcaseForm.mediaUrl} onChange={(event) => setShowcaseForm({ ...showcaseForm, mediaUrl: event.target.value })} />
              <input placeholder="排序，越小越靠前" type="number" value={showcaseForm.order} onChange={(event) => setShowcaseForm({ ...showcaseForm, order: event.target.value })} />
              <label className="admin-check"><input type="checkbox" checked={showcaseForm.visible} onChange={(event) => setShowcaseForm({ ...showcaseForm, visible: event.target.checked })} />在首页展示</label>
              <button disabled={showcaseSaving}><Plus size={15} />{editingShowcaseId ? '保存修改' : '添加作品'}</button>
            </form>
          </section>
          <section className="admin-panel admin-management-panel">
            <div className="admin-panel-heading"><div><h2>首页展示作品</h2><p>按排序值升序展示，隐藏的作品不会出现在前台</p></div><span className="admin-count">{showcaseItems.length} 个</span></div>
            <div className="admin-table-wrap"><table><thead><tr><th>作品</th><th>类型</th><th>标签 / 时长</th><th>排序</th><th>状态</th><th>操作</th></tr></thead><tbody>{showcaseItems.map((item) => <tr key={item.id}><td><b>{item.title}</b><small>{item.caption || '—'}</small></td><td>{item.kind === 'video' ? '短片' : '画面'}</td><td>{item.kind === 'video' ? item.duration || '—' : item.tag || '—'}</td><td>{item.order ?? '—'}</td><td>{item.visible === false ? <span className="admin-status-off">已隐藏</span> : <span className="admin-status-active">展示中</span>}</td><td className="admin-row-actions"><button onClick={() => editShowcase(item)}>编辑</button><button onClick={() => { void toggleShowcase(item) }}>{item.visible === false ? '显示' : '隐藏'}</button><button onClick={() => { void deleteShowcase(item) }}>删除</button></td></tr>)}{!showcaseItems.length && <tr><td className="admin-empty" colSpan={6}>{managementLoading ? '正在读取展示作品…' : '暂无展示作品，先在上方添加一个'}</td></tr>}</tbody></table></div>
          </section>
        </>}
        {view === 'audit' && <section className="admin-panel admin-management-panel"><div className="admin-panel-heading"><div><h2>管理员操作记录</h2><p>最近 200 条管理事件</p></div><span className="admin-count">{filteredAuditLogs.length} / {auditLogs.length} 条</span></div><div className="admin-toolbar"><label className="admin-search"><Search size={15} /><input placeholder="搜索操作、对象或管理员邮箱" value={auditQuery} onChange={(event) => setAuditQuery(event.target.value)} />{auditQuery && <button type="button" className="admin-search-clear" aria-label="清空搜索" onClick={() => setAuditQuery('')}><X size={13} /></button>}</label></div><div className="admin-events-list admin-audit-list">{filteredAuditLogs.map((log) => <article className="admin-event" key={log.id}><span className="admin-event-mark"><Database size={14} /></span><div className="admin-event-main"><b>{log.action}<span className="admin-event-type">{log.target}</span></b><small>{log.adminEmail} · {log.details || '—'} · {formatTime(log.createdAt)}</small></div></article>)}{!filteredAuditLogs.length && <div className="admin-empty-events">{managementLoading ? '正在读取审计记录…' : auditQuery ? '没有匹配的审计记录' : '暂无审计记录'}</div>}</div></section>}
        {view === 'overview' && <div className="admin-heading-row">
          <div>
            <div className="admin-overline">SYSTEM OVERVIEW / 01</div>
            <h1>运营监控</h1>
            <p>查看模型使用、积分消耗与账号活跃情况；账号与模型操作都会写入审计，密钥只显示掩码。</p>
          </div>
          <div className="admin-heading-actions">
            <label className="admin-window-select"><span className="sr-only">统计时间范围</span>
              <select value={windowName} onChange={(event) => setWindowName(event.target.value as typeof windowName)}>
                {windows.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <button className={`admin-refresh admin-auto-toggle${autoRefresh ? ' active' : ''}`} onClick={() => { setAutoRefresh((value) => !value); setCountdown(30) }} title={autoRefresh ? '暂停自动刷新' : '开启自动刷新'}>
              {autoRefresh ? <Pause size={14} /> : <Play size={14} />} {autoRefresh ? `自动刷新 ${countdown}s` : '已暂停'}
            </button>
            <button className="admin-refresh" onClick={() => { void loadUsage() }} disabled={loading}><RefreshCw size={15} className={loading ? 'admin-spin' : ''} /> 刷新</button>
          </div>
        </div>}

        {error && <div role="alert" className="admin-banner-error">{error}</div>}
        {!snapshot && loading && <div className="admin-loading"><span className="admin-loader" />正在读取用量数据…</div>}
        {view === 'overview' && snapshot && <>
          <div className="admin-stats-grid">
            <article className="admin-stat-card"><div className="admin-stat-label">积分消耗 <ArrowDownRight size={15} /></div><strong>{numberFormat.format(snapshot.totals.creditsConsumed)}</strong><small>所选时间范围内</small></article>
            <article className="admin-stat-card"><div className="admin-stat-label">模型调用 <Activity size={15} /></div><strong>{numberFormat.format(snapshot.totals.requests)}</strong><small>成功计入的使用记录</small></article>
            <article className="admin-stat-card"><div className="admin-stat-label">活跃用户 <Users size={15} /></div><strong>{numberFormat.format(snapshot.totals.activeUsers)}<em> / {numberFormat.format(snapshot.totals.users)}</em></strong><small>产生过使用的账号</small></article>
            <article className="admin-stat-card"><div className="admin-stat-label">已配置模型 <Cpu size={15} /></div><strong>{numberFormat.format(snapshot.totals.configuredModels)}</strong><small>至少配置一种模型的账号</small></article>
            <article className="admin-stat-card"><div className="admin-stat-label">新增用户 <Users size={15} /></div><strong>{numberFormat.format(snapshot.totals.registrations ?? 0)}</strong><small>所选时间范围内</small></article>
            <article className="admin-stat-card"><div className="admin-stat-label">新增项目 <ArrowUpRight size={15} /></div><strong>{numberFormat.format(snapshot.totals.projectsCreated ?? 0)}</strong><small>画布与剧本项目</small></article>
            <article className="admin-stat-card"><div className="admin-stat-label">模型更新 <Cpu size={15} /></div><strong>{numberFormat.format(snapshot.totals.modelUpdates ?? 0)}</strong><small>配置保存或清除</small></article>
          </div>

          <section className="admin-panel admin-chart-panel">
            <div className="admin-panel-heading"><div><h2>积分消耗趋势</h2><p>{windows.find((item) => item.value === windowName)?.label} · 自动每 30 秒更新</p></div><span className="admin-updated"><Clock3 size={13} /> 更新于 {formatTime(snapshot.generatedAt)}</span></div>
            <div className="admin-chart" role="img" aria-label="积分消耗趋势图">
              {chartSeries.every((point) => !point.creditsConsumed) && <p className="admin-chart-empty">所选时间范围内还没有积分消耗</p>}
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
              <div className="admin-panel-heading"><div><h2>账号用量</h2><p>按积分消耗排序</p></div><div className="admin-panel-actions"><span className="admin-count">{snapshot.byUser.length} 位</span><button className="admin-inline-action" onClick={exportUsageCsv} disabled={!snapshot.byUser.length}><Download size={13} />导出 CSV</button></div></div>
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
                  <div className="admin-event-main"><b>{event.name || event.username}<span className="admin-event-type">{eventLabel(event.type)}</span></b><small>{event.description} · {formatTime(event.occurredAt)}</small></div>
                  {event.creditsConsumed ? <strong>−{numberFormat.format(event.creditsConsumed)}</strong> : <strong className="admin-event-zero">—</strong>}
                </article>
              ))}{!snapshot.recentEvents.length && <div className="admin-empty-events">暂无用量事件</div>}</div>
            </section>
          </div>
        </>}
          <footer className="admin-footer"><span>MOXU STUDIO · ADMIN CONSOLE</span><span>仅限授权管理员 · {new Date().getFullYear()}</span></footer>
        </section>
      </div>
    </div>
  )
}

export default AdminDashboard
