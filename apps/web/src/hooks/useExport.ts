import { useCallback } from 'react'
import { useCanvasStore, CanvasObject } from '@/stores/canvasStore'

export interface ExportOptions {
  format: 'png' | 'svg' | 'json'
  quality: number // 0.1 - 1.0 for PNG
  scale: number // Export resolution multiplier
  background: string | 'transparent'
  includeSelection: boolean // Export only selected objects
  padding: number // Padding around content
}

export interface ExportResult {
  dataUrl?: string
  blob?: Blob
  filename: string
  width: number
  height: number
}

// Calculate bounding box of objects
function calculateBounds(objects: CanvasObject[]): { minX: number; minY: number; maxX: number; maxY: number } {
  if (objects.length === 0) {
    return { minX: 0, minY: 0, maxX: 100, maxY: 100 }
  }
  
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  
  for (const obj of objects) {
    // Handle strokes differently - they use points array
    if (obj.type === 'stroke') {
      const points = (obj.data as { points: number[] }).points
      for (let i = 0; i < points.length; i += 2) {
        minX = Math.min(minX, points[i])
        maxX = Math.max(maxX, points[i])
        minY = Math.min(minY, points[i + 1])
        maxY = Math.max(maxY, points[i + 1])
      }
      // Add stroke width padding
      const strokeWidth = (obj.data as { strokeWidth: number }).strokeWidth || 2
      minX -= strokeWidth / 2
      minY -= strokeWidth / 2
      maxX += strokeWidth / 2
      maxY += strokeWidth / 2
    } else if (obj.type === 'shape') {
      const data = obj.data as { shapeType: string; startX?: number; startY?: number; endX?: number; endY?: number }
      if (data.shapeType === 'line' || data.shapeType === 'arrow') {
        // Lines/arrows use start/end points
        if (data.startX !== undefined && data.startY !== undefined && data.endX !== undefined && data.endY !== undefined) {
          minX = Math.min(minX, data.startX, data.endX)
          maxX = Math.max(maxX, data.startX, data.endX)
          minY = Math.min(minY, data.startY, data.endY)
          maxY = Math.max(maxY, data.startY, data.endY)
        }
      } else {
        // Regular shapes use x, y, width, height
        minX = Math.min(minX, obj.x)
        maxX = Math.max(maxX, obj.x + obj.width)
        minY = Math.min(minY, obj.y)
        maxY = Math.max(maxY, obj.y + obj.height)
      }
    } else {
      // Standard objects with x, y, width, height
      minX = Math.min(minX, obj.x)
      maxX = Math.max(maxX, obj.x + obj.width)
      minY = Math.min(minY, obj.y)
      maxY = Math.max(maxY, obj.y + obj.height)
    }
  }
  
  return { minX, minY, maxX, maxY }
}

