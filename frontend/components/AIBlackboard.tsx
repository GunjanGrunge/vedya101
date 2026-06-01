'use client'

/**
 * AIBlackboard — Epic 4 (Stories 4.1, 4.2, 4.3, 4.4)
 *
 * Renders AI-generated Excalidraw elements as an animated SVG, layered under a
 * ReactSketchCanvas annotation surface. Provides a toolbar for learner annotations.
 */

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { ReactSketchCanvas, type ReactSketchCanvasRef } from 'react-sketch-canvas'
import { API_ENDPOINTS } from '../lib/api-config'
import type {
  ExcalidrawElement,
  AnnotationBounds,
} from '../types/blackboard'

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export type SketchPath = {
  drawMode: boolean
  strokeColor: string
  strokeWidth: number
  paths: Array<{ x: number; y: number }>
}

export interface AIBlackboardHandle {
  getAnnotationBounds: () => AnnotationBounds | null
  exportAnnotationSVG: () => Promise<string>
}

interface ToolConfig {
  strokeWidth: number
  strokeColor: string
  erase: boolean
}

const TOOL_CONFIG: Record<string, ToolConfig> = {
  pen:    { strokeWidth: 3,  strokeColor: '#ef4444', erase: false },
  circle: { strokeWidth: 5,  strokeColor: '#ef4444', erase: false },
  marker: { strokeWidth: 8,  strokeColor: '#ef4444', erase: false },
  eraser: { strokeWidth: 10, strokeColor: '#ef4444', erase: true  },
}

// ────────────────────────────────────────────────────────────────────────────
// Pure bounding-box helper (also exported for unit testing)
// ────────────────────────────────────────────────────────────────────────────

