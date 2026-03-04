'use client'

import { useEffect, useState, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { API_ENDPOINTS, WS_ENDPOINTS } from '../../../lib/api-config'

type LiveState = {
  active: boolean
  session_id?: string
  title?: string
  description?: string
  join_url?: string | null
  started_at?: string
  stopped_at?: string
}

type ChatMessage = { clerk_user_id: string; user_name: string; text: string; at: string }

export default function LivePage() {
  const { user } = useUser()
  const clerkId = user?.id ?? ''
  const nameFromProfile = [user?.firstName, user?.lastName].filter(Boolean).join(' ')
  const emailFallback = user?.primaryEmailAddress?.emailAddress
  const userName = (nameFromProfile || emailFallback) ?? 'Guest'

  const [state, setState] = useState<LiveState>({ active: false })
  const [loading, setLoading] = useState(true)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [wsConnected, setWsConnected] = useState(false)
  const [kicked, setKicked] = useState(false)
  const [muted, setMuted] = useState(false)
  const [hostCameraOff, setHostCameraOff] = useState(false)
  const [sessionEnded, setSessionEnded] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // WebRTC: viewer receives admin video stream
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)

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

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(API_ENDPOINTS.liveCurrent)
        const data = (await res.json()) as LiveState
        if (!cancelled) setState(data && typeof data.active === 'boolean' ? data : { active: false })
      } catch {
        if (!cancelled) setState({ active: false })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    const t = setInterval(load, 10000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Keep remote video element in sync with incoming stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      if (remoteVideoRef.current.srcObject !== remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream
      }
    }
  }, [remoteStream])

  useEffect(() => {
    if (!state.active || !state.session_id || !clerkId) return
    setKicked(false)
    setSessionEnded(false)
    setMuted(false)
    setHostCameraOff(false)
    setChatMessages([])
    const url = WS_ENDPOINTS.live(state.session_id, clerkId, userName, false)
    const ws = new WebSocket(url)
    wsRef.current = ws
    setWsConnected(false)

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
          case 'kicked':
            setKicked(true)
            ws.close()
            break
          case 'session_ended':
            setSessionEnded(true)
            ws.close()
            break
          case 'chat':
            setChatMessages((prev) => [...prev, { clerk_user_id: data.clerk_user_id, user_name: data.user_name, text: data.text, at: data.at }])
            break
          case 'chat_rejected':
            setMuted(true)
            break
          case 'mute_updated':
            if (data.clerk_user_id === clerkId) setMuted(!!data.muted)
            break
          case 'camera_state': {
            const on = !!data.on
            if (!on) {
              // Host explicitly turned camera off – clear any frozen frame and show message
              setHostCameraOff(true)
              setRemoteStream(null)
              if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = null
              }
            } else {
              // Host turned camera back on – wait for new WebRTC tracks
              setHostCameraOff(false)
            }
            break
          }
          case 'webrtc_offer': {
            const target = data.to as string | undefined
            if (!target || target !== clerkId) break
            const sdp = data.sdp
            if (!sdp) break
            // Create peer connection if needed
            if (!peerConnectionRef.current) {
              const pc = new RTCPeerConnection(rtcConfig)
              peerConnectionRef.current = pc
              pc.ontrack = (event) => {
                const [stream] = event.streams
                if (stream) {
                  setRemoteStream(stream)
                  setHostCameraOff(false)
                  if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = stream
                  }
                }
              }
              pc.onicecandidate = (ev) => {
                if (ev.candidate && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                  wsRef.current.send(
                    JSON.stringify({
                      type: 'webrtc_ice_candidate',
                      target: data.from,
                      candidate: ev.candidate,
                    }),
                  )
                }
              }
            }
            const pc = peerConnectionRef.current
            pc
              .setRemoteDescription(new RTCSessionDescription(sdp))
              .then(() => pc.createAnswer())
              .then((answer) => pc.setLocalDescription(answer).then(() => answer))
              .then((answer) => {
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                  wsRef.current.send(
                    JSON.stringify({
                      type: 'webrtc_answer',
                      target: data.from,
                      sdp: answer,
                    }),
                  )
                }
              })
              .catch((err: unknown) => console.error('Error handling WebRTC offer', err))
            break
          }
          case 'webrtc_ice_candidate': {
            const target = data.to as string | undefined
            if (!target || target !== clerkId) break
            const candidate = data.candidate
            if (candidate && peerConnectionRef.current) {
              peerConnectionRef.current
                .addIceCandidate(new RTCIceCandidate(candidate))
                .catch((err: unknown) => console.error('Error adding ICE candidate (viewer)', err))
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
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
        peerConnectionRef.current = null
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null
      }
      ws.close()
      wsRef.current = null
    }
  }, [state.active, state.session_id, clerkId, userName])

  const sendChat = () => {
    const text = chatInput.trim()
    if (!text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || muted) return
    wsRef.current.send(JSON.stringify({ type: 'chat', text }))
    setChatInput('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 min-h-[40vh]">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (kicked) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="rounded-2xl bg-red-50 ring-1 ring-red-200 p-6 text-center">
          <h2 className="text-lg font-semibold text-red-800">You have been removed from the meeting</h2>
          <p className="text-red-600 text-sm mt-2">The host has ended your access to this live session.</p>
        </div>
      </div>
    )
  }

  if (sessionEnded) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="rounded-2xl bg-slate-100 ring-1 ring-slate-200 p-6 text-center">
          <h2 className="text-lg font-semibold text-slate-800">Live session has ended</h2>
          <p className="text-slate-600 text-sm mt-2">The host has ended the session. Refresh the page to see when the next one starts.</p>
        </div>
      </div>
    )
  }

  if (!state.active) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Live session</h1>
        <p className="text-slate-600 mb-6">Join the current live session (video + chat).</p>
        <div className="rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-black/5 shadow-[0_14px_30px_rgba(0,0,0,0.08)] p-6">
          <p className="text-slate-700 font-medium">No live session is currently running.</p>
          <p className="text-slate-500 text-sm mt-1">When the host starts a live session, it will appear here.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] flex flex-col px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{state.title || 'Live session'}</h1>
          {state.started_at && (
            <p className="text-xs text-slate-500 mt-1">Started: {new Date(state.started_at).toLocaleString()}</p>
          )}
        </div>
        <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
          LIVE {wsConnected ? '' : '· Connecting…'}
        </span>
      </div>
      {state.description && <p className="text-slate-600 mb-4 whitespace-pre-wrap">{state.description}</p>}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        {/* Left: admin video (WebRTC) */}
        <div className="lg:col-span-2 flex flex-col rounded-2xl bg-slate-900 overflow-hidden ring-1 ring-black/5 shadow-xl min-h-[320px]">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-800/80">
            <span className="text-sm font-medium text-slate-300">Live video</span>
          </div>
          <div className="flex-1 flex items-center justify-center p-4 min-h-[280px]">
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full min-h-[240px] rounded-lg bg-black object-contain"
              />
            ) : hostCameraOff ? (
              <p className="text-slate-300 text-sm text-center max-w-md">
                The host has turned off their camera. Please request the host to turn it back on if you need video.
              </p>
            ) : (
              <p className="text-slate-500 text-sm text-center">
                Waiting for the host&apos;s video to start. You can still use the live chat on the right.
              </p>
            )}
          </div>
        </div>

        {/* Right: live chat */}
        <div className="flex flex-col rounded-2xl bg-white ring-1 ring-black/5 shadow-xl min-h-[400px] overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200">
            <span className="text-sm font-semibold text-slate-800">Live chat</span>
            {muted && (
              <p className="text-xs text-amber-600 mt-1">You are muted and cannot send messages.</p>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
            {chatMessages.length === 0 && (
              <p className="text-slate-400 text-sm">Messages appear here (they may be delayed by the host).</p>
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
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                placeholder={muted ? 'You are muted' : 'Type a message…'}
                disabled={muted || !wsConnected}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:bg-slate-50"
              />
              <button
                type="button"
                onClick={sendChat}
                disabled={muted || !wsConnected || !chatInput.trim()}
                className="px-4 py-2 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
