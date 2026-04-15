import type { ReactNode } from "react"
import illustration from '../../../assets/polnep.webp'

interface AuthLayoutProps {
  children: ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 bg-white overflow-hidden">
      {/* Background Image */}
      <img
        src={illustration}
        alt="Background"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Overlay biar agak gelap */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        {children}
      </div>
    </div>
  )
}