export function computeAnnotationBounds(paths: SketchPath[]): AnnotationBounds | null {
  const points = paths.flatMap((p) => p.paths)
  if (points.length === 0) return null
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Lightweight SVG renderer (no @excalidraw/excalidraw package)
// ────────────────────────────────────────────────────────────────────────────

export function ExcalidrawSVGRenderer({ elements }: { elements: ExcalidrawElement[] }) {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 800 600"
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}
    >
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#a78bfa" />
        </marker>
      </defs>
      {elements.map((el, i) => {
        const delay = `${i * 120}ms`
        const cls = 'animate-fade-in'
        const style: React.CSSProperties = { animationDelay: delay }

        if (el.type === 'rectangle') {
          return (
            <rect
              key={el.id}
              x={el.x}
              y={el.y}
              width={el.width}
              height={el.height}
              rx={8}
              stroke={el.strokeColor || '#a78bfa'}
              strokeWidth={2}
              fill={el.backgroundColor || 'transparent'}
              className={cls}
              style={style}
            />
          )
        }

        if (el.type === 'ellipse') {
          const cx = el.x + el.width / 2
          const cy = el.y + el.height / 2
          return (
            <ellipse
              key={el.id}
              cx={cx}
              cy={cy}
              rx={el.width / 2}
              ry={el.height / 2}
              stroke={el.strokeColor || '#a78bfa'}
              strokeWidth={2}
              fill={el.backgroundColor || 'transparent'}
              className={cls}
              style={style}
            />
          )
        }

        if (el.type === 'diamond') {
          const cx = el.x + el.width / 2
          const cy = el.y + el.height / 2
          const pts = `${cx},${el.y} ${el.x + el.width},${cy} ${cx},${el.y + el.height} ${el.x},${cy}`
          return (
            <polygon
              key={el.id}
              points={pts}
              stroke={el.strokeColor || '#a78bfa'}
              strokeWidth={2}
              fill={el.backgroundColor || 'transparent'}
              className={cls}
              style={style}
            />
          )
        }

        if (el.type === 'arrow') {
          const pts = el.points || [[el.x, el.y], [el.x + el.width, el.y + el.height]]
          const [[x1, y1], [x2, y2]] = pts as [[number, number], [number, number]]
          return (
            <line
              key={el.id}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={el.strokeColor || '#a78bfa'}
              strokeWidth={2}
              markerEnd="url(#arrowhead)"
              className={cls}
              style={style}
            />
          )
        }

        if (el.type === 'text') {
          return (
            <text
              key={el.id}
              x={el.x}
              y={el.y + (el.fontSize || 14)}
              fill="#f8f8f2"
              fontSize={el.fontSize || 14}
              fontFamily="ui-sans-serif, system-ui, sans-serif"
              className={cls}
              style={style}
            >
              {el.text}
            </text>
          )
        }

        return null
      })}
    </svg>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// AIBlackboard component
// ────────────────────────────────────────────────────────────────────────────

interface AIBlackboardProps {
  elements: ExcalidrawElement[]
  isVisible: boolean
  onClose?: () => void
  /** Fires whenever the annotation canvas changes. */
  onAnnotationChange?: (paths: SketchPath[], bounds: AnnotationBounds | null, exportFn: () => Promise<string>) => void
  /** Called when AI re-explanation text is received; parent appends it to chat. */
  onExplanationReceived?: (explanation: string) => void
  /** Session context for explain-annotation call */
  sessionId?: string
  clerkUserId?: string
  concept?: string
  subject?: string
  /** Read-only mode (Story 4.4): disables toolbar, shows saved annotations */
  readOnly?: boolean
  /** Saved annotations SVG data URL (Story 4.4 read-only review) */
  annotationsSvg?: string | null
}

const AIBlackboard = forwardRef<AIBlackboardHandle, AIBlackboardProps>(
  function AIBlackboard(
    {
      elements,
      isVisible,
      onClose,
      onAnnotationChange,
      onExplanationReceived,
      sessionId,
      clerkUserId,
      concept,
      subject,
      readOnly = false,
      annotationsSvg,
    },
    ref,
  ) {
    const canvasRef = useRef<ReactSketchCanvasRef>(null)
    const [activeTool, setActiveTool] = useState<'pen' | 'circle' | 'marker' | 'eraser'>('pen')
    const [pathCount, setPathCount] = useState(0)
    const [askLoading, setAskLoading] = useState(false)
    const [askError, setAskError] = useState<string | null>(null)

    // ── Expose helpers via ref ─────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
      getAnnotationBounds: () => {
        // Sync version: we store last-known paths in state via onAnnotationChange
        // For imperative use, call exportPaths directly (async wrapper not available here)
        return null // Callers should use the onAnnotationChange-supplied bounds
      },
      exportAnnotationSVG: async () => {
        if (!canvasRef.current) return ''
        try {
          return await canvasRef.current.exportImage('svg')
        } catch {
          return ''
        }
      },
    }))

    // ── Canvas event handlers ──────────────────────────────────────────────

    const handleAnnotationChange = async () => {
      if (!canvasRef.current) return
      try {
        const paths = (await canvasRef.current.exportPaths()) as SketchPath[]
        setPathCount(paths.length)
        const bounds = computeAnnotationBounds(paths)
        const exportFn = async () => {
          if (!canvasRef.current) return ''
          return canvasRef.current.exportImage('svg')
        }
        onAnnotationChange?.(paths, bounds, exportFn)
      } catch {
        // ignore
      }
    }

    // ── Tool switching ─────────────────────────────────────────────────────

    const selectTool = (tool: typeof activeTool) => {
      if (readOnly) return
      setActiveTool(tool)
      const cfg = TOOL_CONFIG[tool]
      canvasRef.current?.eraseMode(cfg.erase)
    }

    // ── Toolbar actions ────────────────────────────────────────────────────

    const handleClear = () => canvasRef.current?.clearCanvas()
    const handleUndo  = () => canvasRef.current?.undo()

    // ── Ask AI about annotation ────────────────────────────────────────────

    const handleAskAI = async () => {
      if (!canvasRef.current) return
      setAskError(null)

      const paths = (await canvasRef.current.exportPaths()) as SketchPath[]
      const bounds = computeAnnotationBounds(paths)

      if (!bounds) {
        setAskError('Draw on the diagram first, then click Ask AI')
        return
      }

      setAskLoading(true)
      try {
        const res = await fetch(API_ENDPOINTS.explainAnnotation, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId || 'session_unknown',
            clerk_user_id: clerkUserId || 'unknown',
            annotation_bounds: bounds,
            current_diagram_elements: elements,
            subject: subject || '',
            concept: concept || '',
          }),
        })
        const data = await res.json()
        if (data.explanation) {
          onExplanationReceived?.(data.explanation)
        }
      } catch (err) {
        setAskError('Failed to reach AI. Please try again.')
        console.error('explain-annotation error:', err)
      } finally {
        setAskLoading(false)
      }
    }

    // ── Render ─────────────────────────────────────────────────────────────

    if (!isVisible) return null

    const tool = TOOL_CONFIG[activeTool]

    return (
      <div
        className="flex flex-col rounded-2xl overflow-hidden border border-purple-900/40 shadow-2xl"
        style={{ background: '#1e1e2e', minWidth: 320, minHeight: 420, height: '100%' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-purple-900/40 bg-[#16162a]">
          <span className="text-xs font-semibold text-purple-300 tracking-wide uppercase">
            AI Blackboard {readOnly && '· Read-only'}
          </span>
          {onClose && !readOnly && (
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-white transition-colors text-lg leading-none"
              aria-label="Close blackboard"
            >
              &times;
            </button>
          )}
        </div>

        {/* Canvas area */}
        <div className="flex-1 relative" style={{ minHeight: 300 }}>
          {/* AI SVG visual layer */}
          {elements.length > 0 && <ExcalidrawSVGRenderer elements={elements} />}

          {/* Saved annotations overlay (read-only) */}
          {readOnly && annotationsSvg && (
            <img
              src={annotationsSvg}
              alt="Learner annotations"
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ zIndex: 5 }}
            />
          )}

          {/* Live annotation canvas */}
          {!readOnly && (
            <ReactSketchCanvas
              ref={canvasRef}
              strokeWidth={tool.strokeWidth}
              strokeColor={tool.strokeColor}
              canvasColor="transparent"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', zIndex: 10 }}
              onChange={handleAnnotationChange}
            />
          )}
        </div>

        {/* Toolbar */}
        {!readOnly && (
          <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 border-t border-purple-900/30 bg-[#16162a]">
            {(['pen', 'circle', 'marker', 'eraser'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => selectTool(t)}
                className={`px-2 py-1.5 text-xs rounded-lg transition-colors font-medium capitalize ${
                  activeTool === t
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}

            <div className="flex-1" />

            <button
              type="button"
              onClick={handleUndo}
              className="px-2 py-1.5 text-xs rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
            >
              Undo
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="px-2 py-1.5 text-xs rounded-lg bg-gray-800 text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-colors"
            >
              Clear
            </button>

            {pathCount > 0 && (
              <button
                type="button"
                onClick={handleAskAI}
                disabled={askLoading}
                className="px-3 py-1.5 text-xs rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-60 transition-colors font-medium"
              >
                {askLoading ? 'Asking…' : 'Ask AI about this'}
              </button>
            )}
          </div>
        )}

        {/* Error message */}
        {askError && (
          <p className="px-3 py-1.5 text-xs text-red-400 bg-red-900/10 border-t border-red-900/20">
            {askError}
          </p>
        )}

        {readOnly && (
          <div className="px-3 py-1.5 text-center text-xs text-gray-500 border-t border-purple-900/30">
            Read-only — session ended
          </div>
        )}
      </div>
    )
  },
)

export default AIBlackboard
