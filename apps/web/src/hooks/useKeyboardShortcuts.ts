import { useEffect, useCallback, useState } from 'react'
import { useCanvasStore, Tool } from '@/stores/canvasStore'

export interface ShortcutConfig {
  key: string
  ctrl?: boolean
  meta?: boolean   // Cmd on Mac
  shift?: boolean
  alt?: boolean
  action: () => void
  description: string
  category: 'tools' | 'edit' | 'navigation' | 'general'
}

// Shortcut definitions
export const SHORTCUTS = {
  tools: [
    { key: 'V', description: 'Auswählen', tool: 'select' as Tool },
    { key: 'P', description: 'Zeichnen', tool: 'pen' as Tool },
    { key: 'B', description: 'Zeichnen (Brush)', tool: 'pen' as Tool },
    { key: 'E', description: 'Radierer', tool: 'eraser' as Tool },
    { key: 'S', description: 'Form', tool: 'shape' as Tool },
    { key: 'T', description: 'Text', tool: 'text' as Tool },
    { key: 'N', description: 'Notiz', tool: 'sticky' as Tool },
    { key: 'H', description: 'Hand/Pan', tool: 'pan' as Tool },
  ],
  edit: [
    { key: 'Z', ctrl: true, description: 'Rückgängig' },
    { key: 'Z', ctrl: true, shift: true, description: 'Wiederholen' },
    { key: 'Y', ctrl: true, description: 'Wiederholen' },
    { key: 'C', ctrl: true, description: 'Kopieren' },
    { key: 'V', ctrl: true, description: 'Einfügen' },
    { key: 'X', ctrl: true, description: 'Ausschneiden' },
    { key: 'D', ctrl: true, description: 'Duplizieren' },
    { key: 'A', ctrl: true, description: 'Alles auswählen' },
    { key: 'Delete', description: 'Löschen' },
    { key: 'Backspace', description: 'Löschen' },
  ],
  navigation: [
    { key: '+', ctrl: true, description: 'Zoom In' },
    { key: '=', ctrl: true, description: 'Zoom In' },
    { key: '-', ctrl: true, description: 'Zoom Out' },
    { key: '0', ctrl: true, description: 'Zoom Reset' },
  ],
  general: [
    { key: '?', description: 'Shortcuts anzeigen' },
    { key: 'F1', description: 'Hilfe' },
    { key: 'Escape', description: 'Abbrechen / Auswahl aufheben' },
  ],
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean
  onShowShortcuts?: () => void
}

export function useKeyboardShortcuts({ 
  enabled = true, 
  onShowShortcuts 
}: UseKeyboardShortcutsOptions = {}) {
  const [isSpaceHeld, setIsSpaceHeld] = useState(false)
  
  const {
    setTool,
    undo,
    redo,
    canUndo,
    canRedo,
    selectAll,
    deleteSelected,
    copyToClipboard,
    pasteFromClipboard,
    cutToClipboard,
    duplicateSelected,
    selectedIds,
    setSelectedIds,
    viewport,
    setViewport,
  } = useCanvasStore()
  
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return
    
    // Ignoriere Eingaben in Input-Feldern
    const target = e.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Erlaube nur Escape
      if (e.key !== 'Escape') return
    }
    
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
    const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey
    
    // Space gehalten = temporär Pan
    if (e.key === ' ' && !e.repeat) {
      e.preventDefault()
      setIsSpaceHeld(true)
      setTool('pan')
      return
    }
    
    // Escape - Auswahl aufheben
    if (e.key === 'Escape') {
      e.preventDefault()
      setSelectedIds(new Set())
      return
    }
    
    // Shortcuts Modal öffnen
    if (e.key === '?' || e.key === 'F1') {
      e.preventDefault()
      onShowShortcuts?.()
      return
    }
    
    // Mit Ctrl/Cmd
    if (ctrlOrCmd) {
      switch (e.key.toLowerCase()) {
        case 'z':
          e.preventDefault()
          if (e.shiftKey) {
            if (canRedo()) redo()
          } else {
            if (canUndo()) undo()
          }
          return
          
        case 'y':
          e.preventDefault()
          if (canRedo()) redo()
          return
          
        case 'a':
          e.preventDefault()
          selectAll()
          setTool('select')
          return
          
        case 'c':
          e.preventDefault()
          copyToClipboard()
          return
          
        case 'v':
          e.preventDefault()
          pasteFromClipboard()
          return
          
        case 'x':
          e.preventDefault()
          cutToClipboard()
          return
          
        case 'd':
          e.preventDefault()
          duplicateSelected()
          return
          
        case '=':
        case '+':
          e.preventDefault()
          setViewport({ scale: viewport.scale * 1.2 })
          return
          
        case '-':
          e.preventDefault()
          setViewport({ scale: Math.max(0.0001, viewport.scale / 1.2) })
          return
          
        case '0':
          e.preventDefault()
          setViewport({ scale: 1, x: 0, y: 0 })
          return
      }
    }
    
    // Ohne Modifier - Tool Shortcuts
    if (!ctrlOrCmd && !e.altKey) {
      // Delete/Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.size > 0) {
          e.preventDefault()
          deleteSelected()
          return
        }
      }
      
      // Tool-Shortcuts
      const key = e.key.toUpperCase()
      const toolShortcut = SHORTCUTS.tools.find(s => s.key === key)
      if (toolShortcut) {
        e.preventDefault()
        setTool(toolShortcut.tool)
        return
      }
    }
  }, [
    enabled,
    setTool,
    undo,
    redo,
    canUndo,
    canRedo,
    selectAll,
    deleteSelected,
    copyToClipboard,
    pasteFromClipboard,
    cutToClipboard,
    duplicateSelected,
    selectedIds,
    setSelectedIds,
    viewport,
    setViewport,
    onShowShortcuts,
  ])
  
  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    // Space losgelassen = zurück zum vorherigen Tool
    if (e.key === ' ' && isSpaceHeld) {
      setIsSpaceHeld(false)
      // Zurück zu select als Default
      setTool('select')
    }
  }, [isSpaceHeld, setTool])
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])
  
  return {
    isSpaceHeld,
  }
}
