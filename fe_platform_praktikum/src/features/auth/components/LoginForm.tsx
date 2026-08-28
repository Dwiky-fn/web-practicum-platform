import { useCallback, useEffect, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { login, loginWithGoogle } from "../../../services/auth/service"
import { useCurrentUser } from "../../../services/user/useCurrentUser"
import type { LoginResponse } from "../../../services/auth/types"
import { AlertCircle, Eye, EyeOff, Info, Loader2, Lock, User, X } from "lucide-react"

export default function LoginForm() {
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const googleButtonRef = useRef<HTMLDivElement | null>(null)

  const navigate = useNavigate()
  const location = useLocation()
  const { setUser } = useCurrentUser()
  const redirectTo =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ||
    "/dashboard"
  const infoMessage = (location.state as { message?: string } | null)?.message

  const saveLoginSession = useCallback(
    (response: LoginResponse) => {
      localStorage.setItem("authToken", response.token)
      localStorage.setItem("authUser", JSON.stringify(response.user))
      setUser(response.user)
      navigate(redirectTo, { replace: true })
    },
    [navigate, redirectTo, setUser],
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage("")
    setIsSubmitting(true)

    try {
      const response = await login({ identifier, password })
      saveLoginSession(response)
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Login gagal, silakan coba lagi",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleCredential = useCallback(
    async (credential: string) => {
      setErrorMessage("")
      setIsSubmitting(true)

      try {
        const response = await loginWithGoogle({ credential })
        saveLoginSession(response)
      } catch (err) {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Login Google gagal, silakan coba lagi",
        )
      } finally {
        setIsSubmitting(false)
      }
    },
    [saveLoginSession],
  )

  const isInitializedRef = useRef(false)

  useEffect(() => {
    const scriptId = "google-identity-script"

    const initializeGoogleButton = () => {
      const google = window.google

      if (!google || !googleButtonRef.current || isInitializedRef.current) {
        return
      }

      try {
        google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          auto_select: false,
          callback: (response: { credential?: string }) => {
            if (!response.credential) {
              setErrorMessage("Credential Google tidak ditemukan")
              return
            }

            handleGoogleCredential(response.credential)
          },
        })

        const containerWidth = googleButtonRef.current.clientWidth || googleButtonRef.current.parentElement?.clientWidth || 380
        const buttonWidth = Math.min(Math.max(containerWidth, 200), 400)

        google.accounts.id.renderButton(googleButtonRef.current, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          width: buttonWidth,
          logo_alignment: "left",
        })

        isInitializedRef.current = true
      } catch (err) {
        console.warn("Google Identity initialization:", err)
      }
    }

    const existingScript = document.getElementById(scriptId)

    if (existingScript) {
      initializeGoogleButton()
      return
    }

    const script = document.createElement("script")
    script.id = scriptId
    script.src = "https://accounts.google.com/gsi/client"
    script.async = true
    script.defer = true
    script.onload = initializeGoogleButton

    document.body.appendChild(script)
  }, [handleGoogleCredential])

  return (
    <div className="w-full space-y-6">
      {/* Top Header */}
      <div className="text-center">
        {/* Title & Subtitle */}
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Selamat Datang
        </h2>
        <p className="text-sm text-slate-500 font-medium mt-1.5">
          Masuk untuk melanjutkan ke platform
        </p>
      </div>

      {/* Info / Success Message Banner */}
      {infoMessage && !errorMessage && (
        <div className="relative flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/90 p-3.5 text-xs sm:text-sm text-blue-900 shadow-2xs backdrop-blur-sm transition-all duration-200">
          <div className="mt-0.5 shrink-0 rounded-lg bg-blue-100 p-1 text-blue-600">
            <Info size={16} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-blue-950">Informasi</p>
            <p className="mt-0.5 text-blue-700 leading-relaxed">{infoMessage}</p>
          </div>
        </div>
      )}

      {/* Error Message Alert Card */}
      {errorMessage && (
        <div className="relative flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/90 p-3.5 text-xs sm:text-sm text-rose-900 shadow-2xs backdrop-blur-sm transition-all duration-200">
          <div className="mt-0.5 shrink-0 rounded-lg bg-rose-100 p-1 text-rose-600">
            <AlertCircle size={16} />
          </div>
          <div className="flex-1 pr-1">
            <p className="font-semibold text-rose-950">Gagal Masuk</p>
            <p className="mt-0.5 text-rose-700 leading-relaxed">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage("")}
            className="shrink-0 text-rose-400 hover:text-rose-700 transition-colors p-1 rounded-lg hover:bg-rose-100/60"
            title="Tutup pesan"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Field 1: Email / NIM / NIP */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            EMAIL / NIM / NIP
          </label>
          <div className="relative">
            <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Masukkan email, NIM, atau NIP"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full rounded-xl bg-slate-50/50 border border-slate-200 pl-11 pr-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 shadow-2xs"
              required
            />
          </div>
        </div>

        {/* Field 2: Kata Sandi */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            KATA SANDI
          </label>
          <div className="relative">
            <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Masukkan kata sandi"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl bg-slate-50/50 border border-slate-200 pl-11 pr-11 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 shadow-2xs"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
              title={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Lupa Kata Sandi Link */}
          <div className="flex justify-end mt-2">
            <button
              type="button"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline transition cursor-pointer"
              onClick={() => navigate("/forgot-password")}
            >
              Lupa kata sandi?
            </button>
          </div>
        </div>

        {/* Primary Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all active:scale-[0.99] disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer text-sm mt-3"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Memproses...</span>
            </>
          ) : (
            <>
              <span>Masuk Akun</span>
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="relative flex items-center my-6">
        <div className="flex-grow border-t border-slate-200"></div>
        <span className="flex-shrink mx-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
          ATAU MASUK DENGAN
        </span>
        <div className="flex-grow border-t border-slate-200"></div>
      </div>

      {/* Google Login Button Container */}
      <div className="relative w-full group">
        {/* Visual Button with Group Hover Effects */}
        <div className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200/90 group-hover:border-slate-300 group-hover:bg-slate-50 group-hover:shadow-xs group-hover:-translate-y-0.5 group-active:translate-y-0 group-active:scale-[0.99] text-slate-700 font-bold py-3.5 px-4 rounded-xl shadow-2xs transition-all duration-200 cursor-pointer text-sm select-none">
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>Lanjutkan dengan Google</span>
        </div>

        {/* Transparent Google GIS iframe overlay */}
        <div
          ref={googleButtonRef}
          className="absolute inset-0 opacity-[0.001] overflow-hidden cursor-pointer z-10 [&>div]:!w-full [&>div]:!h-full [&_iframe]:!w-full [&_iframe]:!h-full [&_iframe]:!scale-150"
        ></div>
      </div>
    </div>
  )
}
