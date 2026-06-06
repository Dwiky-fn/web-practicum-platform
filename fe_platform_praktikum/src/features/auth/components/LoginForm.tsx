import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { login, loginWithGoogle } from "../../../services/auth/service"
import { useCurrentUser } from "../../../services/user/useCurrentUser"
import type { LoginResponse } from "../../../services/auth/types"

export default function LoginForm() {
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const googleButtonRef = useRef<HTMLDivElement | null>(null)

  const navigate = useNavigate()
  const { setUser } = useCurrentUser()

  const saveLoginSession = useCallback(
    (response: LoginResponse) => {
      localStorage.setItem("authToken", response.token)
      localStorage.setItem("authUser", JSON.stringify(response.user))
      setUser(response.user)
      console.log("Login SUCCESS,", response)
      navigate("/dashboard")
    },
    [navigate, setUser],
  )
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage("")
    setIsSubmitting(true)

    try {
      const response = await login({ identifier, password })
      saveLoginSession(response)
    } catch (err) {
      console.error(err);
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
        console.error(err)
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
        callback: (response: { credential?: string }) => {
          if (!response.credential) {
            setErrorMessage("Credential Google tidak ditemukan")
            return
          }

          handleGoogleCredential(response.credential)
        },
      })

      google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        text: "signin_with",
        shape: "rectangular",
        width: 360,
      })
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
    <div>
      <div className="flex justify-center mb-4">
        <img
          src="src/assets/logopolnep.jpg"
          alt="Logo"
          className="h-12"
        />
      </div>

      <h1 className="text-3xl font-bold">Masuk</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Email / NIM */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Email/NIM
          </label>
          <input
            type="text"
            placeholder="Masukkan email atau NIM yang terdaftar"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full bg-gray-100 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Password
          </label>
          <input
            type="password"
            placeholder="Masukkan password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-gray-100 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            required
          />

          <div className="text-right mt-2">
            <button
              type="button"
              className="text-gray-500 hover:text-blue-600 transition cursor-pointer"
              onClick={() => console.log("Redirect ke reset password")
              }
            >
              Lupa kata sandi?
            </button>
          </div>
        </div>

        {/* Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-800 transition cursor-pointer"
        >
          {isSubmitting ? "Memproses..." : "Masuk"}
        </button>

        {errorMessage && (
          <p className="text-sm text-red-600">
            {errorMessage}
          </p>
        )}
      </form>

        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-1 h-px bg-gray-200" />
            <span className="px-4 text-sm text-gray-400">atau masuk dengan</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Google Login */}
        <div className="flex justify-center mb-6">
          <div ref={googleButtonRef}></div>
        </div>
    </div>
  )
}
