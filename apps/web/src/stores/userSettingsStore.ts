import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Tool, TOOL_HOTBAR } from './canvasStore'

// Toolbar-Slot Konfiguration
export interface ToolbarSlot {
  index: number // 1-9 (0 ist Quick-Switch)
  tool: Tool
}

// Profil-Einstellungen die exportiert/importiert werden können
export interface UserProfile {
  // Identität
  displayName: string
  avatarDataUrl: string | null // Base64 encoded cropped image
  avatarCrop: {
    x: number
    y: number
    zoom: number
  } | null
  
  // Cursor-Farbe
  cursorColor: string
}

// Canvas-Einstellungen
export interface CanvasSettings {
  showGrid: boolean
  gridSize: number
  snapToGrid: boolean
  darkMode: boolean
  cursorTrails: boolean
  showOtherCursors: boolean
  autoSave: boolean
}

// Tool-Konfiguration mit Tastenkürzel
export interface ToolConfig {
  tool: Tool
  enabled: boolean
  shortcut: string // z.B. '1', '2', 'S', 'P'
}

// Toolbar-Einstellungen
export interface ToolbarSettings {
  // Custom Tool-Konfiguration für Hotbar
  toolConfigs: ToolConfig[]
  // Legacy: Tool-Reihenfolge (für Kompatibilität)
  toolOrder: Tool[]
  // Standard Tool-Einstellungen (werden in canvasStore verwaltet)
  defaultStrokeWidth: number
  defaultEraserWidth: number
  defaultFontSize: number
  defaultColor: string
}

// Komplette exportierbare Konfiguration
export interface ExportableSettings {
  version: number
  exportedAt: string
  profile: UserProfile
  canvas: CanvasSettings
  toolbar: ToolbarSettings
}

interface UserSettingsState {
  // Profil
  profile: UserProfile
  setProfile: (profile: Partial<UserProfile>) => void
  
  // Avatar speziell
  setAvatar: (dataUrl: string | null, crop?: { x: number; y: number; zoom: number }) => void
  
  // Canvas-Einstellungen
  canvasSettings: CanvasSettings
  setCanvasSettings: (settings: Partial<CanvasSettings>) => void
  
  // Toolbar-Einstellungen
  toolbarSettings: ToolbarSettings
  setToolbarSettings: (settings: Partial<ToolbarSettings>) => void
  reorderToolbar: (fromIndex: number, toIndex: number) => void
  toggleToolEnabled: (tool: Tool) => void
  setToolShortcut: (tool: Tool, shortcut: string) => void
  
  // Export/Import
  exportSettings: () => string
  importSettings: (json: string) => boolean
  resetToDefaults: () => void
}

const defaultProfile: UserProfile = {
  displayName: '',
  avatarDataUrl: null,
  avatarCrop: null,
  cursorColor: '#3B82F6',
}

const defaultCanvasSettings: CanvasSettings = {
  showGrid: false,
  gridSize: 20,
  snapToGrid: false,
  darkMode: true,
  cursorTrails: false,
  showOtherCursors: true,
  autoSave: true,
}

// Standard-Konfiguration für alle Tools
const defaultToolConfigs: ToolConfig[] = [
  { tool: 'select', enabled: true, shortcut: '1' },
  { tool: 'pen', enabled: true, shortcut: '2' },
  { tool: 'eraser', enabled: true, shortcut: '3' },
  { tool: 'shape', enabled: true, shortcut: '4' },
  { tool: 'text', enabled: true, shortcut: '5' },
  { tool: 'sticky', enabled: true, shortcut: '6' },
  { tool: 'connector', enabled: false, shortcut: '7' },
  { tool: 'pan', enabled: true, shortcut: '8' },
  { tool: 'laser', enabled: false, shortcut: '9' },
]

const defaultToolbarSettings: ToolbarSettings = {
  toolConfigs: defaultToolConfigs,
  toolOrder: [...TOOL_HOTBAR],
  defaultStrokeWidth: 3,
  defaultEraserWidth: 20,
  defaultFontSize: 16,
  defaultColor: '#ffffff',
}

