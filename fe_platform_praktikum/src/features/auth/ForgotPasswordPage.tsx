import { useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import AuthLayout from "./components/AuthLayout"
import {
  requestPasswordResetOtp,
  resetPasswordWithOtp,
} from "../../services/auth/service"

type Step = "email" | "otp" | "done"

const inputClass =
  "w-full rounded-lg bg-gray-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [message, setMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const sendOtp = async () => {
    await requestPasswordResetOtp({ email })
    setMessage("Jika email terdaftar, kode OTP telah dikirim.")
    setStep("otp")
  }

  const handleRequestOtp = async (event: FormEvent) => {
    event.preventDefault()
    setErrorMessage("")
    setMessage("")
    setIsSubmitting(true)

    try {
      await sendOtp()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal mengirim kode OTP",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResendOtp = async () => {
    setErrorMessage("")
    setMessage("")
    setIsSubmitting(true)

    try {
      await sendOtp()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal mengirim ulang kode OTP",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetPassword = async (event: FormEvent) => {
    event.preventDefault()
    setErrorMessage("")
    setMessage("")
    setIsSubmitting(true)

    try {
      await resetPasswordWithOtp({
        email,
        otp,
        newPassword,
        confirmPassword,
      })
      setStep("done")
      setMessage("Password berhasil diperbarui. Silakan masuk kembali.")
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal memperbarui password",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lupa Password</h1>
          <p className="mt-2 text-sm text-gray-500">
            Verifikasi email dengan OTP untuk membuat password baru.
          </p>
        </div>

        {step === "email" && (
          <form onSubmit={handleRequestOtp} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Email akun
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClass}
                placeholder="Masukkan email terdaftar"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {isSubmitting ? "Mengirim..." : "Kirim OTP"}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Kode OTP
              </label>
              <input
                type="text"
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
                className={`${inputClass} text-center text-lg font-semibold tracking-[0.4em]`}
                placeholder="000000"
                inputMode="numeric"
                maxLength={6}
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Password baru
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className={inputClass}
                placeholder="Minimal 8 karakter"
                minLength={8}
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Konfirmasi password baru
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className={inputClass}
                placeholder="Ulangi password baru"
                minLength={8}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {isSubmitting ? "Memverifikasi..." : "Reset Password"}
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleResendOtp}
              className="w-full text-sm font-medium text-blue-600 hover:text-blue-800 disabled:text-gray-400"
            >
              Kirim ulang OTP
            </button>
          </form>
        )}

        {step === "done" && (
          <Link
            to="/"
            className="block w-full rounded-lg bg-blue-600 py-3 text-center font-medium text-white transition hover:bg-blue-800"
          >
            Kembali ke Login
          </Link>
        )}

        {message && (
          <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
            {message}
          </p>
        )}

        {errorMessage && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        {step !== "done" && (
          <Link
            to="/"
            className="block text-center text-sm font-medium text-gray-500 hover:text-blue-600"
          >
            Kembali ke login
          </Link>
        )}
      </div>
    </AuthLayout>
  )
}
