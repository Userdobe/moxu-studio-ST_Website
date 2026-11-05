import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, CSSProperties, FormEvent, PointerEvent, WheelEvent } from 'react'
import {
  ArrowDownToLine, ArrowLeft, ArrowRight, Bell, Check, ChevronDown, ChevronLeft,
  ChevronRight, CircleHelp, Clapperboard, Clock3, Coins, Copy, Cpu, CreditCard,
  FileText, Film, Frame, FolderOpen, House, Image, ImagePlus, KeyRound, Layers3,
  LayoutGrid, LockKeyhole, LogOut, Maximize, MessageSquare, MoreHorizontal,
  MousePointer2, Move, PanelRightClose, Plus, Search, Settings2, ShieldCheck, Trash2,
  RefreshCw, Sparkles, SquarePen, UserRound, Video,
  WandSparkles, ZoomIn, ZoomOut,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Project, Scene } from './types'

const initialProject: Project = {
  title: '雾山来信',
  subtitle: '第 01 集 · 雨夜重逢',
  updatedAt: '刚刚保存',
  scenes: [
    { id: 's1', title: '雨夜 · 山城街口', description: '暴雨倾盆，霓虹在积水中晕开。林晚撑着一把透明的伞，停在旧书店门前。', location: '老城区 · 旧书店外', time: '深夜 / 暴雨', mood: '潮湿、克制、悬念', shot: '远景 → 中景', color: 'amber', art: 'rain', x: 150, y: 180 },
    { id: 's2', title: '重逢 · 玻璃倒影', description: '玻璃映出一个熟悉的身影。她没有回头，只是将伞柄握得更紧。', location: '旧书店 · 橱窗边', time: '深夜', mood: '心跳、迟疑', shot: '特写 / 侧逆光', color: 'lilac', art: 'glass', x: 570, y: 90 },
    { id: 's3', title: '旧信 · 十年前', description: '一封被雨水浸湿的信从书页间滑落，泛黄的字迹写着她的名字。', location: '旧书店 · 木桌旁', time: '深夜', mood: '怀旧、惊讶', shot: '俯拍 / 慢推', color: 'sage', art: 'letter', x: 570, y: 470 },
    { id: 's4', title: '追问 · 雨巷深处', description: '她追进空无一人的巷子，风吹起墙上的寻人启事。', location: '山城 · 窄巷', time: '黎明前', mood: '急切、迷离', shot: '跟拍 / 手持感', color: 'rose', art: 'alley', x: 1000, y: 280 },
  ],
}

const navItems: { icon: LucideIcon; label: string; key: string }[] = [
  { icon: House, label: '创作首页', key: 'home' },
  { icon: LayoutGrid, label: '创作画布', key: 'canvas' },
  { icon: FileText, label: '剧本工坊', key: 'script' },
  { icon: WandSparkles, label: 'SKILL', key: 'skills' },
  { icon: Layers3, label: '角色设定', key: 'characters' },
  { icon: Film, label: '成片管理', key: 'export' },
  { icon: Settings2, label: '个人设置', key: 'settings' },
]

const artTitles: Record<string, string> = {
  rain: 'Rain / 01', glass: 'Reflection / 02', letter: 'A letter / 03', alley: 'The alley / 04',
}

type User = {
  id: string
  username: string
  email: string
  name: string
  credits: number
  createdAt: string
  models: Record<ModelKind, ModelSummary | null>
  model: { provider: string; baseUrl: string; model: string; keyHint: string } | null
}

type ModelKind = 'chat' | 'image' | 'video' | 'audio'
type ModelSummary = { provider: string; baseUrl: string; model: string; keyHint: string }
type Transaction = {
  id: string
  type: string
  amount: number
  balance: number
  description: string
  createdAt: string
}

