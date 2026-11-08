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

export type CreativeAsset = {
  id: string
  type: 'character' | 'scene' | 'prop'
  name: string
  prompt: string
  mediaUrl?: string
  mediaType?: 'image' | 'video'
  mediaName?: string
  mediaSize?: number
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
  assets?: CreativeAsset[]
}

export type ShowcaseItem = {
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
