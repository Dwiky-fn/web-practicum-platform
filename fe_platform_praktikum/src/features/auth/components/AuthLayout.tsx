import type { ReactNode } from "react"
import illustration from '../../../assets/polnep.webp'
import pattern from '../../../assets/circuit-board.svg'
import logo from '../../../assets/logopolnep.jpg'

interface AuthLayoutProps {
  children: ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 bg-white overflow-hidden">

      {/* Pattern Layer */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `url(${pattern})`,
          backgroundRepeat: "repeat",
          backgroundSize: "300px",
        }}
      />

      {/* Content */}
      <div className="relative w-full max-w-5xl h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        
        {/* Left Side */}
        <div className="hidden md:block relative">
          <img 
            src={illustration}
            alt="Gedung Kampus Utama Politeknik Negeri Pontianak"
            className="absolute inset-0 w-full h-full object-cover"
          />

          <div className="absolute inset-0 bg-black/50" />
          
          <div className="relative z-10 flex flex-col justify-end h-full px-16 pb-16 text-white">
            <h1 className="text-3xl font-extrabold text-cyan-300 tracking-tight">
              Selamat Datang
            </h1>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Platform Praktikum Digital
            </h2>
            <p className="mt-2 text-1xl font-bold text-white/90">
              Program Studi Teknik Informatika<br />
              Politeknik Negeri Pontianak
            </p>
          </div>
        </div>

        {/* Right Side */}
        <div className="p-10 flex flex-col justify-center">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img
              src={logo}
              alt="Logo Politeknik Negeri Pontianak"
              className="h-25 w-auto"
            />
          </div>
          {children}
        </div>

      </div>
    </div>
  )
}