// Generate SVG from canvas objects
function generateSVG(objects: CanvasObject[], bounds: { minX: number; minY: number; maxX: number; maxY: number }, options: ExportOptions): string {
  const padding = options.padding
  const width = (bounds.maxX - bounds.minX) + padding * 2
  const height = (bounds.maxY - bounds.minY) + padding * 2
  const offsetX = -bounds.minX + padding
  const offsetY = -bounds.minY + padding
  
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
`
  
  // Background
  if (options.background !== 'transparent') {
    svg += `  <rect width="100%" height="100%" fill="${options.background}"/>\n`
  }
  
  svg += `  <g transform="translate(${offsetX}, ${offsetY})">\n`
  
  // Sort objects by creation time
  const sortedObjects = [...objects].sort((a, b) => a.createdAt - b.createdAt)
  
  for (const obj of sortedObjects) {
    if (obj.type === 'stroke') {
      const { points, stroke, strokeWidth } = obj.data as { points: number[]; stroke: string; strokeWidth: number }
      if (points.length >= 4) {
        // Convert points to SVG path
        let path = `M ${points[0]} ${points[1]}`
        for (let i = 2; i < points.length; i += 2) {
          path += ` L ${points[i]} ${points[i + 1]}`
        }
        svg += `    <path d="${path}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>\n`
      }
    } else if (obj.type === 'shape') {
      const { shapeType, fill, stroke, strokeWidth, startX, startY, endX, endY } = obj.data as {
        shapeType: string; fill: string; stroke: string; strokeWidth: number
        startX?: number; startY?: number; endX?: number; endY?: number
      }
      const fillAttr = fill === 'transparent' ? 'none' : fill
      
      switch (shapeType) {
        case 'rect':
          svg += `    <rect x="${obj.x}" y="${obj.y}" width="${obj.width}" height="${obj.height}" fill="${fillAttr}" stroke="${stroke}" stroke-width="${strokeWidth}"/>\n`
          break
        case 'circle':
          const cx = obj.x + obj.width / 2
          const cy = obj.y + obj.height / 2
          const r = Math.min(obj.width, obj.height) / 2
          svg += `    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${fillAttr}" stroke="${stroke}" stroke-width="${strokeWidth}"/>\n`
          break
        case 'triangle':
          const tx = obj.x + obj.width / 2
          const ty = obj.y
          const tl = `${obj.x},${obj.y + obj.height}`
          const tr = `${obj.x + obj.width},${obj.y + obj.height}`
          svg += `    <polygon points="${tx},${ty} ${tl} ${tr}" fill="${fillAttr}" stroke="${stroke}" stroke-width="${strokeWidth}"/>\n`
          break
        case 'diamond':
          const dx = obj.x + obj.width / 2
          const dy = obj.y + obj.height / 2
          const dPoints = `${dx},${obj.y} ${obj.x + obj.width},${dy} ${dx},${obj.y + obj.height} ${obj.x},${dy}`
          svg += `    <polygon points="${dPoints}" fill="${fillAttr}" stroke="${stroke}" stroke-width="${strokeWidth}"/>\n`
          break
        case 'line':
          if (startX !== undefined && startY !== undefined && endX !== undefined && endY !== undefined) {
            svg += `    <line x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round"/>\n`
          }
          break
        case 'arrow':
          if (startX !== undefined && startY !== undefined && endX !== undefined && endY !== undefined) {
            const angle = Math.atan2(endY - startY, endX - startX)
            const arrowSize = strokeWidth * 3
            const ax1 = endX - arrowSize * Math.cos(angle - Math.PI / 6)
            const ay1 = endY - arrowSize * Math.sin(angle - Math.PI / 6)
            const ax2 = endX - arrowSize * Math.cos(angle + Math.PI / 6)
            const ay2 = endY - arrowSize * Math.sin(angle + Math.PI / 6)
            svg += `    <line x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round"/>\n`
            svg += `    <polygon points="${endX},${endY} ${ax1},${ay1} ${ax2},${ay2}" fill="${stroke}"/>\n`
          }
          break
      }
    } else if (obj.type === 'text') {
      const { text, fontSize, fontFamily, fill } = obj.data as { text: string; fontSize: number; fontFamily: string; fill: string }
      // Escape special characters
      const escapedText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      svg += `    <text x="${obj.x}" y="${obj.y + fontSize}" font-size="${fontSize}" font-family="${fontFamily}" fill="${fill}">${escapedText}</text>\n`
    } else if (obj.type === 'sticky') {
      const { text, color } = obj.data as { text: string; color: string }
      // Sticky note background
      svg += `    <rect x="${obj.x}" y="${obj.y}" width="${obj.width}" height="${obj.height}" fill="${color}" rx="4" stroke="rgba(0,0,0,0.1)" stroke-width="1"/>\n`
      // Text
      if (text) {
        const escapedText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        svg += `    <text x="${obj.x + 12}" y="${obj.y + 26}" font-size="14" font-family="Inter, system-ui, sans-serif" fill="#1F2937">${escapedText}</text>\n`
      }
    } else if (obj.type === 'image') {
      const { src } = obj.data as { src: string }
      svg += `    <image x="${obj.x}" y="${obj.y}" width="${obj.width}" height="${obj.height}" href="${src}" preserveAspectRatio="xMidYMid slice"/>\n`
    }
    // Note: video and audio are not exported to SVG (they're media elements)
  }
  
  svg += `  </g>\n</svg>`
  
  return svg
}

