'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { useIsAdmin } from '../../../../lib/useIsAdmin'
import { API_ENDPOINTS, WS_ENDPOINTS } from '../../../../lib/api-config'

type LiveState = {
  active: boolean
  session_id?: string
  title?: string
  description?: string
  join_url?: string | null
  started_at?: string
  stopped_at?: string
}

type Participant = { clerk_user_id: string; user_name: string; is_admin?: boolean }
type ChatMessage = { clerk_user_id: string; user_name: string; text: string; at: string }

const DELAY_OPTIONS = [0, 5, 10, 15, 30]

export default function AdminGoLivePage() {
  const { user } = useUser()
  const { isAdmin, isLoading: adminLoading } = useIsAdmin()
  const clerkId = user?.id ?? ''
  const nameFromProfile = [user?.firstName, user?.lastName].filter(Boolean).join(' ')
  const emailFallback = user?.primaryEmailAddress?.emailAddress
  const userName = (nameFromProfile || emailFallback) ?? 'Admin'

  const [state, setState] = useState<LiveState>({ active: false })
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [joinUrl, setJoinUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [participants, setParticipants] = useState<Participant[]>([])
  const [delaySeconds, setDelaySeconds] = useState(0)
  const [muted, setMuted] = useState<Set<string>>(new Set())
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [wsConnected, setWsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // WebRTC: admin local stream and peer connections (admin -> viewers)
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [webcamEnabled, setWebcamEnabled] = useState(false)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())

  const rtcConfig: RTCConfiguration = {
    iceServers: [
      {
        urls: 'stun:stun.relay.metered.ca:80',
      },
      {
        urls: 'turn:global.relay.metered.ca:80',
        username: '4d2a57be154238f9dfc223ae',
        credential: 'MBZboN6uRDUZIZgl',
      },
      {
        urls: 'turn:global.relay.metered.ca:80?transport=tcp',
        username: '4d2a57be154238f9dfc223ae',
        credential: 'MBZboN6uRDUZIZgl',
      },
      {
        urls: 'turn:global.relay.metered.ca:443',
        username: '4d2a57be154238f9dfc223ae',
        credential: 'MBZboN6uRDUZIZgl',
      },
      {
        urls: 'turns:global.relay.metered.ca:443?transport=tcp',
        username: '4d2a57be154238f9dfc223ae',
        credential: 'MBZboN6uRDUZIZgl',
      },
    ],
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch(API_ENDPOINTS.liveCurrent)
      const data = (await res.json()) as LiveState
      setState(data && typeof data.active === 'boolean' ? data : { active: false })
      if (data?.active && data.title) setTitle(data.title)
      if (data?.active && typeof data.description === 'string') setDescription(data.description)
      if (data?.active && typeof data.join_url === 'string') setJoinUrl(data.join_url)
    } catch {
      setState({ active: false })
    }
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    load()
    const t = setInterval(load, 10000)
    return () => clearInterval(t)
  }, [isAdmin, load])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Helper: ensure local camera/mic stream
  const ensureLocalStream = useCallback(async () => {
    if (localStream) return localStream
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      setLocalStream(stream)
      setWebcamEnabled(true)
      return stream
    } catch (err) {
      console.error('Failed to get user media', err)
      setError('Could not access camera or microphone. Please check browser permissions.')
      throw err
    }
  }, [localStream])

  // Keep video element in sync with local stream
  useEffect(() => {
    if (localVideoRef.current && localStream && webcamEnabled) {
      // Assign the MediaStream to the video element when either stream or ref is ready
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream
      }
    }
  }, [localStream, webcamEnabled])

  useEffect(() => {
    if (!state.active || !state.session_id || !clerkId) return
    const url = WS_ENDPOINTS.live(state.session_id, clerkId, userName, true)
    const ws = new WebSocket(url)
    wsRef.current = ws
    setWsConnected(false)
    setChatMessages([])
    setParticipants([])

    ws.onopen = () => setWsConnected(true)
    ws.onclose = () => {
      setWsConnected(false)
      wsRef.current = null
    }
    ws.onerror = () => setWsConnected(false)
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string)
        switch (data.type) {
          case 'room_state':
            setDelaySeconds(data.delay_seconds ?? 0)
            setParticipants(data.participants ?? [])
            setMuted(new Set((data.muted ?? []) as string[]))
            break
          case 'chat':
            setChatMessages((prev) => [...prev, { clerk_user_id: data.clerk_user_id, user_name: data.user_name, text: data.text, at: data.at }])
            break
          case 'delay_updated':
            setDelaySeconds(data.delay_seconds ?? 0)
            break
          case 'mute_updated':
            setMuted((prev) => {
              const next = new Set(prev)
              if (data.muted) next.add(data.clerk_user_id)
              else next.delete(data.clerk_user_id)
              return next
            })
            break
          case 'participant_joined':
            setParticipants((prev) => {
              if (prev.some((p) => p.clerk_user_id === data.clerk_user_id)) return prev
              return [...prev, { clerk_user_id: data.clerk_user_id, user_name: data.user_name, is_admin: data.is_admin }]
            })
            break
          case 'participant_left':
            setParticipants((prev) => prev.filter((p) => p.clerk_user_id !== data.clerk_user_id))
            break
          case 'user_removed':
            setParticipants((prev) => prev.filter((p) => p.clerk_user_id !== data.clerk_user_id))
            break
          case 'webrtc_answer': {
            const target = data.to as string | undefined
            if (!target || target !== clerkId) break
            const fromId = data.from as string
            const pc = peerConnectionsRef.current.get(fromId)
            if (pc && data.sdp) {
              pc.setRemoteDescription(new RTCSessionDescription(data.sdp)).catch((err: unknown) =>
                console.error('Error applying remote answer', err),
              )
            }
            break
          }
          case 'webrtc_ice_candidate': {
            const target = data.to as string | undefined
            if (!target || target !== clerkId) break
            const fromId = data.from as string
            const pc = peerConnectionsRef.current.get(fromId)
            if (pc && data.candidate) {
              pc
                .addIceCandidate(new RTCIceCandidate(data.candidate))
                .catch((err: unknown) => console.error('Error adding ICE candidate', err))
            }
            break
          }
          default:
            break
        }
      } catch {
        // ignore
      }
    }
    return () => {
      // Clean up peer connections when WS closes
      peerConnectionsRef.current.forEach((pc) => pc.close())
      peerConnectionsRef.current.clear()
      ws.close()
      wsRef.current = null
    }
  }, [state.active, state.session_id, clerkId, userName])

  // When a new non-admin participant joins and webcam is enabled, start WebRTC offer
  useEffect(() => {
    const setupForNewParticipants = async () => {
      if (!webcamEnabled || !localStream || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
      for (const p of participants) {
        if (p.is_admin) continue
        if (peerConnectionsRef.current.has(p.clerk_user_id)) continue

        const pc = new RTCPeerConnection(rtcConfig)
        peerConnectionsRef.current.set(p.clerk_user_id, pc)

        // Add local tracks
        localStream.getTracks().forEach((track) => pc.addTrack(track, localStream))

        pc.onicecandidate = (event) => {
          if (event.candidate && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                type: 'webrtc_ice_candidate',
                target: p.clerk_user_id,
                candidate: event.candidate,
              }),
            )
          }
        }

        try {
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          wsRef.current.send(
            JSON.stringify({
              type: 'webrtc_offer',
              target: p.clerk_user_id,
              sdp: offer,
            }),
          )
        } catch (err) {
          console.error('Error creating WebRTC offer', err)
        }
      }
    }
    void setupForNewParticipants()
  }, [participants, webcamEnabled, localStream])

  const startLive = async () => {
    if (!clerkId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(API_ENDPOINTS.adminLiveStart, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clerk_user_id: clerkId,
          title,
          description,
          join_url: joinUrl || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) throw new Error(data.detail || data.error || 'Failed to start')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start live session')
    } finally {
      setLoading(false)
    }
  }

  const stopLive = async () => {
    if (!clerkId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(API_ENDPOINTS.adminLiveStop, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clerk_user_id: clerkId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) throw new Error(data.detail || data.error || 'Failed to stop')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to stop live session')
    } finally {
      setLoading(false)
    }
  }

  const setDelay = (value: number) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    wsRef.current.send(JSON.stringify({ type: 'set_delay', value }))
    setDelaySeconds(value)
  }

  const kickUser = (clerkUserId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    wsRef.current.send(JSON.stringify({ type: 'kick', clerk_user_id: clerkUserId }))
  }

  const muteUser = (clerkUserId: string, mute: boolean) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    wsRef.current.send(JSON.stringify({ type: mute ? 'mute_chat' : 'unmute_chat', clerk_user_id: clerkUserId, mute }))
  }

  if (adminLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-vedya-purple border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <p className="text-slate-600">You do not have access to Go Live.</p>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] flex flex-col px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Go Live</h1>
          <p className="text-slate-600">Start a live session. Users join at <span className="font-mono">/dashboard/live</span> (video + live chat).</p>
        </div>
        {state.active ? (
          <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            LIVE {wsConnected ? '· Connected' : ''}
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-slate-700">
            OFFLINE
          </span>
        )}
      </div>

      {error && <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}

      {!state.active ? (
        <div className="rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-black/5 shadow-[0_14px_30px_rgba(0,0,0,0.08)] p-6 max-w-2xl">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Session title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. AI Fundamentals Live Q&A"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={3}
                placeholder="What will you cover?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Video/call join link (optional)</label>
              <input
                value={joinUrl}
                onChange={(e) => setJoinUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Zoom, Meet, or any URL for camera & mic"
              />
              <p className="text-xs text-slate-500 mt-1">Share this link so users can join with camera and microphone.</p>
            </div>
          </div>
          <div className="mt-6 flex gap-3 flex-wrap">
            <button
              type="button"
              onClick={startLive}
              disabled={loading || !title.trim()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-white bg-gradient-to-r from-vedya-purple to-vedya-pink hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Starting…' : 'Start live'}
            </button>
            <a
              href="/dashboard/live"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-slate-700 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
            >
              Preview viewer page
            </a>
          </div>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
          {/* Left: admin camera & mic (local preview) */}
          <div className="lg:col-span-2 flex flex-col rounded-2xl bg-slate-900 overflow-hidden ring-1 ring-black/5 shadow-xl min-h-[320px]">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800/80">
              <span className="text-sm font-medium text-slate-300">Your camera & microphone (broadcast to viewers)</span>
              <button
                type="button"
                onClick={async () => {
                  if (webcamEnabled) {
                    // Turn off
                    localStream?.getTracks().forEach((t) => t.stop())
                    setLocalStream(null)
                    setWebcamEnabled(false)
                    if (localVideoRef.current) {
                      localVideoRef.current.srcObject = null
                    }
                    peerConnectionsRef.current.forEach((pc) => pc.close())
                    peerConnectionsRef.current.clear()
                    // Inform viewers that the host camera has been turned off
                    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                      wsRef.current.send(JSON.stringify({ type: 'camera_state', on: false }))
                    }
                  } else {
                    await ensureLocalStream()
                    // Inform viewers that the host camera is now on (a new WebRTC offer will follow)
                    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                      wsRef.current.send(JSON.stringify({ type: 'camera_state', on: true }))
                    }
                  }
                }}
                className="text-xs px-3 py-1.5 rounded-full bg-slate-700 text-slate-100 hover:bg-slate-600"
              >
                {webcamEnabled ? 'Turn off camera' : 'Enable camera & mic'}
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center p-4 min-h-[280px]">
              {webcamEnabled && localStream ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full min-h-[240px] rounded-lg bg-black object-contain"
                />
              ) : (
                <p className="text-slate-400 text-sm text-center max-w-sm">
                  Click <span className="font-semibold">Enable camera &amp; mic</span> to start broadcasting yourself to all live viewers.
                </p>
              )}
            </div>
          </div>

          {/* Right: live chat + admin controls */}
          <div className="flex flex-col rounded-2xl bg-white ring-1 ring-black/5 shadow-xl min-h-[400px] overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-sm font-semibold text-slate-800">Live chat (admin view)</span>
                <span className="text-xs text-slate-500">{participants.length} participant(s)</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-slate-600">Stream delay:</label>
                <select
                  value={delaySeconds}
                  onChange={(e) => setDelay(Number(e.target.value))}
                  className="text-sm rounded-lg border border-slate-200 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {DELAY_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d === 0 ? 'None' : `${d}s`}
                    </option>
                  ))}
                </select>
              </div>
              {participants.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs font-medium text-slate-600 mb-1">Participants</p>
                  <ul className="space-y-1.5 max-h-32 overflow-y-auto">
                    {participants
                      .filter((p) => !p.is_admin)
                      .map((p) => (
                        <li key={p.clerk_user_id} className="flex items-center justify-between gap-2 text-sm">
                          <span className="truncate text-slate-700">{p.user_name || p.clerk_user_id.slice(0, 8)}</span>
                          <span className="flex gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => muteUser(p.clerk_user_id, !muted.has(p.clerk_user_id))}
                              className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200"
                            >
                              {muted.has(p.clerk_user_id) ? 'Unmute' : 'Mute chat'}
                            </button>
                            <button
                              type="button"
                              onClick={() => kickUser(p.clerk_user_id)}
                              className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200"
                            >
                              Remove
                            </button>
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
              {chatMessages.length === 0 && (
                <p className="text-slate-400 text-sm">Chat messages from viewers will appear here (no delay for you).</p>
              )}
              {chatMessages.map((m, i) => (
                <div key={i} className="text-sm">
                  <span className="font-medium text-slate-700">{m.user_name || 'Guest'}:</span>{' '}
                  <span className="text-slate-800">{m.text}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="p-3 border-t border-slate-200">
              <button
                type="button"
                onClick={stopLive}
                disabled={loading}
                className="w-full py-2.5 rounded-xl font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-60"
              >
                {loading ? 'Stopping…' : 'End live session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
