import { useCallback, useEffect, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { login, loginWithGoogle } from "../../../services/auth/service"
import { useCurrentUser } from "../../../services/user/useCurrentUser"
import type { LoginResponse } from "../../../services/auth/types"
import logoPolnep from "../../../assets/logopolnep.jpg"
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

  useEffect(() => {
    const scriptId = "google-identity-script"

    const initializeGoogleButton = () => {
      const google = window.google

      if (!google || !googleButtonRef.current) {
        return
      }

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

      const containerWidth = googleButtonRef.current.parentElement?.clientWidth || 360
      const buttonWidth = Math.min(Math.max(containerWidth, 200), 400)

      google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        width: buttonWidth,
        logo_alignment: "left",
      })

      // Panggil google.accounts.id.prompt() untuk menampilkan One Tap Overlay (Popup dari atas layar seperti alert browser)
      google.accounts.id.prompt()
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
    <div className="space-y-6">
      {/* Logo & Header */}
      <div className="flex flex-col items-center text-center">
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white p-2 shadow-md ring-1 ring-gray-100">
          <img
            src={logoPolnep}
            alt="Logo POLNEP"
            className="h-12 w-12 object-contain"
          />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Platform Praktikum
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Politeknik Negeri Pontianak
        </p>
      </div>

      {/* Info / Success Message Banner */}
      {infoMessage && !errorMessage && (
        <div className="relative flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/90 p-3.5 text-xs sm:text-sm text-blue-900 shadow-sm backdrop-blur-sm transition-all duration-200">
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
        <div className="relative flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/90 p-3.5 text-xs sm:text-sm text-rose-900 shadow-sm backdrop-blur-sm transition-all duration-200">
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
        {/* Email / NIM */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
            Email / NIM
          </label>
          <div className="relative">
            <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Masukkan email atau NIM"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full rounded-xl bg-gray-50 border border-gray-200 pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              required
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
            Password
          </label>
          <div className="relative">
            <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Masukkan password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl bg-gray-50 border border-gray-200 pl-10 pr-10 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
              title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {/* Lupa Kata Sandi di bawah field password */}
          <div className="flex justify-end mt-1.5">
            <button
              type="button"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline transition cursor-pointer"
              onClick={() => navigate("/forgot-password")}
            >
              Lupa kata sandi?
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 px-4 rounded-xl shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all active:scale-[0.99] disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer mt-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Memproses...</span>
            </>
          ) : (
            <span>Masuk Akun</span>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center my-4">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="px-3 text-xs text-gray-400 uppercase tracking-wider font-medium">atau masuk dengan</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Google Login Wrapper dengan Styling Responsif & Menarik */}
      <div className="flex justify-center w-full">
        <div className="w-full max-w-full overflow-hidden rounded-xl border border-gray-200/80 bg-white p-1 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 flex justify-center">
          <div ref={googleButtonRef} className="w-full flex justify-center [&>iframe]:!w-full [&>iframe]:!max-w-full"></div>
        </div>
      </div>
    </div>
  )
}
