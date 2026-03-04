'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const DRAWIO_ORIGIN = 'https://embed.diagrams.net'
const DRAWIO_URL = `${DRAWIO_ORIGIN}/?embed=1&proto=json&spin=1&libraries=1&noSaveBtn=0&saveAndExit=0`

// Minimal blank diagram XML so the editor opens with an empty canvas
const BLANK_DIAGRAM_XML = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net">
  <diagram id="blank" name="Page-1">
    <mxGraphModel dx="1422" dy="794" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`

export default function DrawioPanel() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const diagramXmlRef = useRef<string>(BLANK_DIAGRAM_XML)

  const sendToDrawio = useCallback((msg: object) => {
    const iframe = iframeRef.current?.contentWindow
    if (iframe) {
      iframe.postMessage(JSON.stringify(msg), DRAWIO_ORIGIN)
    }
  }, [])

  useEffect(() => {
    const handleMessage = (ev: MessageEvent) => {
      if (ev.origin !== DRAWIO_ORIGIN || typeof ev.data !== 'string') return
      try {
        const msg = JSON.parse(ev.data) as { event?: string; xml?: string; exit?: boolean }
        if (msg.event === 'init') {
          setReady(true)
          sendToDrawio({
            action: 'load',
            xml: diagramXmlRef.current,
            autosave: 1,
            title: 'Diagram',
          })
        } else if (msg.event === 'save' && msg.xml) {
          diagramXmlRef.current = msg.xml
        } else if (msg.event === 'exit') {
          setReady(false)
        }
      } catch {
        // ignore non-JSON or parse errors
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [sendToDrawio])

  return (
    <div className="flex flex-col h-full min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50/80 flex-shrink-0">
        <span className="text-sm font-medium text-gray-700">Diagrams (Draw.io)</span>
        <a
          href="https://www.drawio.com/doc/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-indigo-600 hover:text-indigo-800"
        >
          Help
        </a>
      </div>
      <div className="flex-1 min-h-0 relative bg-[#fafafa]">
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-4 bg-white/90 z-10">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={DRAWIO_URL}
          title="Draw.io Diagram Editor"
          className="absolute inset-0 w-full h-full border-0"
          onError={() => setError('Failed to load diagram editor.')}
        />
        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-[1]">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-600">Loading diagram editor…</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