type AccountResponse = { user: User; transactions: Transaction[]; rechargeMode: 'mock' | 'disabled' }
type ProjectType = 'canvas' | 'script'
type ModelForm = { provider: string; baseUrl: string; model: string; apiKey: string }
type VideoGenerationOptions = { duration: string; aspectRatio: string }
type VideoTaskStatus = {
  taskId: string
  status: 'pending' | 'running' | 'success' | 'failed'
  progress: string
  error: string
  videoUrl: string
}
type CreativeSkill = { id: string; name: string; description: string; content: string; source: 'built-in' | 'uploaded' }
type SkillSettings = { selectedSkillIds: string[]; customSkills: CreativeSkill[]; promptTemplate: string }
const builtInSkills: CreativeSkill[] = [
  { id: 'storyboard', name: '漫剧分镜拆解', description: '按连续场景拆解故事，突出镜头与画面动作。', content: '将故事拆解为连续、可拍摄的漫剧场景。每个场景突出人物动作、环境细节与情绪变化；保持原剧情，不添加新人物或情节。' , source: 'built-in' },
  { id: 'cinematic', name: '电影感叙事', description: '强化光影氛围、构图与镜头节奏。', content: '采用电影化叙事语言。关注光线方向、景别变化、环境氛围和视觉构图；用具体可见的画面表达情绪，避免空泛形容。', source: 'built-in' },
  { id: 'short-form', name: '短剧强节奏', description: '突出开场钩子、冲突升级与段落悬念。', content: '面向短剧节奏组织场景。快速建立人物目标和核心冲突，逐步升级矛盾，在关键段落保留悬念；不得改变原故事事实。', source: 'built-in' },
  { id: 'character', name: '角色一致性', description: '保持角色性格、关系和行为前后一致。', content: '拆解场景时保持人物性格、动机、称谓和关系一致。通过动作、表情和对白呈现人物，不让角色出现缺乏铺垫的行为转变。', source: 'built-in' },
]
const defaultPromptTemplate = '请按照以下创作规范拆解剧本，保留原意，不要编造剧情：\n{skill}\n\n剧本原文：\n{script}'
const defaultSkillSettings: SkillSettings = { selectedSkillIds: ['storyboard'], customSkills: [], promptTemplate: defaultPromptTemplate }
const modelKindLabels: Record<ModelKind, string> = { chat: '聊天模型', image: '图片模型', video: '视频模型', audio: '音频模型' }
const defaultVideoGenerationOptions: VideoGenerationOptions = { duration: '5', aspectRatio: '9:16' }
const emptyModelForm = (kind: ModelKind): ModelForm => kind === 'chat'
  ? { provider: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat', apiKey: '' }
  : { provider: '自定义', baseUrl: '', model: '', apiKey: '' }

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${url}`, {
    ...init,
    credentials: 'include',
    headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
  })
  const result = await response.json()
  if (response.status === 401 && !url.startsWith('/api/auth/login') && !url.startsWith('/api/auth/register') && !url.startsWith('/api/auth/me')) {
    window.dispatchEvent(new Event('mo:auth-expired'))
  }
  if (!response.ok) throw new Error(result.error || '请求失败，请稍后重试')
  return result as T
}

function App() {
  const [project, setProject] = useState<Project>(initialProject)
  const [selectedId, setSelectedId] = useState('s2')
  const [activeNav, setActiveNav] = useState('home')
  const [zoom, setZoom] = useState(0.82)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [saved, setSaved] = useState(true)
  const [panelOpen, setPanelOpen] = useState(true)
  const [toolMode, setToolMode] = useState<'select' | 'pan'>('select')
  const [script, setScript] = useState('暴雨夜，林晚回到十年未归的山城。旧书店的玻璃窗映出一个熟悉的身影。她在一本旧书里发现一封写给自己的信，落款日期是十年前的今天。')
  const [scriptImportBusy, setScriptImportBusy] = useState(false)
  const [breakdownBusy, setBreakdownBusy] = useState(false)
  const [sceneReinferBusy, setSceneReinferBusy] = useState<string | null>(null)
  const [videoPromptReinferBusy, setVideoPromptReinferBusy] = useState<string | null>(null)
  const [videoGenerationBusy, setVideoGenerationBusy] = useState<string | null>(null)
  const [videoStatusRefreshing, setVideoStatusRefreshing] = useState<string | null>(null)
  const [videoGenerationOptions, setVideoGenerationOptions] = useState<Record<string, VideoGenerationOptions>>({})
  const [expandedVideoPromptSceneId, setExpandedVideoPromptSceneId] = useState<string | null>(null)
  const [sceneReferenceDrafts, setSceneReferenceDrafts] = useState<Record<string, string>>({})
  const [editingSceneIds, setEditingSceneIds] = useState<string[]>([])
  const [idea, setIdea] = useState('')
  const [notice, setNotice] = useState('')
  const [promptText, setPromptText] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [rechargeMode, setRechargeMode] = useState<'mock' | 'disabled'>('disabled')
  const [authLoading, setAuthLoading] = useState(true)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' })
  const [authError, setAuthError] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'profile' | 'credits' | 'model'>('profile')
  const [profileName, setProfileName] = useState('')
  const [modelKind, setModelKind] = useState<ModelKind>('chat')
  const [modelForms, setModelForms] = useState<Record<ModelKind, ModelForm>>({
    chat: { provider: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat', apiKey: '' },
    image: { provider: '自定义', baseUrl: '', model: '', apiKey: '' },
    video: { provider: '自定义', baseUrl: '', model: '', apiKey: '' },
    audio: { provider: '自定义', baseUrl: '', model: '', apiKey: '' },
  })
  const [modelBusy, setModelBusy] = useState(false)
  const [modelTestBusy, setModelTestBusy] = useState(false)
  const [rechargeBusy, setRechargeBusy] = useState(false)
  const [modelKeyHints, setModelKeyHints] = useState<Record<ModelKind, string>>({ chat: '', image: '', video: '', audio: '' })
  const [settingsError, setSettingsError] = useState('')
  const [skillSettings, setSkillSettings] = useState<SkillSettings>(defaultSkillSettings)
  const [skillSettingsLoaded, setSkillSettingsLoaded] = useState(false)
  const [skillSettingsSaving, setSkillSettingsSaving] = useState(false)
  const [skillUploadBusy, setSkillUploadBusy] = useState(false)
  const [skillPickerOpen, setSkillPickerOpen] = useState(false)
  const [savedProjects, setSavedProjects] = useState<Project[]>([])
  const [projectBusy, setProjectBusy] = useState(false)
  const [projectEditorOpen, setProjectEditorOpen] = useState(false)
  const [scriptView, setScriptView] = useState<'editor' | 'breakdown'>('editor')
  const canvasRef = useRef<HTMLDivElement>(null)
  const spaceHeldRef = useRef(false)
  const dragRef = useRef<{ id: string | null; startX: number; startY: number; nodeX: number; nodeY: number; panX: number; panY: number } | null>(null)
  const videoStatusRequestsRef = useRef(new Set<string>())
  const videoStatusErrorsRef = useRef(new Set<string>())
  const videoTaskTimeoutNoticesRef = useRef(new Set<string>())

  const selectedScene = project.scenes.find((scene) => scene.id === selectedId) ?? project.scenes[0]
  const expandedVideoPromptScene = project.scenes.find((scene) => scene.id === expandedVideoPromptSceneId)
  const modelForm = modelForms[modelKind]
  const modelKeyHint = modelKeyHints[modelKind]
  const availableSkills = [...builtInSkills, ...skillSettings.customSkills]
  const selectedSkills = availableSkills.filter((skill) => skillSettings.selectedSkillIds.includes(skill.id))
  const activeVideoTaskKey = project.scenes
    .filter((scene) => scene.videoTaskId && (scene.videoStatus === 'pending' || scene.videoStatus === 'running'))
    .map((scene) => `${scene.id}:${scene.videoTaskId}`)
    .join('|')

  const applyAccount = (account: AccountResponse) => {
    setUser(account.user)
    setTransactions(account.transactions)
    setRechargeMode(account.rechargeMode)
    setProfileName(account.user.name)
    const models = account.user.models ?? { chat: account.user.model, image: null, video: null, audio: null }
    setModelKeyHints({
      chat: models.chat?.keyHint ?? '', image: models.image?.keyHint ?? '',
      video: models.video?.keyHint ?? '', audio: models.audio?.keyHint ?? '',
    })
    setModelForms((current) => Object.fromEntries((['chat', 'image', 'video', 'audio'] as ModelKind[]).map((kind) => {
      const model = models[kind]
      return [kind, model ? { ...current[kind], provider: model.provider, baseUrl: model.baseUrl, model: model.model, apiKey: '' } : current[kind]]
    })) as Record<ModelKind, ModelForm>)
  }

  const refreshAccount = async () => {
    const account = await apiRequest<AccountResponse>('/api/auth/me')
    applyAccount(account)
    return account
  }

  useEffect(() => {
    apiRequest<AccountResponse>('/api/auth/me')
      .then(applyAccount)
      .catch((error: Error) => {
        if (error.message !== '请先登录') setAuthError(error.message)
      })
      .finally(() => setAuthLoading(false))
  }, [])

  useEffect(() => {
    const onSessionExpired = () => {
      setUser(null)
      setTransactions([])
      setAuthMode('login')
      setAuthForm((current) => ({ ...current, password: '' }))
      setAuthError('登录已过期，请重新登录')
    }
    window.addEventListener('mo:auth-expired', onSessionExpired)
    return () => window.removeEventListener('mo:auth-expired', onSessionExpired)
  }, [])

  useEffect(() => {
    if (!user) {
      setSavedProjects([])
      return
    }
    apiRequest<Project[]>('/api/projects')
      .then(setSavedProjects)
      .catch(() => setNotice('项目列表读取失败，请检查后端服务'))
  }, [user?.id])

  useEffect(() => {
    if (saved || !user || !project.id) return
    const timer = window.setTimeout(() => {
      apiRequest<{ saved: boolean; project: Project }>(`/api/projects/${project.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...project, updatedAt: new Date().toISOString() }),
      })
        .then(({ project: persisted }) => {
          setProject((current) => current.id === persisted.id ? persisted : current)
          setSavedProjects((current) => current.map((item) => item.id === persisted.id ? persisted : item))
          setSaved(true)
        })
        .catch(() => setNotice('保存失败，请检查后端服务'))
    }, 700)
    return () => window.clearTimeout(timer)
  }, [project, saved, user?.id])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 3500)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    let cancelled = false
    setSkillSettingsLoaded(false)
    if (!user) {
      setSkillSettings(defaultSkillSettings)
      setSkillSettingsLoaded(true)
      return () => { cancelled = true }
    }
    apiRequest<{ settings: SkillSettings & { selectedSkillId?: string } }>('/api/account/skills')
      .then(({ settings }) => {
        if (!cancelled) setSkillSettings({
          ...settings,
          selectedSkillIds: Array.isArray(settings.selectedSkillIds)
            ? settings.selectedSkillIds
            : settings.selectedSkillId ? [settings.selectedSkillId] : ['storyboard'],
        })
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setSkillSettings(defaultSkillSettings)
          setNotice(`SKILL 配置读取失败：${error.message}`)
        }
      })
      .finally(() => { if (!cancelled) setSkillSettingsLoaded(true) })
    return () => { cancelled = true }
  }, [user?.id])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault()
        spaceHeldRef.current = true
      }
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') spaceHeldRef.current = false
    }
    const onBlur = () => { spaceHeldRef.current = false }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  const updateProject = useCallback((updater: (current: Project) => Project) => {
    setProject(updater)
    setSaved(false)
  }, [])

  const pollVideoTask = useCallback(async (sceneId: string, taskId: string) => {
    if (!project.id) return
    const requestKey = `${project.id}:${sceneId}:${taskId}`
    if (videoStatusRequestsRef.current.has(requestKey)) return
    videoStatusRequestsRef.current.add(requestKey)
    try {
      const result = await apiRequest<VideoTaskStatus>('/api/tools/video/status', {
        method: 'POST',
        body: JSON.stringify({ projectId: project.id, sceneId }),
      })
      if (result.taskId !== taskId) throw new Error('服务端返回的任务编号与当前分镜不一致')
      videoStatusErrorsRef.current.delete(requestKey)
      updateProject((current) => ({
        ...current,
        scenes: current.scenes.map((scene) => scene.id === sceneId && scene.videoTaskId === taskId
          ? {
            ...scene,
            videoStatus: result.status,
            videoProgress: result.progress,
            videoError: result.error,
            ...(result.videoUrl ? { videoUrl: result.videoUrl } : {}),
          }
          : scene),
      }))
      if (result.status === 'success') setNotice(result.videoUrl ? '视频已生成并保存到当前分镜' : result.error || '视频任务已完成')
      if (result.status === 'failed') setNotice(`视频生成失败：${result.error || '服务商任务失败'}`)
    } catch (error) {
      if (!videoStatusErrorsRef.current.has(requestKey)) {
        videoStatusErrorsRef.current.add(requestKey)
        setNotice(`视频状态查询失败：${error instanceof Error ? error.message : '请稍后重试'}`)
      }
    } finally {
      videoStatusRequestsRef.current.delete(requestKey)
    }
  }, [project.id, updateProject])

  useEffect(() => {
    if (!project.id || !activeVideoTaskKey || scriptView !== 'breakdown') return
    const tasks = project.scenes.filter((scene) => scene.videoTaskId && (scene.videoStatus === 'pending' || scene.videoStatus === 'running'))
    let cancelled = false
    let timer = 0
    const poll = async () => {
      if (cancelled) return
      const activeTasks = tasks.filter((scene) => {
        if (!scene.videoTaskId || !scene.videoTaskStartedAt) return true
        const age = Date.now() - new Date(scene.videoTaskStartedAt).getTime()
        if (Number.isFinite(age) && age > 70 * 60 * 1000) {
          const key = `${project.id}:${scene.id}:${scene.videoTaskId}`
          if (!videoTaskTimeoutNoticesRef.current.has(key)) {
            videoTaskTimeoutNoticesRef.current.add(key)
            setNotice('视频任务已超过 70 分钟，已停止自动轮询；可手动刷新状态')
          }
          return false
        }
        return true
      })
      if (!activeTasks.length) return
      await Promise.all(activeTasks.map((scene) => pollVideoTask(scene.id, scene.videoTaskId!)))
      if (!cancelled) timer = window.setTimeout(poll, 8000)
    }
    timer = window.setTimeout(poll, 8000)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [activeVideoTaskKey, project.id, project.scenes, scriptView, pollVideoTask])

  const navigateTo = (key: string) => {
    setActiveNav(key)
    if (key === 'canvas' || key === 'script') {
      setProjectEditorOpen(false)
    }
  }

  const createProject = async (projectType: ProjectType, idea = '') => {
    setProjectBusy(true)
    try {
      const created = await apiRequest<Project>('/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          projectType,
          title: projectType === 'canvas' ? '未命名画布' : '未命名短剧',
          subtitle: projectType === 'canvas' ? '故事画布 · 新项目' : '短剧工坊 · 新项目',
          scriptText: idea,
          scenes: [],
        }),
      })
      setSavedProjects((current) => [created, ...current])
      setProject(created)
      setScript(created.scriptText ?? '')
      setSelectedId('')
      setSaved(true)
      setProjectEditorOpen(true)
      setScriptView('editor')
      setActiveNav(projectType)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '新建项目失败')
    } finally {
      setProjectBusy(false)
    }
  }

  const openProject = async (id: string) => {
    setProjectBusy(true)
    try {
      const opened = await apiRequest<Project>(`/api/projects/${id}`)
      setProject(opened)
      setScript(opened.scriptText ?? '')
      setSelectedId(opened.scenes[0]?.id ?? '')
      setSaved(true)
      setProjectEditorOpen(true)
      setScriptView('editor')
      setActiveNav(opened.projectType ?? 'canvas')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '打开项目失败')
    } finally {
      setProjectBusy(false)
    }
  }

  const deleteProject = async (id: string) => {
    if (!window.confirm('确定删除这个项目吗？删除后无法恢复。')) return
    try {
      await apiRequest(`/api/projects/${id}`, { method: 'DELETE' })
      setSavedProjects((current) => current.filter((item) => item.id !== id))
      if (project.id === id) {
        setProject({ ...initialProject, id: undefined, projectType: undefined })
        setProjectEditorOpen(false)
        setSaved(true)
      }
      setNotice('项目已删除')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '删除项目失败')
    }
  }

  const updateScene = (id: string, patch: Partial<Scene>) => {
    updateProject((current) => ({ ...current, scenes: current.scenes.map((scene) => scene.id === id ? { ...scene, ...patch } : scene) }))
  }

  const addScene = () => {
    const id = `s${Date.now()}`
    const scene: Scene = {
      id, title: `新分镜 ${String(project.scenes.length + 1).padStart(2, '0')}`,
      description: '在这里写下这个画面的故事。', location: '未设定场景', time: '未设定时间',
      mood: '待补充', shot: '中景', color: 'blue', art: 'letter',
      x: 170 + (project.scenes.length % 3) * 70, y: 150 + project.scenes.length * 38,
    }
    updateProject((current) => ({ ...current, scenes: [...current.scenes, scene] }))
    setSelectedId(id)
    setActiveNav('canvas')
  }

  const handleCanvasPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('.scene-card, button, input, textarea')) return
    if (toolMode === 'pan' || event.shiftKey || spaceHeldRef.current || event.target === canvasRef.current || (event.target as HTMLElement).classList.contains('canvas-grid') || (event.target as HTMLElement).classList.contains('canvas-world')) {
      dragRef.current = { id: null, startX: event.clientX, startY: event.clientY, nodeX: 0, nodeY: 0, panX: offset.x, panY: offset.y }
      event.currentTarget.setPointerCapture(event.pointerId)
    }
  }

  const handleScenePointerDown = (event: PointerEvent<HTMLElement>, scene: Scene) => {
    if (toolMode === 'pan' || (event.target as HTMLElement).closest('button')) return
    event.stopPropagation()
    setSelectedId(scene.id)
    dragRef.current = { id: scene.id, startX: event.clientX, startY: event.clientY, nodeX: scene.x, nodeY: scene.y, panX: offset.x, panY: offset.y }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    const dx = (event.clientX - drag.startX) / zoom
    const dy = (event.clientY - drag.startY) / zoom
    if (drag.id) updateProject((current) => ({
      ...current,
      scenes: current.scenes.map((scene) => scene.id === drag.id ? { ...scene, x: Math.max(0, drag.nodeX + dx), y: Math.max(0, drag.nodeY + dy) } : scene),
    }))
    else setOffset({ x: drag.panX + event.clientX - drag.startX, y: drag.panY + event.clientY - drag.startY })
  }

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (event.ctrlKey || event.metaKey || Math.abs(event.deltaY) > 0) {
      event.preventDefault()
      setZoom((current) => Math.min(1.35, Math.max(0.48, current * (event.deltaY < 0 ? 1.06 : 0.94))))
    }
  }

  const getBreakdownInstructions = () => {
    const skillInstructions = selectedSkills
      .map((skill) => `【${skill.name}】\n${skill.content}`)
      .join('\n\n')
    const hasSkillPlaceholder = skillSettings.promptTemplate.includes('{skill}')
    const hasScriptPlaceholder = skillSettings.promptTemplate.includes('{script}')
    let prompt = skillSettings.promptTemplate
      .replaceAll('{skill}', skillInstructions)
      .replaceAll('{script}', '（剧本正文见下一条用户消息）')
    if (skillInstructions && !hasSkillPlaceholder) {
      prompt += `\n\n已选择的 Skill 创作规范：\n${skillInstructions}`
    }
    if (!hasScriptPlaceholder) {
      prompt += '\n\n剧本正文见下一条用户消息。'
    }
    return prompt
  }

  const createBreakdown = async () => {
    if (breakdownBusy || sceneReinferBusy || videoPromptReinferBusy) return
    if (!modelKeyHints.chat) {
      setNotice('请先在个人设置中配置聊天模型，再进行推理分镜')
      return
    }
    const prompt = getBreakdownInstructions()
    if (!prompt.trim()) {
      setNotice('SKILL 提示词模板不能为空')
      return
    }
    if (prompt.length > 30_000) {
      setNotice('SKILL 提示词内容过长，请精简模板或上传的 SKILL')
      return
    }
    try {
      setBreakdownBusy(true)
      const result = await apiRequest<{
        scenes: { title: string; description: string; videoPrompt?: string; location?: string; time?: string; mood?: string; shot?: string; assetReferences?: string[]; details?: Record<string, string> }[]
        characters?: Record<string, string>[]
        props?: Record<string, string>[]
        cost: number
      }>('/api/tools/breakdown', {
        method: 'POST', body: JSON.stringify({ script, instructions: prompt }),
      })
      const colors = ['amber', 'lilac', 'sage', 'rose']
      const created = result.scenes.map((item, index) => ({
        id: `s${Date.now()}-${index}`, title: item.title, description: item.description,
        videoPrompt: item.videoPrompt ?? item.description,
        assetReferences: item.assetReferences ?? [],
        location: 'location' in item && typeof item.location === 'string' ? item.location : '',
        time: 'time' in item && typeof item.time === 'string' ? item.time : '',
        mood: 'mood' in item && typeof item.mood === 'string' ? item.mood : '',
        shot: 'shot' in item && typeof item.shot === 'string' ? item.shot : '',
        color: colors[index % colors.length], art: ['rain', 'glass', 'letter', 'alley'][index % 4],
        x: 160 + (index % 2) * 440, y: 150 + Math.floor(index / 2) * 350,
        ...('details' in item && item.details ? { details: item.details } : {}),
      }))
      updateProject((current) => ({
        ...current,
        scriptText: script,
        scenes: [...current.scenes, ...created],
        breakdownTables: { characters: result.characters ?? [], props: result.props ?? [] },
      }))
      await refreshAccount()
      setScriptView('breakdown')
      setNotice(`已使用大模型按 ${selectedSkills.length} 个 Skill 推理出 ${created.length} 个分镜，消耗 ${result.cost} 积分，短剧项目已自动保存`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '剧本拆解失败')
    } finally {
      setBreakdownBusy(false)
    }
  }

  const reinferScene = async (scene: Scene) => {
    if (breakdownBusy || sceneReinferBusy || videoPromptReinferBusy) return
    if (!modelKeyHints.chat) {
      setNotice('请先在个人设置中配置聊天模型，再重新推理分镜')
      return
    }
    const sourceScript = project.scriptText?.trim() || script.trim()
    if (!sourceScript) {
      setNotice('当前项目没有剧本内容，无法重新推理')
      return
    }
    const instructions = getBreakdownInstructions()
    if (!instructions.trim()) {
      setNotice('SKILL 提示词模板不能为空')
      return
    }
    if (instructions.length > 30_000) {
      setNotice('SKILL 提示词内容过长，请精简模板或上传的 SKILL')
      return
    }
    try {
      setSceneReinferBusy(scene.id)
      const result = await apiRequest<{
        scenes: { title: string; description: string; videoPrompt?: string; location?: string; time?: string; mood?: string; shot?: string; assetReferences?: string[]; details?: Record<string, string> }[]
        cost: number
      }>('/api/tools/breakdown', {
        method: 'POST',
        body: JSON.stringify({
          script: sourceScript,
          instructions,
          targetScene: {
            title: scene.title,
            description: scene.description,
            location: scene.location,
            time: scene.time,
            mood: scene.mood,
            shot: scene.shot,
            videoPrompt: scene.videoPrompt,
            assetReferences: scene.assetReferences,
            details: scene.details,
          },
        }),
      })
      const updated = result.scenes[0]
      if (!updated) throw new Error('大模型没有返回可用的分镜，请重试')
      updateProject((current) => ({
        ...current,
        scenes: current.scenes.map((item) => item.id === scene.id
          ? {
            ...item,
            title: updated.title,
            description: updated.description,
            videoPrompt: updated.videoPrompt ?? updated.description,
            assetReferences: updated.assetReferences ?? item.assetReferences,
            location: updated.location ?? '',
            time: updated.time ?? '',
            mood: updated.mood ?? '',
            shot: updated.shot ?? '',
            details: updated.details,
          }
          : item),
      }))
      setEditingSceneIds((current) => current.includes(scene.id) ? current : [...current, scene.id])
      await refreshAccount()
      setNotice(`分镜已重新推理并进入编辑状态，消耗 ${result.cost} 积分`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '分镜重新推理失败')
    } finally {
      setSceneReinferBusy(null)
    }
  }

  const updateBreakdownScene = (sceneId: string, patch: Partial<Scene>) => {
    updateProject((current) => ({
      ...current,
      scenes: current.scenes.map((scene) => scene.id === sceneId ? { ...scene, ...patch } : scene),
    }))
  }

  const reinferVideoPrompt = async (scene: Scene) => {
    if (breakdownBusy || sceneReinferBusy || videoPromptReinferBusy) return
    if (!modelKeyHints.chat) {
      setNotice('请先在个人设置中配置聊天模型，再重新推理视频提示词')
      return
    }
    const sourceScript = project.scriptText?.trim() || script.trim()
    if (!sourceScript) {
      setNotice('当前项目没有剧本内容，无法重新推理视频提示词')
      return
    }
    const instructions = getBreakdownInstructions()
    if (!instructions.trim() || instructions.length > 30_000) {
      setNotice('SKILL 提示词为空或过长，请调整后重试')
      return
    }
    try {
      setVideoPromptReinferBusy(scene.id)
      const result = await apiRequest<{
        scenes: { videoPrompt?: string }[]
        cost: number
      }>('/api/tools/breakdown', {
        method: 'POST',
        body: JSON.stringify({
          script: sourceScript,
          instructions,
          mode: 'videoPrompt',
          targetScene: scene,
        }),
      })
      const videoPrompt = result.scenes[0]?.videoPrompt?.trim()
      if (!videoPrompt) throw new Error('大模型没有返回视频提示词，请重试')
      updateBreakdownScene(scene.id, { videoPrompt })
      await refreshAccount()
      setNotice(`视频提示词已重新推理，消耗 ${result.cost} 积分`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '视频提示词重新推理失败')
    } finally {
      setVideoPromptReinferBusy(null)
    }
  }

  const addSceneAssetReference = (scene: Scene, value: string) => {
    const reference = value.trim().slice(0, 200)
    if (!reference) return
    if ((scene.assetReferences ?? []).some((asset) => asset.toLowerCase() === reference.toLowerCase())) {
      setNotice('该资产已引用')
      return
    }
    updateBreakdownScene(scene.id, { assetReferences: [...(scene.assetReferences ?? []), reference] })
    setSceneReferenceDrafts((current) => ({ ...current, [scene.id]: '' }))
  }

  const toggleSceneAssetReference = (scene: Scene, reference: string) => {
    const currentReferences = scene.assetReferences ?? []
    const nextReferences = currentReferences.includes(reference)
      ? currentReferences.filter((item) => item !== reference)
      : [...currentReferences, reference]
    updateBreakdownScene(scene.id, { assetReferences: nextReferences })
  }

  const generateSceneVideo = async (scene: Scene) => {
    if (!modelKeyHints.video) {
      setNotice('请先在个人设置中配置视频模型')
      return
    }
    if (!project.id) {
      setNotice('请先保存当前短剧项目，再生成视频')
      return
    }
    if (modelForms.video.model !== 'muse-video') {
      setNotice('请在个人设置中将视频模型切换为 Muse Video（muse-video）并保存配置')
      return
    }
    if (!scene.videoPrompt?.trim()) {
      setNotice('请先填写视频提示词')
      return
    }
    if (scene.videoStatus === 'pending' || scene.videoStatus === 'running') {
      setNotice('该分镜已有视频任务正在处理中')
      return
    }
    const options = videoGenerationOptions[scene.id] ?? defaultVideoGenerationOptions
    if (!window.confirm(`即将向服务商提交 ${options.duration} 秒 Muse Video 任务，费用按时长计费。本站不扣积分，是否继续？`)) return
    try {
      setVideoGenerationBusy(scene.id)
      const result = await apiRequest<{ taskId: string; status: 'pending' | 'running'; progress: string; startedAt: string }>('/api/tools/video/generate', {
        method: 'POST',
        body: JSON.stringify({
          projectId: project.id,
          sceneId: scene.id,
          duration: options.duration,
          aspectRatio: options.aspectRatio,
        }),
      })
      updateProject((current) => ({
        ...current,
        scenes: current.scenes.map((item) => item.id === scene.id
          ? {
            ...item,
            videoTaskId: result.taskId,
            videoStatus: result.status,
            videoProgress: result.progress,
            videoError: '',
            videoTaskStartedAt: result.startedAt,
          }
          : item),
      }))
      setNotice('Muse Video 任务已提交；费用由服务商按时长收取，本站未扣积分')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '视频任务提交失败')
    } finally {
      setVideoGenerationBusy(null)
    }
  }

  const refreshSceneVideoStatus = async (scene: Scene) => {
    if (!scene.videoTaskId) return
    setVideoStatusRefreshing(scene.id)
    await pollVideoTask(scene.id, scene.videoTaskId)
    setVideoStatusRefreshing(null)
  }

  const enterSavedBreakdown = () => {
    if (!project.scenes.length) {
      setNotice('请先推理分镜，再进入分镜结果')
      return
    }
    setScriptView('breakdown')
  }

  const updateSelected = (key: keyof Scene, value: string) => {
    if (selectedScene) updateScene(selectedScene.id, { [key]: value })
  }

  const exportProject = () => {
    const file = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = `${project.title}-漫剧项目.json`
    link.click()
    URL.revokeObjectURL(url)
    setNotice('项目文件已导出')
  }

  const createImagePrompt = () => {
    if (!selectedScene) return
    setPromptText(`${selectedScene.title}，${selectedScene.description}。场景：${selectedScene.location}，${selectedScene.time}。情绪：${selectedScene.mood}。镜头：${selectedScene.shot}。国风电影感漫剧分镜，精致光影，叙事构图，画面细节丰富。`)
  }

  const copyImagePrompt = async () => {
    try {
      await navigator.clipboard.writeText(promptText)
      setPromptText('')
      setNotice('画面提示词已复制')
    } catch {
      setNotice('复制失败，请手动选择提示词')
    }
  }

  const importScriptDocument = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    input.value = ''

    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!['txt', 'text', 'md', 'markdown', 'docx'].includes(extension ?? '')) {
      setNotice('暂不支持此文件格式，请上传 .txt、.md 或 .docx 文件')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setNotice('文件不能超过 10 MB')
      return
    }
    if (script.trim() && !window.confirm('导入文档会替换当前剧本内容，是否继续？')) return

    setScriptImportBusy(true)
    try {
      const content = extension === 'docx'
        ? (await (await import('mammoth')).default.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value
        : await file.text()
      const normalizedContent = content.trim()
      if (!normalizedContent) {
        setNotice('文档中没有可导入的文字内容')
        return
      }
      if (normalizedContent.length > 500_000) {
        setNotice('文档文字超过 50 万字，请拆分后再导入')
        return
      }
      setScript(normalizedContent)
      updateProject((current) => ({ ...current, scriptText: normalizedContent }))
      setNotice(`已导入 ${file.name}`)
    } catch (error) {
      setNotice(error instanceof Error ? `文档读取失败：${error.message}` : '文档读取失败，请检查文件是否损坏')
    } finally {
      setScriptImportBusy(false)
    }
  }

  const uploadSkill = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!['md', 'txt', 'skill'].includes(extension ?? '')) {
      setNotice('SKILL 文件请使用 .md、.txt 或 .skill 格式')
      return
    }
    if (file.size > 1024 * 1024) {
      setNotice('SKILL 文件不能超过 1 MB')
      return
    }
    setSkillUploadBusy(true)
    try {
      const content = (await file.text()).trim()
      if (!content) {
        setNotice('文件中没有可用的 SKILL 内容')
        return
      }
      const name = file.name.replace(/\.(md|txt|skill)$/i, '').slice(0, 60) || '自定义 SKILL'
      const skill: CreativeSkill = {
        id: `uploaded-${crypto.randomUUID()}`,
        name,
        description: '你上传的自定义创作规范',
        content,
        source: 'uploaded',
      }
      setSkillSettings((current) => ({
        ...current,
        customSkills: [...current.customSkills, skill],
        selectedSkillIds: [...current.selectedSkillIds, skill.id],
      }))
      setNotice(`已导入 SKILL「${name}」，记得保存设置`)
    } catch (error) {
      setNotice(error instanceof Error ? `SKILL 读取失败：${error.message}` : 'SKILL 读取失败')
    } finally {
      setSkillUploadBusy(false)
    }
  }

  const saveSkillSettings = async (settingsToSave = skillSettings, closePicker = false) => {
    if (!user || !skillSettingsLoaded || skillSettingsSaving) return false
    setSkillSettingsSaving(true)
    try {
      const result = await apiRequest<{ settings: SkillSettings }>('/api/account/skills', {
        method: 'PUT',
        body: JSON.stringify(settingsToSave),
      })
      setSkillSettings(result.settings)
      if (closePicker) setSkillPickerOpen(false)
      setNotice(closePicker ? 'SKILL 已保存并应用于剧本拆解' : 'SKILL 选择和提示词模板已保存到账号')
      return true
    } catch (error) {
      setNotice(error instanceof Error ? `SKILL 设置保存失败：${error.message}` : 'SKILL 设置保存失败')
      return false
    } finally {
      setSkillSettingsSaving(false)
    }
  }

  const toggleSkillSelection = (skillId: string) => {
    setSkillSettings((current) => ({
      ...current,
      selectedSkillIds: current.selectedSkillIds.includes(skillId)
        ? current.selectedSkillIds.filter((id) => id !== skillId)
        : [...current.selectedSkillIds, skillId],
    }))
  }

  const removeUploadedSkill = (skillId: string) => {
    setSkillSettings((current) => ({
      ...current,
      customSkills: current.customSkills.filter((skill) => skill.id !== skillId),
      selectedSkillIds: current.selectedSkillIds.filter((id) => id !== skillId),
    }))
  }

  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAuthBusy(true)
    setAuthError('')
    try {
      const account = await apiRequest<AccountResponse>(`/api/auth/${authMode === 'register' ? 'register' : 'login'}`, {
        method: 'POST',
        body: JSON.stringify(authForm),
      })
      setProject(initialProject)
      setSelectedId('s2')
      setSaved(true)
      setProjectEditorOpen(false)
      applyAccount(account)
      setAuthForm((current) => ({ ...current, password: '' }))
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : '登录失败，请重试')
    } finally {
      setAuthBusy(false)
    }
  }

  const signOut = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' })
      setUser(null)
      setTransactions([])
      setActiveNav('home')
      setProjectEditorOpen(false)
      setAuthMode('login')
      setAuthForm((current) => ({ ...current, password: '' }))
      setNotice('已安全退出登录')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '退出登录失败')
    }
  }

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSettingsError('')
    try {
      const result = await apiRequest<{ user: User }>('/api/account/profile', {
        method: 'PATCH', body: JSON.stringify({ name: profileName }),
      })
      setUser((current) => current ? { ...current, ...result.user } : current)
      setNotice('个人资料已保存')
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : '资料保存失败')
    }
  }

  const mockRecharge = async (packageId: string) => {
    if (rechargeBusy) return
    setRechargeBusy(true)
    setSettingsError('')
    try {
      const account = await apiRequest<AccountResponse>('/api/account/recharge', {
        method: 'POST', body: JSON.stringify({ packageId }),
      })
      applyAccount(account)
      setNotice('测试积分已到账；此操作未产生真实扣款')
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : '充值失败')
    } finally {
      setRechargeBusy(false)
    }
  }

  const saveModelSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setModelBusy(true)
    setSettingsError('')
    try {
      await apiRequest('/api/account/model', { method: 'PUT', body: JSON.stringify({ ...modelForms[modelKind], kind: modelKind }) })
      const account = await apiRequest<AccountResponse>('/api/auth/me')
      applyAccount(account)
      setNotice(`${modelKindLabels[modelKind]}配置已加密保存`)
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'API 配置保存失败')
    } finally {
      setModelBusy(false)
    }
  }

  const testModelConnection = async () => {
    setModelTestBusy(true)
    setSettingsError('')
    try {
      const result = await apiRequest<{ connected: boolean; model: string; modelAvailable?: boolean; availableModels?: string[] }>('/api/account/model/test', {
        method: 'POST', body: JSON.stringify({ kind: modelKind }),
      })
      setNotice(result.modelAvailable === false
        ? `API 已连接，但模型列表中未找到「${result.model}」。可用模型：${result.availableModels?.slice(0, 8).join('、') || '请向服务商确认模型 ID'}`
        : `连接成功 · ${result.model}`)
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : '连接测试失败')
    } finally {
      setModelTestBusy(false)
    }
  }

  const clearModelSettings = async () => {
    setModelBusy(true)
    setSettingsError('')
    try {
      await apiRequest('/api/account/model', { method: 'PUT', body: JSON.stringify({ clear: true, kind: modelKind }) })
      setModelKeyHints((current) => ({ ...current, [modelKind]: '' }))
      setModelForms((current) => ({ ...current, [modelKind]: emptyModelForm(modelKind) }))
      setUser((current) => current ? {
        ...current,
        models: { ...current.models, [modelKind]: null },
        ...(modelKind === 'chat' ? { model: null } : {}),
      } : current)
      setNotice(`已移除${modelKindLabels[modelKind]}配置`)
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : '移除配置失败')
    } finally {
      setModelBusy(false)
    }
  }

  const setProviderPreset = (kind: ModelKind, provider: string) => {
    const presets: Record<string, Pick<ModelForm, 'baseUrl' | 'model'>> = {
      OpenAI: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
      DeepSeek: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
      SiliconFlow: { baseUrl: 'https://api.siliconflow.cn/v1', model: 'Qwen/Qwen2.5-7B-Instruct' },
      '阿里云百炼': { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
      Ollama: { baseUrl: 'http://localhost:11434/v1', model: 'qwen2.5' },
      自定义: { baseUrl: modelForms[kind].baseUrl, model: modelForms[kind].model },
    }
    const preset = provider === 'AI模型聚合平台'
      ? { baseUrl: 'https://api.lk888.ai/v1', model: kind === 'video' ? 'muse-video' : modelForms[kind].model }
      : presets[provider]
    setModelForms((current) => ({ ...current, [kind]: { ...current[kind], provider, ...(preset ?? {}) } }))
  }

  const isProjectEditor = projectEditorOpen && project.projectType === activeNav
  const pageTitles: Record<string, string> = {
    home: '创作首页',
    canvas: '无限画布',
    script: '短剧工坊',
    skills: 'SKILL',
    characters: '角色设定',
    export: '作品管理',
    settings: '个人设置',
  }
  const visibleProjects = savedProjects.filter((item) => item.projectType === activeNav)
  const createProjectFromHome = () => createProject('script', idea.trim())

  return (
    <div className="app-shell">
      <aside className="rail">
        <div className="brand-mark"><span>墨</span><i /></div>
        <div className="rail-divider" />
        {navItems.map(({ icon: Icon, label, key }) => (
          <button key={key} className={`rail-button ${activeNav === key ? 'active' : ''}`} onClick={() => navigateTo(key)} title={label}>
            <Icon size={19} strokeWidth={1.7} /><span className="rail-tooltip">{label}</span>
          </button>
        ))}
        <div className="rail-spacer" />
        <button className="rail-button" title="帮助" onClick={() => navigateTo('settings')}><CircleHelp size={19} strokeWidth={1.7} /></button>
        <button className="avatar" title="个人中心" onClick={() => { navigateTo('settings'); setSettingsTab('profile') }}>{user?.name.slice(0, 1) ?? '墨'}</button>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="topbar-project">
            <button className="back-button" onClick={() => navigateTo('home')} title="返回首页"><ArrowLeft size={16} /></button>
            <div className="crumb">墨序工作室 <ChevronRight size={13} /> <span>{isProjectEditor ? project.title : pageTitles[activeNav]}</span></div>
            {isProjectEditor && <span className="save-state"><i className={saved ? 'saved' : ''} />{saved ? '已保存' : '正在保存'}</span>}
          </div>
          <div className="topbar-actions">
            {user && <button className="credit-pill" onClick={() => { setActiveNav('settings'); setSettingsTab('credits') }}><Coins size={14} /> <b>{user.credits}</b><span>积分</span></button>}
            <button className="top-icon" title="搜索"><Search size={17} /></button>
            <button className="top-icon" title="通知"><Bell size={17} /><i className="notification-dot" /></button>
            <span className="top-separator" />
            {isProjectEditor && <button className="share-button" onClick={exportProject}><ArrowDownToLine size={15} /> 导出项目</button>}
            {activeNav === 'home' && <button className="publish-button" onClick={() => createProject('canvas')}><Plus size={15} /> 新建画布</button>}
            {isProjectEditor && project.projectType === 'canvas' && <button className="publish-button" onClick={() => setNotice('成片渲染需要接入视频生成服务，当前工作台暂不支持')}><Sparkles size={15} /> 生成成片</button>}
          </div>
        </header>

        {isProjectEditor && <div className="project-heading editor-heading">
          <div>
            <div className="eyebrow"><span className="eyebrow-line" /> {project.projectType === 'canvas' ? 'INFINITE CANVAS' : 'SCRIPT WORKSHOP'} <span className="heading-id">#{project.id?.slice(0, 6).toUpperCase()}</span></div>
            <input className="project-title-input" aria-label="项目名称" value={project.title} onChange={(event) => updateProject((current) => ({ ...current, title: event.target.value }))} />
            <div className="project-subtitle">{project.subtitle}<span className="subtitle-divider">·</span><Clock3 size={12} /> {project.scenes.length} 个场景</div>
          </div>
          <div className="heading-meta"><button className="outline-button" onClick={() => navigateTo(project.projectType ?? 'canvas')}><FolderOpen size={14} /> 所有项目</button></div>
        </div>}

        <main className="main-content">
          {isProjectEditor && project.projectType === 'canvas' && <div className="canvas-top">
            <div className="canvas-tabs">
              <div className="canvas-tab selected"><Frame size={15} /> 故事画布 <span className="tab-count">{project.scenes.length}</span></div>
            </div>
            <div className="canvas-actions">
              <button className="canvas-action subtle" onClick={() => updateProject((current) => ({ ...current, scenes: current.scenes.map((scene, index) => ({ ...scene, x: 150 + (index % 2) * 410, y: 145 + Math.floor(index / 2) * 350 })) }))}><div className="status-pulse" /> 自动布局</button>
              <span className="action-divider" />
              <button className={`canvas-action tool ${toolMode === 'select' ? 'tool-active' : ''}`} title="选择工具" onClick={() => setToolMode('select')}><MousePointer2 size={16} /></button>
              <button className={`canvas-action tool ${toolMode === 'pan' ? 'tool-active' : ''}`} title="移动画布" onClick={() => setToolMode('pan')}><Move size={16} /></button>
              <button className="canvas-action" title="画布设置"><Settings2 size={16} /></button>
              <button className="canvas-action" title="适应画布" onClick={() => { setZoom(0.82); setOffset({ x: 0, y: 0 }) }}><Maximize size={15} /></button>
            </div>
          </div>
          }

          {activeNav === 'home' ? (
            <section className="home-view">
              <div className="home-hero">
                <div className="tool-kicker">A STUDIO FOR YOUR IMAGINATION</div>
                <h1>好故事，<em>从一句话开始。</em></h1>
                <p>写下脑海中的那束光。让灵感成为分镜、角色与一场值得观看的故事。</p>
                <div className="idea-composer">
                  <Sparkles size={17} />
                  <textarea aria-label="灵感来自一句话" value={idea} onChange={(event) => setIdea(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && idea.trim()) { event.preventDefault(); createProjectFromHome() } }} placeholder="灵感来自一句话" />
                  <button disabled={projectBusy} onClick={createProjectFromHome}>{projectBusy ? '正在创建…' : '开启创作'} <ArrowRight size={15} /></button>
                </div>
                <div className="home-quick-actions">
                  <button onClick={() => createProject('canvas')}><Frame size={15} /><span><b>无限画布</b><small>自由编排每个故事镜头</small></span><Plus size={15} /></button>
                  <button onClick={() => createProject('script', idea.trim())}><FileText size={15} /><span><b>短剧工坊</b><small>从剧本拆解出完整分镜</small></span><Plus size={15} /></button>
                </div>
              </div>
              <div className="showcase-section">
                <div className="showcase-heading"><div><span className="tool-kicker">MADE WITH MOXU</span><h2>灵感作品集</h2></div><button onClick={() => navigateTo('export')}>查看全部 <ArrowRight size={14} /></button></div>
                <div className="showcase-columns">
                  <section className="showcase-column"><div className="showcase-label"><span><Image size={15} /> 画面灵感</span><small>IMAGE STUDIES · 03</small></div>
                    <div className="image-gallery">{[
                      ['art-rain', '雨停之前', '雾山来信 · Frame 01', '雨夜'],
                      ['art-glass', '玻璃另一侧', '无声告白 · Frame 08', '重逢'],
                      ['art-letter', '被遗忘的信', '十年以后 · Frame 03', '回忆'],
                    ].map(([style, title, caption, tag]) => <button className="gallery-image-card" key={title} onClick={() => createProject('canvas')}><div className={`gallery-image ${style}`}><div className="art-orb" /><div className="art-horizon" /><div className="art-foreground" /><span>{tag}</span><i><Plus size={14} /></i></div><b>{title}</b><small>{caption}</small></button>)}</div>
                  </section>
                  <section className="showcase-column"><div className="showcase-label"><span><Video size={15} /> 漫剧短片</span><small>MOTION STORIES · 02</small></div>
                    <div className="video-gallery">{[
                      ['video-rain', '山城雨夜', '00:38', '雾山来信 · 预告片'],
                      ['video-dawn', '天亮之后', '01:12', '写给明天 · 第 01 集'],
                    ].map(([style, title, duration, caption]) => <button className="gallery-video-card" key={title} onClick={() => setNotice('视频预览将在成片渲染服务接入后开放')}><div className={`gallery-video ${style}`}><div className="video-play"><Video size={17} /></div><span>{duration}</span></div><b>{title}</b><small>{caption}</small></button>)}</div>
                  </section>
                </div>
              </div>
              <div className="recent-projects">
                <div className="showcase-heading"><div><span className="tool-kicker">PICK UP WHERE YOU LEFT OFF</span><h2>最近创作</h2></div><button onClick={() => navigateTo('canvas')}>项目空间 <ArrowRight size={14} /></button></div>
                <div className="recent-project-list">{savedProjects.slice(0, 3).map((item) => <button key={item.id} onClick={() => openProject(item.id!)}><span className={`recent-project-icon ${item.projectType}`}>{item.projectType === 'canvas' ? <Frame size={15} /> : <FileText size={15} />}</span><span><b>{item.title}</b><small>{item.projectType === 'canvas' ? '无限画布' : '短剧工坊'} · {item.scenes.length} 个场景</small></span><ArrowRight size={14} /></button>)}{savedProjects.length === 0 && <p>你的故事正等待开始。选择上方任一创作方式，项目会自动保存到这里。</p>}</div>
              </div>
            </section>
          ) : activeNav === 'canvas' && !isProjectEditor ? (
            <section className="library-view">
              <div className="library-heading"><div><div className="tool-kicker">INFINITE CANVAS / PROJECTS</div><h1>故事，在这里自由生长。</h1><p>创建独立画布项目，节点位置与分镜内容会自动保存。</p></div><button className="publish-button" disabled={projectBusy} onClick={() => createProject('canvas')}><Plus size={15} /> 新建画布项目</button></div>
              <div className="project-library-grid">{visibleProjects.map((item) => <article className="library-project-card" key={item.id}><div className="library-project-art"><div className="library-art-dots"><i /><i /><i /><i /></div><span>CANVAS / {item.scenes.length} FRAMES</span><button onClick={() => deleteProject(item.id!)} title="删除项目">×</button></div><div className="library-project-info"><span className="library-project-type"><Frame size={12} /> 无限画布</span><h3>{item.title}</h3><p>{item.subtitle}</p><div><small>{new Date(item.updatedAt).toLocaleString('zh-CN')}</small><button onClick={() => openProject(item.id!)}>继续创作 <ArrowRight size={13} /></button></div></div></article>)}{visibleProjects.length === 0 && <div className="library-empty"><span><Frame size={22} /></span><h3>第一张故事画布</h3><p>新建一个项目，开始摆放场景与分镜。每个项目都独立保存，随时回来继续。</p><button className="outline-button" onClick={() => createProject('canvas')}><Plus size={14} /> 新建画布项目</button></div>}</div>
            </section>
          ) : activeNav === 'script' && !isProjectEditor ? (
            <section className="library-view">
              <div className="library-heading"><div><div className="tool-kicker">SCRIPT WORKSHOP / PROJECTS</div><h1>把文字，写成故事。</h1><p>每个短剧都是独立项目。剧本与已拆解分镜会自动保存。</p></div><button className="publish-button" disabled={projectBusy} onClick={() => createProject('script')}><Plus size={15} /> 新建短剧项目</button></div>
              <div className="project-library-grid">{visibleProjects.map((item) => <article className="library-project-card" key={item.id}><div className="library-project-art script-art"><div className="script-art-line" /><div className="script-art-line short" /><div className="script-art-line" /><span>SCRIPT / {item.scenes.length} SCENES</span><button onClick={() => deleteProject(item.id!)} title="删除项目">×</button></div><div className="library-project-info"><span className="library-project-type"><FileText size={12} /> 短剧工坊</span><h3>{item.title}</h3><p>{item.scriptText?.slice(0, 50) || '还没有写下故事内容'}</p><div><small>{new Date(item.updatedAt).toLocaleString('zh-CN')}</small><button onClick={() => openProject(item.id!)}>继续创作 <ArrowRight size={13} /></button></div></div></article>)}{visibleProjects.length === 0 && <div className="library-empty"><span><FileText size={22} /></span><h3>写下第一集</h3><p>新建独立短剧项目，写下灵感、拆解分镜，稍后返回也会保留进度。</p><button className="outline-button" onClick={() => createProject('script')}><Plus size={14} /> 新建短剧项目</button></div>}</div>
            </section>
          ) : activeNav === 'script' && isProjectEditor ? (
            scriptView === 'breakdown' ? (
              <section className="tool-view breakdown-view">
                <div className="breakdown-page-heading">
                  <div className="tool-view-head">
                    <div className="tool-kicker">STORYBOARD BREAKDOWN / {String(project.scenes.length).padStart(2, '0')} SCENES</div>
                    <h2>视频分镜提示词已准备就绪。</h2>
                    <p>每个分镜都可以编辑视频提示词、引用角色或道具资产，并在生成视频接口接入后进行预览。</p>
                  </div>
                  <button className="outline-button" onClick={() => setScriptView('editor')}><ArrowLeft size={14} /> 返回剧本编辑</button>
                </div>
                <div className="breakdown-result-list">
                  {project.scenes.map((scene, index) => {
                    const availableReferences = [...(project.breakdownTables?.characters ?? []), ...(project.breakdownTables?.props ?? [])]
                      .map((asset) => asset['角色名称'] ?? asset['道具名称'] ?? asset['名称'] ?? asset.name ?? Object.values(asset)[0] ?? '')
                      .filter((name): name is string => Boolean(name))
                    const videoOptions = videoGenerationOptions[scene.id] ?? defaultVideoGenerationOptions
                    const videoStatusLabels = { pending: '等待中', running: '生成中', success: '已完成', failed: '生成失败' } as const
                    return (
                    <article className="breakdown-scene-card" key={scene.id}>
                      <div className="breakdown-scene-number">{String(index + 1).padStart(2, '0')}<span /></div>
                      <div className="breakdown-scene-content">
                        <div className="breakdown-scene-card-heading">
                          <div className="breakdown-scene-kicker">SCENE {String(index + 1).padStart(2, '0')}</div>
                          <div className="breakdown-scene-actions">
                            <button
                              className="breakdown-scene-action"
                              type="button"
                              onClick={() => setEditingSceneIds((current) => current.includes(scene.id) ? current.filter((id) => id !== scene.id) : [...current, scene.id])}
                              disabled={sceneReinferBusy !== null}
                            >
                              {editingSceneIds.includes(scene.id) ? <Check size={12} /> : <SquarePen size={12} />}
                              {editingSceneIds.includes(scene.id) ? '完成编辑' : '编辑'}
                            </button>
                            <button
                              className="breakdown-scene-action reinfer"
                              type="button"
                              onClick={() => reinferScene(scene)}
                              disabled={breakdownBusy || sceneReinferBusy !== null || videoPromptReinferBusy !== null}
                              title="重新推理此分镜将消耗 5 积分"
                            >
                              <RefreshCw size={12} className={sceneReinferBusy === scene.id ? 'spinning' : ''} />
                              {sceneReinferBusy === scene.id ? '推理中…' : '重新推理分镜 · 5积分'}
                            </button>
                          </div>
                        </div>
                        <div className={`scene-video-preview ${scene.videoUrl ? 'has-video' : `art-${scene.art}`}`}>
                          {scene.videoUrl
                            ? <video src={scene.videoUrl} controls preload="metadata" />
                            : <div className="scene-video-empty"><Video size={25} /><span>视频生成后将在这里预览</span><small>VIDEO PREVIEW / {String(index + 1).padStart(2, '0')}</small></div>}
                        </div>
                        <div className="video-prompt-editor">
                          <div className="video-prompt-heading">
                            <label htmlFor={`video-prompt-${scene.id}`}>视频提示词</label>
                            <div>
                              <button
                                type="button"
                                className="video-prompt-tool"
                                title="放大编辑区"
                                onClick={() => setExpandedVideoPromptSceneId(scene.id)}
                              ><Maximize size={12} /> 放大编辑</button>
                              <button
                                type="button"
                                className="video-prompt-tool reinfer"
                                disabled={breakdownBusy || sceneReinferBusy !== null || videoPromptReinferBusy !== null}
                                onClick={() => reinferVideoPrompt(scene)}
                                title="重新推理视频提示词将消耗 5 积分"
                              ><RefreshCw size={12} className={videoPromptReinferBusy === scene.id ? 'spinning' : ''} />
                                {videoPromptReinferBusy === scene.id ? '推理中…' : '重新推理提示词 · 5积分'}
                              </button>
                            </div>
                          </div>
                          <textarea
                            id={`video-prompt-${scene.id}`}
                            className="video-prompt-textarea"
                            value={scene.videoPrompt ?? ''}
                            placeholder="推理后会生成可直接用于视频模型的提示词，也可以在这里手动编辑…"
                            maxLength={8000}
                            onChange={(event) => updateBreakdownScene(scene.id, { videoPrompt: event.target.value })}
                          />
                        </div>
                        <section className="scene-assets">
                          <div className="scene-assets-heading"><span><ImagePlus size={13} /> 引用资产</span><small>角色 / 道具</small></div>
                          {availableReferences.length > 0 && <div className="scene-asset-options">
                            {[...new Set(availableReferences)].map((reference) => <button
                              key={reference}
                              type="button"
                              className={(scene.assetReferences ?? []).includes(reference) ? 'selected' : ''}
                              onClick={() => toggleSceneAssetReference(scene, reference)}
                            >{reference}</button>)}
                          </div>}
                          <div className="scene-asset-input-row">
                            <input
                              value={sceneReferenceDrafts[scene.id] ?? ''}
                              placeholder="输入资产名称或图片链接"
                              onChange={(event) => setSceneReferenceDrafts((current) => ({ ...current, [scene.id]: event.target.value }))}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                  event.preventDefault()
                                  addSceneAssetReference(scene, sceneReferenceDrafts[scene.id] ?? '')
                                }
                              }}
                            />
                            <button type="button" onClick={() => addSceneAssetReference(scene, sceneReferenceDrafts[scene.id] ?? '')}><Plus size={13} /> 添加</button>
                          </div>
                          {(scene.assetReferences ?? []).length > 0
                            ? <div className="scene-asset-chips">{scene.assetReferences?.map((reference) => <button key={reference} type="button" onClick={() => toggleSceneAssetReference(scene, reference)} title="移除引用"> {reference} <span>×</span></button>)}</div>
                            : <p className="scene-assets-empty">尚未引用资产；可从角色/道具中选择，或手动添加名称和图片链接。</p>}
                        </section>
                        {editingSceneIds.includes(scene.id) ? <>
                          <input
                            className="breakdown-edit-input breakdown-edit-title"
                            aria-label={`编辑分镜 ${index + 1} 标题`}
                            value={scene.title}
                            maxLength={100}
                            disabled={sceneReinferBusy === scene.id}
                            onChange={(event) => updateBreakdownScene(scene.id, { title: event.target.value })}
                          />
                          <textarea
                            className="breakdown-edit-textarea"
                            aria-label={`编辑分镜 ${index + 1} 描述`}
                            value={scene.description}
                            maxLength={2000}
                            disabled={sceneReinferBusy === scene.id}
                            onChange={(event) => updateBreakdownScene(scene.id, { description: event.target.value })}
                          />
                          <div className="breakdown-edit-fields">
                            {([
                              ['location', '场景地点'],
                              ['time', '时间氛围'],
                              ['mood', '镜头情绪'],
                              ['shot', '镜头语言'],
                            ] as const).map(([key, label]) => (
                              <label key={key}>
                                <span>{label}</span>
                                <input
                                  className="breakdown-edit-input"
                                  value={scene[key]}
                                  disabled={sceneReinferBusy === scene.id}
                                  onChange={(event) => updateBreakdownScene(scene.id, { [key]: event.target.value })}
                                />
                              </label>
                            ))}
                          </div>
                          {scene.details && Object.keys(scene.details).length > 0 && <dl className="breakdown-scene-details">
                            {Object.entries(scene.details).map(([label, value]) => <div key={label}>
                              <dt>{label}</dt>
                              <dd><textarea
                                className="breakdown-edit-textarea detail"
                                aria-label={`编辑${label}`}
                                value={value}
                                disabled={sceneReinferBusy === scene.id}
                                onChange={(event) => updateBreakdownScene(scene.id, { details: { ...scene.details, [label]: event.target.value } })}
                              /></dd>
                            </div>)}
                          </dl>}
                        </> : <>
                          <h3>{scene.title}</h3>
                          <p>{scene.description}</p>
                          {scene.details && Object.keys(scene.details).length > 0
                            ? <dl className="breakdown-scene-details">{Object.entries(scene.details).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
                            : <div className="breakdown-scene-meta">
                              {scene.location && <span><b>场景</b>{scene.location}</span>}
                              {scene.time && <span><b>时间</b>{scene.time}</span>}
                              {scene.mood && <span><b>情绪</b>{scene.mood}</span>}
                              {scene.shot && <span><b>镜头</b>{scene.shot}</span>}
                            </div>}
                        </>}
                        <div className="video-generation-options">
                          <label>时长<select
                            value={videoOptions.duration}
                            onChange={(event) => setVideoGenerationOptions((current) => ({
                              ...current,
                              [scene.id]: { ...videoOptions, duration: event.target.value },
                            }))}
                          >{Array.from({ length: 27 }, (_, durationIndex) => String(durationIndex + 4)).map((duration) => <option key={duration} value={duration}>{duration} 秒</option>)}</select></label>
                          <label>画幅<select
                            value={videoOptions.aspectRatio}
                            onChange={(event) => setVideoGenerationOptions((current) => ({
                              ...current,
                              [scene.id]: { ...videoOptions, aspectRatio: event.target.value },
                            }))}
                          >{['16:9', '9:16'].map((ratio) => <option key={ratio} value={ratio}>{ratio}</option>)}</select></label>
                        </div>
                        <p className="video-billing-note">Muse Video 输出 720p，支持文生视频或单张参考图；服务商按秒计费，本站不扣积分。</p>
                        {scene.videoTaskId && <div className={`video-task-status status-${scene.videoStatus ?? 'pending'}`}>
                          <span>{videoStatusLabels[scene.videoStatus ?? 'pending']}{scene.videoProgress ? ` · ${scene.videoProgress}` : ''}</span>
                          <button
                            type="button"
                            onClick={() => refreshSceneVideoStatus(scene)}
                            disabled={videoStatusRefreshing === scene.id}
                          >{videoStatusRefreshing === scene.id ? '查询中…' : '刷新状态'}</button>
                          {scene.videoError && <p>{scene.videoError}</p>}
                        </div>}
                        <button
                          className="generate-scene-video"
                          type="button"
                          onClick={() => generateSceneVideo(scene)}
                          disabled={videoGenerationBusy !== null || scene.videoStatus === 'pending' || scene.videoStatus === 'running'}
                        >
                          <Video size={14} />
                          {videoGenerationBusy === scene.id ? '提交中…' : scene.videoUrl ? '重新生成视频' : '生成视频'}
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    </article>
                    )
                  })}
                </div>
                {(['characters', 'props'] as const).map((tableName) => {
                  const rows = project.breakdownTables?.[tableName] ?? []
                  if (!rows.length) return null
                  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))]
                  return <section className="breakdown-data-table" key={tableName}>
                    <h3>{tableName === 'characters' ? '角色设定表' : '道具信息表'}</h3>
                    <div className="breakdown-table-scroll"><table><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
                      <tbody>{rows.map((row, index) => <tr key={`${tableName}-${index}`}>{columns.map((column) => <td key={column}>{row[column] ?? ''}</td>)}</tr>)}</tbody>
                    </table></div>
                  </section>
                })}
              </section>
            ) : <section className="tool-view">
              <div className="tool-view-head"><div className="tool-kicker">SCRIPT TO STORYBOARD / 01</div><h2>让故事，长出画面。</h2><p>剧本内容和生成的分镜已独立保存，可随时从「短剧工坊」项目列表继续。</p></div>
              <div className="script-workbench">
                <div className="script-input-panel">
                  <div className="panel-title"><span><FileText size={16} /> 故事原文</span><span className="word-count">{script.length} 字</span></div>
                  <textarea value={script} onChange={(event) => { setScript(event.target.value); updateProject((current) => ({ ...current, scriptText: event.target.value })) }} placeholder="在这里写下你的故事梗概、剧本片段或灵感……" />
                  <div className="script-footer">
                    <div className="script-footer-start">
                      <label className={`script-upload-button ${scriptImportBusy ? 'disabled' : ''}`} title="上传并导入 TXT、Markdown 或 DOCX 文档">
                        <input type="file" accept=".txt,.text,.md,.markdown,.docx,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={importScriptDocument} disabled={scriptImportBusy} />
                        <Plus size={15} /><span>{scriptImportBusy ? '读取中…' : '导入文档'}</span>
                      </label>
                      <div className="skill-picker-anchor">
                        <button type="button" className={`skill-picker-trigger ${skillPickerOpen ? 'active' : ''}`} aria-expanded={skillPickerOpen} onClick={() => setSkillPickerOpen((open) => !open)}>
                          <Plus size={13} /> 选择 Skill <span>{selectedSkills.length}</span><ChevronDown size={12} />
                        </button>
                        {skillPickerOpen && <div className="skill-picker-menu" role="dialog" aria-label="选择用于剧本拆解的 Skill">
                          <div className="skill-picker-heading">
                            <div><b>选择拆解 Skill</b><span>可多选，包含你在侧边栏 SKILL 中上传的内容</span></div>
                            <label className={`skill-picker-upload ${skillUploadBusy ? 'disabled' : ''}`}>
                              <input type="file" accept=".md,.txt,.skill,text/markdown,text/plain" onChange={uploadSkill} disabled={skillUploadBusy} />
                              <Plus size={12} />{skillUploadBusy ? '上传中…' : '上传Skill'}
                            </label>
                          </div>
                          <div className="skill-picker-options">
                            {builtInSkills.map((skill) => <label key={skill.id} className="skill-picker-option">
                              <input type="checkbox" checked={skillSettings.selectedSkillIds.includes(skill.id)} onChange={() => toggleSkillSelection(skill.id)} />
                              <span><b>{skill.name}</b><small>{skill.description}</small></span>
                            </label>)}
                            {skillSettings.customSkills.length > 0 ? <>
                              <div className="skill-picker-group-title">我的 SKILL</div>
                              {skillSettings.customSkills.map((skill) => <label key={skill.id} className="skill-picker-option">
                                <input type="checkbox" checked={skillSettings.selectedSkillIds.includes(skill.id)} onChange={() => toggleSkillSelection(skill.id)} />
                                <span><b>{skill.name}</b><small>{skill.description}</small></span>
                              </label>)}
                            </> : <div className="skill-picker-empty">还没有自定义 Skill。可在侧边栏「SKILL」上传后，在此选择。</div>}
                          </div>
                          <div className="skill-picker-footer"><span>已选 {selectedSkills.length} 个</span><button type="button" disabled={skillSettingsSaving || !skillSettingsLoaded} onClick={() => { void saveSkillSettings(skillSettings, true) }}>{skillSettingsSaving ? '保存中…' : '保存并应用'}</button></div>
                        </div>}
                      </div>
                      <span className="script-save-state"><Sparkles size={13} /> {saved ? '已自动保存' : '正在保存'}</span>
                    </div>
                    <div className="script-footer-actions">
                      <button className="outline-button" type="button" onClick={enterSavedBreakdown}><Frame size={14} /> 进入分镜</button>
                      <button className="generate-button" type="button" onClick={createBreakdown} disabled={breakdownBusy}><WandSparkles size={15} /> {breakdownBusy ? '正在推理…' : '推理分镜'} {!breakdownBusy && <ArrowRight size={15} />}</button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : activeNav === 'skills' ? (
            <section className="tool-view skills-view">
              <div className="skills-page-heading">
                <div className="tool-view-head"><div className="tool-kicker">CREATIVE SKILLS / PROMPT LIBRARY</div><h2>为你的创作，设定专属方法。</h2><p>选择创作规范、导入自己的 SKILL，并编写剧本拆解时使用的提示词模板。</p></div>
                <button className="publish-button" onClick={() => { void saveSkillSettings() }} disabled={!user || !skillSettingsLoaded || skillSettingsSaving}><Check size={15} /> {skillSettingsSaving ? '保存中…' : '保存设置'}</button>
              </div>
              {!user && <div className="skills-callout"><LockKeyhole size={15} /> 登录后即可保存并使用你的 SKILL 配置。</div>}
              <section className="skills-library">
                <div className="skills-section-heading"><div><h3>创作 SKILL</h3><p>可多选规范组合用于剧本拆解，也可以导入自己的 .md、.txt 或 .skill 文件。</p></div><label className={`outline-button skill-upload ${skillUploadBusy ? 'disabled' : ''}`}><input type="file" accept=".md,.txt,.skill,text/markdown,text/plain" onChange={uploadSkill} disabled={skillUploadBusy} /><Plus size={14} />{skillUploadBusy ? '导入中…' : '上传 SKILL'}</label></div>
                {!skillSettingsLoaded ? <div className="skills-loading">正在读取此账号的 SKILL 设置…</div> : <div className="skill-card-grid">
                  {[...builtInSkills, ...skillSettings.customSkills].map((skill) => (
                    <article key={skill.id} className={`skill-card ${skillSettings.selectedSkillIds.includes(skill.id) ? 'selected' : ''}`}>
                      <button className="skill-card-main" onClick={() => toggleSkillSelection(skill.id)}>
                        <span className="skill-card-icon">{skill.source === 'built-in' ? <WandSparkles size={16} /> : <FileText size={16} />}</span>
                        <span className="skill-card-copy"><b>{skill.name}</b><small>{skill.description}</small></span>
                        {skillSettings.selectedSkillIds.includes(skill.id) && <Check className="skill-selected-check" size={16} />}
                      </button>
                      {skill.source === 'uploaded' && <button className="skill-delete" aria-label={`删除 ${skill.name}`} title="删除此 SKILL" onClick={() => removeUploadedSkill(skill.id)}><Trash2 size={13} /></button>}
                    </article>
                  ))}
                </div>}
              </section>
              <section className="prompt-template-panel">
                <div className="skills-section-heading"><div><h3>个人提示词模板</h3><p>模板会在短剧工坊拆解分镜时使用，支持 <code>{'{skill}'}</code> 和 <code>{'{script}'}</code> 两个变量。</p></div><span className="settings-badge connected"><span className="model-status-dot" />仅此账号</span></div>
                <textarea className="prompt-template-input" aria-label="个人提示词模板" value={skillSettings.promptTemplate} maxLength={20_000} onChange={(event) => setSkillSettings((current) => ({ ...current, promptTemplate: event.target.value }))} placeholder="请写下你希望模型遵循的提示词模板…" />
                <div className="prompt-template-footer"><span>当前选择：{selectedSkills.map((skill) => skill.name).join('、') || '未选择 Skill'} · 设置保存到当前账号</span><span>{skillSettings.promptTemplate.length.toLocaleString()} / 20,000</span></div>
              </section>
              <div className="skills-callout"><Sparkles size={15} /><span>点击“推理分镜”后，系统会将所选 Skill、个人提示词模板和剧本发送给聊天模型进行推理；未配置聊天模型时不会进行本地替代拆分。</span></div>
            </section>
          ) : activeNav === 'characters' ? (
            <section className="tool-view character-view"><div className="tool-view-head"><div className="tool-kicker">CHARACTER DESIGN / 02</div><h2>让角色，有迹可循。</h2><p>沉淀角色的外形、性格与故事弧光，让每一帧都保持一致。</p></div><div className="character-card"><div className="character-portrait">晚</div><div><div className="character-tag">PROTAGONIST · 女主角</div><h3>林晚</h3><p>旧书店主理人。沉静敏锐，习惯把情绪藏进未说出口的话里。</p><div className="character-traits"><span>克制</span><span>敏锐</span><span>念旧</span></div></div><button className="outline-button" onClick={() => setNotice('角色设定编辑即将开放')}><SquarePen size={14} /> 编辑设定</button></div><button className="add-character" onClick={() => setNotice('新角色画布已准备就绪')}><Plus size={18} /> 添加角色</button></section>
          ) : activeNav === 'settings' ? (
            <section className="tool-view settings-view">
              <div className="tool-view-head"><div className="tool-kicker">YOUR ACCOUNT / SETTINGS</div><h2>创作，由你掌控。</h2><p>管理个人资料、创作积分与大模型服务连接。</p></div>
              <div className="settings-layout">
                <nav className="settings-nav">
                  <button className={settingsTab === 'profile' ? 'active' : ''} onClick={() => setSettingsTab('profile')}><UserRound size={15} /> 个人资料</button>
                  <button className={settingsTab === 'credits' ? 'active' : ''} onClick={() => setSettingsTab('credits')}><Coins size={15} /> 积分与充值</button>
                  <button className={settingsTab === 'model' ? 'active' : ''} onClick={() => setSettingsTab('model')}><Cpu size={15} /> 大模型 API</button>
                </nav>
                <div className="settings-panel">
                  {settingsError && <div className="settings-error"><CircleHelp size={14} />{settingsError}<button onClick={() => setSettingsError('')}>×</button></div>}
                  {settingsTab === 'profile' && <div className="settings-section">
                    <div className="settings-section-heading"><div><h3>个人资料</h3><p>更新你的工作室显示信息。</p></div><span className="settings-badge"><ShieldCheck size={12} /> 账号已验证</span></div>
                    <form className="settings-form" onSubmit={saveProfile}>
                      <label className="settings-label">显示昵称<input className="settings-input" value={profileName} maxLength={40} onChange={(event) => setProfileName(event.target.value)} required /></label>
                      <label className="settings-label">登录邮箱<input className="settings-input" value={user?.email ?? ''} readOnly /></label>
                      <div className="settings-hint"><LockKeyhole size={13} /> 邮箱用于登录，目前暂不支持修改。</div>
                      <button className="generate-button settings-submit" type="submit"><Check size={14} /> 保存资料</button>
                    </form>
                    <div className="settings-danger-row"><div><b>退出当前账号</b><span>退出后需要重新登录才能继续创作。</span></div><button className="outline-button" onClick={signOut}><LogOut size={14} /> 退出登录</button></div>
                  </div>}
                  {settingsTab === 'credits' && <div className="settings-section">
                    <div className="settings-section-heading"><div><h3>创作积分</h3><p>积分用于调用已配置的大模型创作能力。</p></div></div>
                    <div className="credit-balance-card"><div><span>当前可用积分</span><strong><Coins size={23} /> {user?.credits ?? 0}</strong></div><span className="balance-chip">测试模式</span></div>
                    <div className="mock-warning"><CreditCard size={14} /><span>{rechargeMode === 'mock' ? <><b>测试模拟充值</b> · 不会产生真实扣款，正式支付尚未接入。</> : <><b>充值暂不可用</b> · 正式支付尚未接入，测试充值仅在开发环境开放。</>}</span></div>
                    <div className="package-grid">
                      {[['starter', '体验包', '100', '适合初次体验'], ['creator', '创作包', '500', '适合持续创作'], ['studio', '工作室包', '1,200', '适合高频制作']].map(([id, name, credits, description]) => <article className="credit-package" key={id}><span>{name}</span><strong>{credits}<small> 积分</small></strong><p>{description}</p><button className="outline-button" disabled={rechargeBusy || rechargeMode !== 'mock'} onClick={() => mockRecharge(id)}>{rechargeMode === 'disabled' ? '暂不可用' : rechargeBusy ? '处理中…' : '模拟充值'} <ArrowRight size={13} /></button></article>)}
                    </div>
                    <div className="ledger-heading"><h4>最近记录</h4><span>积分变动明细</span></div>
                    <div className="ledger">{transactions.length ? transactions.slice(0, 8).map((transaction) => <div className="ledger-row" key={transaction.id}><div><b>{transaction.description}</b><span>{new Date(transaction.createdAt).toLocaleString('zh-CN')}</span></div><strong className={transaction.amount > 0 ? 'positive' : 'negative'}>{transaction.amount > 0 ? '+' : ''}{transaction.amount}</strong></div>) : <div className="ledger-empty">暂时还没有积分记录</div>}</div>
                  </div>}
                  {settingsTab === 'model' && <div className="settings-section">
                    <div className="settings-section-heading"><div><h3>模型 API 接入</h3><p>为聊天、图片、视频和音频工具分别配置模型服务。</p></div><span className={`settings-badge ${modelKeyHint ? 'connected' : ''}`}><span className="model-status-dot" />{modelKeyHint ? '已配置' : '未连接'}</span></div>
                    <div className="model-security-note"><ShieldCheck size={15} /><span>API Key 仅发送至本服务后端，并使用 AES-256-GCM 加密保存；不会返回到浏览器。</span></div>
                    <div className="model-kind-tabs" role="tablist" aria-label="模型类型">
                      {(['chat', 'image', 'video', 'audio'] as ModelKind[]).map((kind) => (
                        <button key={kind} type="button" role="tab" aria-selected={modelKind === kind} className={modelKind === kind ? 'active' : ''} onClick={() => { setModelKind(kind); setSettingsError('') }}>
                          {modelKindLabels[kind]}{modelKeyHints[kind] && <span className="model-tab-dot" />}
                        </button>
                      ))}
                    </div>
                    <form className="settings-form model-form" onSubmit={saveModelSettings}>
                      <label className="settings-label">服务商<select className="settings-input" value={modelForm.provider} onChange={(event) => setProviderPreset(modelKind, event.target.value)}>{['DeepSeek', 'OpenAI', 'SiliconFlow', '阿里云百炼', 'AI模型聚合平台', 'Ollama', '自定义'].map((provider) => <option key={provider}>{provider}</option>)}</select></label>
                      <label className="settings-label">API Base URL<input className="settings-input" value={modelForm.baseUrl} onChange={(event) => setModelForms((current) => ({ ...current, [modelKind]: { ...current[modelKind], baseUrl: event.target.value } }))} placeholder="https://api.example.com/v1" required /></label>
                      <label className="settings-label">模型名称<input className="settings-input" value={modelForm.model} onChange={(event) => setModelForms((current) => ({ ...current, [modelKind]: { ...current[modelKind], model: event.target.value } }))} placeholder="填写服务商提供的模型名称" required /></label>
                      <label className="settings-label">API Key<div className="api-key-field"><KeyRound size={14} /><input type="password" autoComplete="new-password" value={modelForm.apiKey} onChange={(event) => setModelForms((current) => ({ ...current, [modelKind]: { ...current[modelKind], apiKey: event.target.value } }))} placeholder={modelKeyHint ? `已保存 ${modelKeyHint}，留空则保持不变` : '粘贴你的 API Key'} required={!modelKeyHint} /><span>{modelKeyHint ? '已加密' : '仅本地传输'}</span></div></label>
                      <div className="model-form-footer"><span>{modelKind === 'chat'
                        ? '推理分镜使用聊天模型：每次成功调用消耗 5 积分。'
                        : modelKind === 'video'
                          ? 'Muse Video：模型名 muse-video；720p、4–30 秒、16:9/9:16，服务商按秒计费，本站不扣视频积分。'
                          : '此处保存该类型模型连接配置；对应生成能力需由工具单独接入。'}</span><div><button className="outline-button" type="button" onClick={testModelConnection} disabled={modelTestBusy || !modelKeyHint}>{modelTestBusy ? '测试中…' : '测试连接'}</button><button className="generate-button" type="submit" disabled={modelBusy}>{modelBusy ? '保存中…' : '保存配置'}</button></div></div>
                    </form>
                    {modelKeyHint && <button className="remove-model" onClick={clearModelSettings}>移除{modelKindLabels[modelKind]}配置</button>}
                  </div>}
                </div>
              </div>
            </section>
          ) : activeNav === 'export' ? (
            <section className="library-view">
              <div className="library-heading"><div><div className="tool-kicker">YOUR STORIES / LIBRARY</div><h1>每个故事，都值得被看见。</h1><p>查看并继续你的短剧与画布项目。</p></div><button className="publish-button" onClick={() => navigateTo('home')}><Plus size={15} /> 开始新创作</button></div>
              <div className="project-library-grid">{savedProjects.map((item) => <article className="library-project-card" key={item.id}><div className={`library-project-art ${item.projectType === 'script' ? 'script-art' : ''}`}><span>{item.projectType === 'script' ? 'SCRIPT' : 'CANVAS'} / {item.scenes.length} FRAMES</span></div><div className="library-project-info"><span className="library-project-type">{item.projectType === 'script' ? <FileText size={12} /> : <Frame size={12} />}{item.projectType === 'script' ? '短剧工坊' : '无限画布'}</span><h3>{item.title}</h3><p>{item.subtitle}</p><div><small>{new Date(item.updatedAt).toLocaleString('zh-CN')}</small><button onClick={() => openProject(item.id!)}>继续创作 <ArrowRight size={13} /></button></div></div></article>)}{savedProjects.length === 0 && <div className="library-empty"><span><Film size={22} /></span><h3>你的作品将出现在这里</h3><p>新建一个画布或短剧项目；草稿会自动保存到账号，返回后可以继续。</p><button className="outline-button" onClick={() => navigateTo('home')}><Plus size={14} /> 开始创作</button></div>}</div>
            </section>
          ) : (
            <div className="editor-layout">
              <section className="canvas-wrap" ref={canvasRef} onPointerDown={handleCanvasPointerDown} onPointerMove={handlePointerMove} onPointerUp={() => { dragRef.current = null }} onPointerCancel={() => { dragRef.current = null }} onWheel={handleWheel}>
                <div className="canvas-grid" />
                <div className="canvas-world" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}>
                  <svg className="connections" width="1600" height="1000" aria-hidden="true">
                    <path d="M 458 330 C 515 330, 515 260, 570 260" />
                    <path d="M 458 380 C 520 380, 510 620, 570 620" />
                    <path d="M 878 260 C 942 260, 942 405, 1000 405" />
                    <path d="M 878 620 C 952 620, 933 450, 1000 450" />
                    <circle cx="570" cy="260" r="3" /><circle cx="570" cy="620" r="3" /><circle cx="1000" cy="405" r="3" />
                  </svg>
                  {project.scenes.map((scene, index) => (
                    <article
                      key={scene.id}
                      className={`scene-card ${selectedId === scene.id ? 'scene-selected' : ''}`}
                      style={{ left: scene.x, top: scene.y, '--scene-accent': `var(--${scene.color})` } as CSSProperties}
                      onPointerDown={(event) => handleScenePointerDown(event, scene)}
                    >
                      <div className={`scene-art art-${scene.art}`}>
                        <div className="art-orb" /><div className="art-horizon" /><div className="art-foreground" />
                        <span className="art-index">SCENE {String(index + 1).padStart(2, '0')}</span>
                        <span className="art-caption">{artTitles[scene.art] || 'Frame / 05'}</span>
                        <button className="card-more" title="更多操作"><MoreHorizontal size={16} /></button>
                      </div>
                      <div className="scene-content">
                        <div className="scene-label"><span style={{ background: `var(--${scene.color})` }} /> 场景 {String(index + 1).padStart(2, '0')} <span className="scene-time">{scene.time}</span></div>
                        <h3>{scene.title}</h3>
                        <p>{scene.description}</p>
                        <div className="scene-bottom"><span><span className="mini-location">⌖</span> {scene.location}</span><button className="scene-open" title="编辑分镜"><ArrowRight size={14} /></button></div>
                      </div>
                    </article>
                  ))}
                  {project.scenes.length === 0 && <div className="canvas-empty"><Frame size={23} /><b>空白画布，等待第一个镜头</b><span>新建分镜后即可拖拽编排故事。</span><button onClick={addScene}><Plus size={14} /> 添加第一个分镜</button></div>}
                  {project.scenes.length > 0 && <button className="add-node" style={{ left: 1000, top: 650 }} onClick={addScene}><span><Plus size={17} /></span><b>添加下一个分镜</b><small>继续扩写你的故事</small></button>}
                </div>
                <div className="canvas-hint"><span className="hint-key">SPACE</span> 拖动画布 <i /> 滚轮缩放</div>
                <div className="zoom-control"><button title="缩小" onClick={() => setZoom((current) => Math.max(0.48, current - 0.08))}><ZoomOut size={15} /></button><span>{Math.round(zoom * 100)}%</span><button title="放大" onClick={() => setZoom((current) => Math.min(1.35, current + 0.08))}><ZoomIn size={15} /></button></div>
                <div className="mini-map"><span className="mini-map-label">OVERVIEW</span><div className="mini-map-content"><i /><i /><i /><i /></div></div>
              </section>
              {panelOpen ? <aside className="inspector">
                <div className="inspector-head"><div><span className="inspector-kicker">FRAME INSPECTOR</span><h2>分镜详情 <span>{selectedScene ? `01 / ${String(project.scenes.length).padStart(2, '0')}` : '—'}</span></h2></div><button className="panel-close" onClick={() => setPanelOpen(false)} title="收起面板"><PanelRightClose size={16} /></button></div>
                {selectedScene ? <div className="inspector-scroll">
                  <div className={`inspector-preview art-${selectedScene.art}`}><div className="art-orb" /><div className="art-horizon" /><div className="art-foreground" /><span className="preview-overlay"><span>分镜预览</span><button title="更换画面"><ImagePlus size={15} /></button></span><span className="preview-number">FRAME / 0{project.scenes.findIndex((scene) => scene.id === selectedScene.id) + 1}</span></div>
                  <label className="field-label">分镜标题</label><input className="field-input title-input" value={selectedScene.title} onChange={(event) => updateSelected('title', event.target.value)} />
                  <label className="field-label">画面描述 <button className="inline-ai" onClick={() => setNotice('文案润色需要接入 AI 服务，当前可直接编辑画面描述')}><Sparkles size={12} /> AI 润色</button></label>
                  <textarea className="field-textarea" value={selectedScene.description} onChange={(event) => updateSelected('description', event.target.value)} />
                  <div className="field-row"><div><label className="field-label">场景地点</label><input className="field-input" value={selectedScene.location} onChange={(event) => updateSelected('location', event.target.value)} /></div><div><label className="field-label">时间氛围</label><input className="field-input" value={selectedScene.time} onChange={(event) => updateSelected('time', event.target.value)} /></div></div>
                  <label className="field-label">镜头情绪</label><div className="mood-tags">{['悬念', '克制', '温柔', '不安'].map((mood) => <button key={mood} className={selectedScene.mood.includes(mood) ? 'mood-active' : ''} onClick={() => updateSelected('mood', mood)}>{mood}</button>)}</div>
                  <div className="inspector-section"><div className="section-title"><span>镜头语言</span><button><MoreHorizontal size={15} /></button></div><div className="shot-select"><Clapperboard size={14} /><span>{selectedScene.shot}</span><ChevronDown size={13} /></div></div>
                  <button className="prompt-button" onClick={createImagePrompt}><WandSparkles size={15} /><span>生成画面提示词</span><ArrowRight size={14} /></button>
                  <div className="inspector-bottom"><span><Check size={12} /> 自动保存中</span><button title="复制分镜"><Copy size={14} /></button><button title="评论"><MessageSquare size={14} /></button><button title="删除分镜" onClick={() => { if (project.scenes.length > 1) { const remaining = project.scenes.filter((scene) => scene.id !== selectedScene.id); updateProject((current) => ({ ...current, scenes: remaining })); setSelectedId(remaining[0].id) } else setNotice('至少需要保留一个分镜') }}><MoreHorizontal size={15} /></button></div>
                </div> : <div className="inspector-empty"><Frame size={20} /><span>选择或新建一个分镜节点</span></div>}
              </aside> : <button className="reopen-panel" onClick={() => setPanelOpen(true)}><ChevronLeft size={16} /> 分镜详情</button>}
            </div>
          )}
        </main>
      </div>
      {isProjectEditor && project.projectType === 'canvas' && <button className="add-scene-fab" onClick={addScene}><Plus size={16} /> 新建分镜</button>}
      {notice && <div className="toast"><span className="toast-mark"><Check size={14} /></span>{notice}<button onClick={() => setNotice('')}>×</button></div>}
      {expandedVideoPromptScene && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setExpandedVideoPromptSceneId(null) }}>
        <section className="video-prompt-modal" role="dialog" aria-modal="true" aria-labelledby="video-prompt-modal-title">
          <div className="modal-kicker">VIDEO PROMPT / SCENE {String(project.scenes.findIndex((scene) => scene.id === expandedVideoPromptScene.id) + 1).padStart(2, '0')}</div>
          <h2 id="video-prompt-modal-title">{expandedVideoPromptScene.title}</h2>
          <p>编辑用于视频生成模型的镜头、动作、运镜与氛围描述。</p>
          <textarea
            autoFocus
            value={expandedVideoPromptScene.videoPrompt ?? ''}
            maxLength={8000}
            onChange={(event) => updateBreakdownScene(expandedVideoPromptScene.id, { videoPrompt: event.target.value })}
          />
          <div className="modal-actions"><button className="outline-button" onClick={() => setExpandedVideoPromptSceneId(null)}>完成</button></div>
        </section>
      </div>}
      {promptText && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPromptText('') }}><section className="prompt-modal"><div className="modal-kicker">FRAME PROMPT / AI TOOLKIT</div><h2>画面提示词</h2><p>可复制到你常用的图像生成工具中继续创作。</p><textarea value={promptText} readOnly /><div className="modal-actions"><button className="outline-button" onClick={() => setPromptText('')}>关闭</button><button className="generate-button" onClick={copyImagePrompt}><Copy size={14} /> 复制提示词</button></div></section></div>}
      {authLoading && <div className="auth-backdrop"><div className="auth-loading"><div className="brand-mark"><span>墨</span><i /></div><p>正在连接创作空间…</p></div></div>}
      {!authLoading && !user && <div className="auth-backdrop"><section className="auth-card">
        <div className="auth-brand"><div className="brand-mark"><span>墨</span><i /></div><span>墨序 <b>STUDIO</b></span></div>
        <div className="auth-kicker">YOUR STORY STARTS HERE</div>
        <h2>{authMode === 'login' ? '欢迎回来。' : '开启你的创作。'}</h2>
        <p className="auth-description">{authMode === 'login' ? '登录后继续编排你的故事。' : '注册即赠 100 积分，开始创作你的第一集。'}</p>
        <form className="auth-form" onSubmit={submitAuth}>
          {authMode === 'register' && <label>昵称<input value={authForm.name} maxLength={40} onChange={(event) => setAuthForm((current) => ({ ...current, name: event.target.value }))} placeholder="你希望如何称呼" /></label>}
          <label>{authMode === 'login' ? '邮箱或用户名' : '邮箱地址'}<input type={authMode === 'login' ? 'text' : 'email'} autoComplete={authMode === 'login' ? 'username' : 'email'} required value={authForm.email} onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))} placeholder={authMode === 'login' ? '邮箱地址或用户名' : 'you@example.com'} /></label>
          <label>密码<input type="password" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} minLength={authMode === 'login' ? 1 : 10} required value={authForm.password} onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))} placeholder={authMode === 'login' ? '请输入密码' : '至少 10 位'} /></label>
          {authError && <div className="auth-error"><CircleHelp size={14} />{authError}</div>}
          <button className="auth-submit" disabled={authBusy}>{authBusy ? '请稍候…' : authMode === 'login' ? '登录工作室' : '创建账号'}<ArrowRight size={15} /></button>
        </form>
        <div className="auth-switch">{authMode === 'login' ? '还没有账号？' : '已经有账号？'}<button onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError('') }}>{authMode === 'login' ? '立即注册' : '返回登录'}</button></div>
        <div className="auth-footnote"><LockKeyhole size={12} /> 密码经过加盐哈希存储 · 安全会话有效期 7 天</div>
      </section></div>}
      <footer className="app-footer"><span><span className="footer-dot" /> 墨序创作引擎 <b>v1.0</b></span><span>让想象，成其为章 <i>✳</i></span></footer>
    </div>
  )
}

export default App
