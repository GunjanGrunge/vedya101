'use client'

import { useEffect, ReactNode } from 'react'
import Lenis from '@studio-freight/lenis'

interface LenisProviderProps {
    children: ReactNode
}

export default function LenisProvider({ children }: LenisProviderProps) {
    useEffect(() => {
        const lenis = new Lenis({
            lerp: 0.08,
        })

        function raf(time: number) {
            lenis.raf(time)
            requestAnimationFrame(raf)
        }

        requestAnimationFrame(raf)

        return () => {
            lenis.destroy()
        }
    }, [])

    return <>{children}</>
}


