export type Scene = {
  id: string
  title: string
  description: string
  location: string
  time: string
  mood: string
  shot: string
  color: string
  art: string
  x: number
  y: number
  videoPrompt?: string
  videoUrl?: string
  videoTaskId?: string
  videoStatus?: 'pending' | 'running' | 'success' | 'failed'
  videoProgress?: string
  videoError?: string
  videoTaskStartedAt?: string
  assetReferences?: string[]
  details?: Record<string, string>
}

export type Project = {
  id?: string
  projectType?: 'canvas' | 'script'
  title: string
  subtitle: string
  updatedAt: string
  scriptText?: string
  scenes: Scene[]
  breakdownTables?: {
    characters?: Record<string, string>[]
    props?: Record<string, string>[]
  }
}
