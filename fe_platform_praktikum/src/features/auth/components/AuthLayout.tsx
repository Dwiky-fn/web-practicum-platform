import type { ReactNode } from "react"
import illustration from '../../../assets/polnep.webp'

interface AuthLayoutProps {
  children: ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-900 overflow-hidden font-sans">
      {/* Background Image */}
      <img
        src={illustration}
        alt="Background POLNEP"
        className="absolute inset-0 w-full h-full object-cover scale-105 transition-transform duration-1000"
      />

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/75 via-slate-900/60 to-blue-950/75 backdrop-blur-[2px]" />

      {/* Login Card Container */}
      <div className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/40 p-6 sm:p-8 transition-all duration-300">
        {children}
      </div>
    </div>
  )
}
