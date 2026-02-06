import { useEffect, useCallback, useMemo } from 'react'
import { useCanvasStore, TOOL_HOTBAR, Tool } from '../stores/canvasStore'
import { useUserSettingsStore } from '../stores/userSettingsStore'

/**
 * Hook für Videospiel-artiges Tool-Hotbar mit konfigurierbaren Tastenbelegungen
 * 
 * Standard-Tastenbelegung (konfigurierbar):
 * 1 = Select
 * 2 = Stift  
 * 3 = Radierer
 * 4 = Form
 * 5 = Text
 * 6 = Notiz
 * 7 = Verbinder
 * 8 = Hand (Pan)
 * 9 = Laser
 * 0 = Letztes Tool (Quick-Switch)
 */
export function useToolHotbar() {
  const setTool = useCanvasStore((state) => state.setTool)
  const currentTool = useCanvasStore((state) => state.currentTool)
  const lastUsedTool = useCanvasStore((state) => state.lastUsedTool)
  const setLastUsedTool = useCanvasStore((state) => state.setLastUsedTool)
  
  // Benutzerdefinierte Shortcuts aus Settings
  const toolConfigs = useUserSettingsStore((state) => state.toolbarSettings.toolConfigs)
  
  // Erstelle ein Mapping von Shortcut zu Tool
  const shortcutMap = useMemo(() => {
    const map = new Map<string, Tool>()
    toolConfigs.forEach(config => {
      if (config.shortcut && config.enabled) {
        map.set(config.shortcut.toLowerCase(), config.tool)
      }
    })
    return map
  }, [toolConfigs])

  const switchToTool = useCallback((tool: Tool) => {
    // Speichere aktuelles Tool als "letztes Tool" (für Quick-Switch mit 0)
    if (currentTool !== tool) {
      setLastUsedTool(currentTool)
      setTool(tool)
    }
  }, [currentTool, setTool, setLastUsedTool])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignoriere wenn in einem Input-Feld
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      (e.target as HTMLElement).contentEditable === 'true'
    ) {
      return
    }

    // Ignoriere wenn Modifier-Tasten gedrückt sind (außer Shift für manche Tools)
    if (e.ctrlKey || e.metaKey || e.altKey) {
      return
    }

    // Taste 0 für Quick-Switch zum letzten Tool (immer)
    if (e.key === '0') {
      e.preventDefault()
      switchToTool(lastUsedTool)
      return
    }

    // Prüfe benutzerdefinierte Shortcuts
    const key = e.key.toLowerCase()
    const tool = shortcutMap.get(key)
    if (tool) {
      e.preventDefault()
      switchToTool(tool)
      return
    }
    
    // Fallback: Standard Buchstaben-Shortcuts (falls nicht überschrieben)
    if (!shortcutMap.has(key)) {
      switch (key) {
        case 'v': // V für Select (wie in Figma/Photoshop)
          e.preventDefault()
          switchToTool('select')
          break
        case 'p': // P für Pen
          e.preventDefault()
          switchToTool('pen')
          break
        case 'e': // E für Eraser
          e.preventDefault()
          switchToTool('eraser')
          break
        case 's': // S für Shape (nicht bei Ctrl+S)
          e.preventDefault()
          switchToTool('shape')
          break
        case 't': // T für Text
          e.preventDefault()
          switchToTool('text')
          break
        case 'n': // N für Note (Sticky)
          e.preventDefault()
          switchToTool('sticky')
          break
        case 'c': // C für Connector (nicht bei Ctrl+C)
          e.preventDefault()
          switchToTool('connector')
          break
        case 'h': // H für Hand (Pan)
          e.preventDefault()
          switchToTool('pan')
          break
        case 'l': // L für Laser
          e.preventDefault()
          switchToTool('laser')
          break
      }
    }
  }, [switchToTool, lastUsedTool, shortcutMap])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return {
    currentTool,
    lastUsedTool,
    switchToTool,
    hotbarTools: TOOL_HOTBAR,
  }
}

/**
 * Hilfsfunktion: Tool-Name und Icon für UI
 */
export function getToolInfo(tool: Tool): { name: string; shortcut: string; icon: string } {
  const toolMap: Record<Tool, { name: string; shortcut: string; icon: string }> = {
    select: { name: 'Auswahl', shortcut: '1 / V', icon: 'cursor' },
    pen: { name: 'Stift', shortcut: '2 / P', icon: 'pencil' },
    eraser: { name: 'Radierer', shortcut: '3 / E', icon: 'eraser' },
    shape: { name: 'Form', shortcut: '4 / S', icon: 'square' },
    text: { name: 'Text', shortcut: '5 / T', icon: 'type' },
    sticky: { name: 'Notiz', shortcut: '6 / N', icon: 'sticky-note' },
    connector: { name: 'Verbinder', shortcut: '7 / C', icon: 'git-branch' },
    pan: { name: 'Hand', shortcut: '8 / H', icon: 'hand' },
    laser: { name: 'Laser', shortcut: '9 / L', icon: 'target' },
  }
  return toolMap[tool]
}

/**
 * Hotbar-Index für ein Tool (1-basiert für UI-Anzeige)
 */
export function getToolHotbarIndex(tool: Tool): number | null {
  const index = TOOL_HOTBAR.indexOf(tool)
  return index >= 0 ? index + 1 : null
}
