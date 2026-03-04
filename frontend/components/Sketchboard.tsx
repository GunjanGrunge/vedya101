'use client'

import { useRef, useState } from 'react'
import { ReactSketchCanvas, type ReactSketchCanvasRef } from 'react-sketch-canvas'

const STROKE_COLORS = ['#4f46e5', '#7c3aed', '#1f2937', '#dc2626', '#059669', '#0ea5e9']

interface SketchboardProps {
  /** When provided, a Submit button is shown that exports the canvas as PNG and calls this with the data URL */
  onSubmit?: (imageDataUrl: string) => void
  /** Optional background image (e.g. blackboard image) to draw on top of; export will include it */
  backgroundImage?: string | null
}

export default function Sketchboard({ onSubmit, backgroundImage }: SketchboardProps) {
  const canvasRef = useRef<ReactSketchCanvasRef>(null)
  const [strokeWidth, setStrokeWidth] = useState(4)
  const [strokeColor, setStrokeColor] = useState(STROKE_COLORS[0])
  const [isEraser, setIsEraser] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleClear = () => {
    canvasRef.current?.clearCanvas()
  }

  const handleUndo = () => {
    canvasRef.current?.undo()
  }

  const toggleEraser = () => {
    const next = !isEraser
    setIsEraser(next)
    canvasRef.current?.eraseMode(next)
  }

  const handleSubmit = async () => {
    if (!onSubmit || !canvasRef.current) return
    setSubmitting(true)
    try {
      const dataUrl = await canvasRef.current.exportImage('png')
      onSubmit(dataUrl)
    } catch (e) {
      console.error('Failed to export canvas:', e)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50/80 flex-shrink-0">
        <span className="text-sm font-medium text-gray-700">Notebook</span>
        <div className="flex items-center gap-1 flex-wrap">
          <div className="flex items-center gap-1">
            {STROKE_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => {
                  if (!isEraser) {
                    setStrokeColor(color)
                    canvasRef.current?.eraseMode(false)
                  }
                }}
                className={`w-6 h-6 rounded-full border-2 transition-all ${
                  strokeColor === color && !isEraser
                    ? 'border-gray-800 scale-110'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
                style={{ backgroundColor: color }}
                title="Stroke color"
              />
            ))}
          </div>
          <label className="flex items-center gap-1 text-xs text-gray-600">
            <span>Size</span>
            <input
              type="range"
              min={1}
              max={12}
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="w-20 h-1.5 accent-indigo-600"
            />
          </label>
          <button
            type="button"
            onClick={toggleEraser}
            className={`px-2 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              isEraser ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Eraser
          </button>
          <button
            type="button"
            onClick={handleUndo}
            className="px-2 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="px-2 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-red-600 hover:bg-red-50 transition-colors"
          >
            Clear
          </button>
          {onSubmit && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            >
              {submitting ? 'Submitting…' : 'Submit to chat'}
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0 relative bg-[#fafafa]">
        <ReactSketchCanvas
          ref={canvasRef}
          strokeWidth={strokeWidth}
          strokeColor={strokeColor}
          canvasColor="transparent"
          backgroundImage={backgroundImage || ''}
          exportWithBackgroundImage={Boolean(backgroundImage)}
          style={{ width: '100%', height: '100%', border: 'none' }}
          className="absolute inset-0 w-full h-full"
        />
      </div>
    </div>
  )
}
