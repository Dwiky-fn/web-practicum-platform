import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { login } from "../../../services/auth/service"
import { useCurrentUser } from "../../../services/user/useCurrentUser"

export default function LoginForm() {
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const { setUser } = useCurrentUser()
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage("")
    setIsSubmitting(true)

    try {
      const response = await login({ identifier, password })
      localStorage.setItem("authToken", response.token)
      localStorage.setItem("authUser", JSON.stringify(response.user))
      setUser(response.user)
      console.log("Login SUCCESS,", response)
      navigate(response.user.role === "ADMIN" ? "/admin" : "/dashboard")
    } catch (err) {
      console.error(err);
      setErrorMessage(
        err instanceof Error ? err.message : "Login gagal, silakan coba lagi",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      console.log("Login dengan Google Berhasil");
      navigate('/dashboard')
    } catch (err) {
      console.error(err);
    }
  }

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
        
        {/* Email / NIM / NIP */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Email/NIM/NIP
          </label>
          <input
            type="text"
            placeholder="Masukkan email, NIM, atau NIP yang terdaftar"
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
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg py-3 mb-6 hover:bg-gray-100 transition cursor-pointer"
        >
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt=""
            className="h-5 w-5"
          />
          <span className="font-medium text-gray-700">
            Google
          </span>
        </button>
    </div>
  )
}
