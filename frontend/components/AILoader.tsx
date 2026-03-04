'use client'

interface AILoaderProps {
  message?: string
  subMessage?: string
  className?: string
}

export default function AILoader({ message = 'Loading your profile...', subMessage, className = '' }: AILoaderProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-8 py-16 px-4 ${className}`}>
      {/* Orb container */}
      <div className="relative w-24 h-24">
        {/* Outer rotating ring */}
        <div
          className="absolute inset-0 rounded-full border-2 border-transparent"
          style={{
            borderTopColor: 'rgba(136, 87, 242, 0.6)',
            borderRightColor: 'rgba(242, 126, 202, 0.4)',
            borderBottomColor: 'rgba(136, 87, 242, 0.2)',
            borderLeftColor: 'rgba(242, 126, 202, 0.6)',
            animation: 'ai-loader-spin 1.8s linear infinite',
          }}
        />
        {/* Inner ring (reverse) */}
        <div
          className="absolute inset-2 rounded-full border-2 border-transparent"
          style={{
            borderTopColor: 'rgba(242, 126, 202, 0.5)',
            borderLeftColor: 'rgba(136, 87, 242, 0.5)',
            borderBottomColor: 'rgba(242, 126, 202, 0.3)',
            borderRightColor: 'rgba(136, 87, 242, 0.3)',
            animation: 'ai-loader-spin 2.2s linear infinite reverse',
          }}
        />
        {/* Orbiting dots - one ring that rotates, dots at 72° apart */}
        <div
          className="absolute inset-0"
          style={{ animation: 'ai-loader-spin 2.5s linear infinite' }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-vedya-purple shadow-[0_0_12px_rgba(136,87,242,0.8)]"
              style={{
                transform: `rotate(${i * 72}deg) translate(-50%, -50%) translateY(-34px)`,
              }}
            />
          ))}
        </div>
        {/* Center pulsing core */}
        <div
          className="absolute inset-0 m-auto w-10 h-10 rounded-full opacity-90"
          style={{
            background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), rgba(136, 87, 242, 0.8) 40%, rgba(242, 126, 202, 0.9))',
            boxShadow: '0 0 40px rgba(136, 87, 242, 0.5), 0 0 80px rgba(242, 126, 202, 0.3), inset 0 0 20px rgba(255,255,255,0.3)',
            animation: 'ai-loader-pulse 1.5s ease-in-out infinite',
          }}
        />
      </div>

      {/* Message with gradient and shine */}
      <div className="text-center">
        <p
          className="text-base font-semibold bg-clip-text text-transparent bg-[length:200%_100%]"
          style={{
            backgroundImage: 'linear-gradient(90deg, #6C45BF 0%, #8857F2 25%, #F27ECA 50%, #8857F2 75%, #6C45BF 100%)',
            animation: 'ai-loader-shine 2.5s ease-in-out infinite',
          }}
        >
          {message}
        </p>
        {subMessage && (
          <p className="mt-1.5 text-sm text-slate-500 animate-pulse">{subMessage}</p>
        )}
      </div>

      {/* Scan line effect bar */}
      <div className="w-48 h-1 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full w-[40%] rounded-full bg-gradient-to-r from-transparent via-vedya-purple to-vedya-pink"
          style={{ animation: 'ai-loader-scan 1.2s ease-in-out infinite' }}
        />
      </div>
    </div>
  )
}