// Generate PNG from SVG using Canvas API
async function generatePNG(svgString: string, width: number, height: number, scale: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    canvas.width = width * scale
    canvas.height = height * scale
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      reject(new Error('Canvas context nicht verfügbar'))
      return
    }
    
    const img = new Image()
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    
    img.onload = () => {
      ctx.scale(scale, scale)
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('PNG-Erstellung fehlgeschlagen'))
        }
      }, 'image/png', 1.0)
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('SVG konnte nicht geladen werden'))
    }
    
    img.src = url
  })
}

export function useExport() {
  const objects = useCanvasStore((s) => s.objects)
  const selectedIds = useCanvasStore((s) => s.selectedIds)
  
  const exportCanvas = useCallback(async (options: ExportOptions): Promise<ExportResult> => {
    const objectsToExport = options.includeSelection && selectedIds.size > 0
      ? Array.from(objects.values()).filter(obj => selectedIds.has(obj.id))
      : Array.from(objects.values())
    
    if (objectsToExport.length === 0) {
      throw new Error('Keine Objekte zum Exportieren vorhanden')
    }
    
    const bounds = calculateBounds(objectsToExport)
    const padding = options.padding
    const width = Math.ceil(bounds.maxX - bounds.minX + padding * 2)
    const height = Math.ceil(bounds.maxY - bounds.minY + padding * 2)
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')
    
    if (options.format === 'json') {
      // Export as JSON
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        objects: objectsToExport,
        bounds,
      }
      const jsonString = JSON.stringify(exportData, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const dataUrl = URL.createObjectURL(blob)
      
      return {
        dataUrl,
        blob,
        filename: `canvas-export-${timestamp}.json`,
        width,
        height,
      }
    }
    
    // Generate SVG first (needed for both SVG and PNG)
    const svgString = generateSVG(objectsToExport, bounds, options)
    
    if (options.format === 'svg') {
      const blob = new Blob([svgString], { type: 'image/svg+xml' })
      const dataUrl = URL.createObjectURL(blob)
      
      return {
        dataUrl,
        blob,
        filename: `canvas-export-${timestamp}.svg`,
        width,
        height,
      }
    }
    
    // PNG Export - render SVG to canvas
    const pngBlob = await generatePNG(svgString, width, height, options.scale)
    const dataUrl = URL.createObjectURL(pngBlob)
    
    return {
      dataUrl,
      blob: pngBlob,
      filename: `canvas-export-${timestamp}.png`,
      width: width * options.scale,
      height: height * options.scale,
    }
  }, [objects, selectedIds])
  
  const downloadExport = useCallback(async (options: ExportOptions) => {
    const result = await exportCanvas(options)
    
    // Trigger download
    const link = document.createElement('a')
    link.href = result.dataUrl!
    link.download = result.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Cleanup blob URL
    if (result.dataUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(result.dataUrl)
    }
    
    return result
  }, [exportCanvas])
  
  const copyToClipboard = useCallback(async (options: ExportOptions) => {
    const result = await exportCanvas(options)
    
    if (!result.blob) {
      throw new Error('Export fehlgeschlagen')
    }
    
    if (options.format === 'png') {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': result.blob })
      ])
    } else {
      const text = await result.blob.text()
      await navigator.clipboard.writeText(text)
    }
    
    return result
  }, [exportCanvas])
  
  return {
    exportCanvas,
    downloadExport,
    copyToClipboard,
  }
}
