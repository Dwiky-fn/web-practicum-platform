import type { ReactNode } from "react"
import illustration from '../../../assets/polnep.webp'
import logoPolnep from '../../../assets/logopolnep.jpg'

interface AuthLayoutProps {
  children: ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white font-sans antialiased selection:bg-blue-500 selection:text-white">
      {/* LEFT SECTION - Branding & Hero (Visible on Desktop / Large screens) */}
      <div className="relative hidden lg:flex lg:w-1/2 xl:w-7/12 bg-slate-900 overflow-hidden flex-col justify-between p-10 xl:p-16 text-white">
        {/* Background Campus Image (Gedung POLNEP) */}
        <img
          src={illustration}
          alt="Gedung POLNEP"
          className="absolute inset-0 w-full h-full object-cover object-center scale-105 transition-transform duration-1000"
        />

        {/* Curved Blue Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#002255]/95 via-[#003882]/90 to-[#0F52BA]/75 backdrop-blur-[1px]" />
        
        {/* Soft Radial Highlight */}
        <div className="absolute top-0 right-0 bottom-0 w-1/2 pointer-events-none opacity-20 bg-gradient-to-l from-blue-400 to-transparent" />

        {/* Decorative Dot Matrix Pattern (Top Right) */}
        <div className="absolute top-12 right-14 grid grid-cols-6 gap-2.5 opacity-25 pointer-events-none">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-white" />
          ))}
        </div>

        {/* Decorative Polygon Circles (Bottom Left) */}
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full border border-white/10 pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-72 h-72 rounded-full border border-white/15 pointer-events-none" />

        {/* Top Header: Logo + POLNEP Text */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white p-1.5 shadow-md shadow-black/10 ring-1 ring-white/20">
            <img
              src={logoPolnep}
              alt="Logo POLNEP"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white tracking-wide">
              Politeknik Negeri
            </span>
            <span className="text-sm font-bold text-white/90 tracking-wide">
              Pontianak
            </span>
          </div>
        </div>

        {/* Middle Section: Main Hero Title & Description */}
        <div className="relative z-10 max-w-lg my-auto py-12">
          <h1 className="text-4xl xl:text-5xl font-extrabold text-white tracking-tight leading-[1.18]">
            Platform <br />
            Praktikum <br />
            <span className="text-blue-400 drop-shadow-sm">Pemrograman</span>
          </h1>

          {/* Blue Horizontal Accent Bar */}
          <div className="w-12 h-1 bg-blue-500 rounded-full my-6 shadow-sm" />

          {/* Subtitle / Description */}
          <p className="text-sm xl:text-base text-blue-50/90 leading-relaxed font-normal max-w-md">
            Platform terintegrasi untuk dosen dan mahasiswa dalam pelaksanaan praktikum pemrograman.
          </p>
        </div>

        {/* Bottom Spacer */}
        <div className="relative z-10"></div>
      </div>

      {/* RIGHT SECTION - Form Container */}
      <div className="w-full lg:w-1/2 xl:w-5/12 min-h-screen flex flex-col justify-between p-6 sm:p-10 xl:p-14 bg-white">
        {/* Mobile Header Branding (Visible on mobile/tablet) */}
        <div className="lg:hidden flex items-center gap-3 mb-6 pt-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white p-1 shadow-sm border border-slate-200">
            <img
              src={logoPolnep}
              alt="Logo POLNEP"
              className="h-full w-full object-contain"
            />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Politeknik Negeri Pontianak</h2>
            <p className="text-xs text-blue-600 font-medium">Platform Praktikum Pemrograman</p>
          </div>
        </div>

        {/* Main Content (LoginForm) */}
        <div className="my-auto w-full max-w-md mx-auto">
          {children}
        </div>

        {/* Footer Credit */}
        <div className="pt-8 pb-2 text-center">
          <p className="text-xs font-medium text-slate-400">
            © 2026 Politeknik Negeri Pontianak · Developed by Dwiky Juniardi
          </p>
        </div>
      </div>
    </div>
  )
}