export const useUserSettingsStore = create<UserSettingsState>()(
  persist(
    (set, get) => ({
      // Profil
      profile: defaultProfile,
      setProfile: (partial) => set((state) => ({
        profile: { ...state.profile, ...partial }
      })),
      
      // Avatar
      setAvatar: (dataUrl, crop) => set((state) => ({
        profile: {
          ...state.profile,
          avatarDataUrl: dataUrl,
          avatarCrop: crop || state.profile.avatarCrop,
        }
      })),
      
      // Canvas-Einstellungen
      canvasSettings: defaultCanvasSettings,
      setCanvasSettings: (partial) => {
        set((state) => ({
          canvasSettings: { ...state.canvasSettings, ...partial }
        }))
        // Event dispatchen für andere Komponenten
        window.dispatchEvent(new CustomEvent('canvas-settings-changed', { 
          detail: { ...get().canvasSettings, ...partial } 
        }))
      },
      
      // Toolbar-Einstellungen
      toolbarSettings: defaultToolbarSettings,
      setToolbarSettings: (partial) => set((state) => ({
        toolbarSettings: { ...state.toolbarSettings, ...partial }
      })),
      
      reorderToolbar: (fromIndex, toIndex) => set((state) => {
        const newConfigs = [...state.toolbarSettings.toolConfigs]
        const [removed] = newConfigs.splice(fromIndex, 1)
        newConfigs.splice(toIndex, 0, removed)
        const newOrder = newConfigs.map(c => c.tool)
        return {
          toolbarSettings: { ...state.toolbarSettings, toolConfigs: newConfigs, toolOrder: newOrder }
        }
      }),
      
      toggleToolEnabled: (tool) => set((state) => {
        const newConfigs = state.toolbarSettings.toolConfigs.map(c =>
          c.tool === tool ? { ...c, enabled: !c.enabled } : c
        )
        return {
          toolbarSettings: { ...state.toolbarSettings, toolConfigs: newConfigs }
        }
      }),
      
      setToolShortcut: (tool, shortcut) => set((state) => {
        // Entferne Shortcut von anderem Tool falls bereits vergeben
        const newConfigs = state.toolbarSettings.toolConfigs.map(c => {
          if (c.tool === tool) return { ...c, shortcut }
          if (c.shortcut === shortcut) return { ...c, shortcut: '' }
          return c
        })
        return {
          toolbarSettings: { ...state.toolbarSettings, toolConfigs: newConfigs }
        }
      }),
      
      // Export
      exportSettings: () => {
        const state = get()
        const exportData: ExportableSettings = {
          version: 1,
          exportedAt: new Date().toISOString(),
          profile: state.profile,
          canvas: state.canvasSettings,
          toolbar: state.toolbarSettings,
        }
        return JSON.stringify(exportData, null, 2)
      },
      
      // Import
      importSettings: (json: string) => {
        try {
          const data = JSON.parse(json) as ExportableSettings
          
          if (!data.version || !data.profile || !data.canvas || !data.toolbar) {
            console.error('Ungültiges Einstellungs-Format')
            return false
          }
          
          set({
            profile: { ...defaultProfile, ...data.profile },
            canvasSettings: { ...defaultCanvasSettings, ...data.canvas },
            toolbarSettings: { ...defaultToolbarSettings, ...data.toolbar },
          })
          
          // Event für UI-Updates
          window.dispatchEvent(new CustomEvent('settings-imported'))
          return true
        } catch (e) {
          console.error('Fehler beim Importieren der Einstellungen:', e)
          return false
        }
      },
      
      // Reset
      resetToDefaults: () => set({
        profile: defaultProfile,
        canvasSettings: defaultCanvasSettings,
        toolbarSettings: defaultToolbarSettings,
      }),
    }),
    {
      name: 'user-settings-storage',
      version: 1,
    }
  )
)

// Helper: Generiere zufällige Cursor-Farbe
export function generateRandomCursorColor(): string {
  const colors = [
    '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#22C55E',
    '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6',
    '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899',
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}
