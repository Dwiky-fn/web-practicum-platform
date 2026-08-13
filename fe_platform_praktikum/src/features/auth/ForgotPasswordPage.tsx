import { useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import AuthLayout from "./components/AuthLayout"
import {
  requestPasswordResetOtp,
  resetPasswordWithOtp,
} from "../../services/auth/service"
import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound, Loader2, Lock, Mail, X } from "lucide-react"

type Step = "email" | "otp" | "done"

const inputClass =
  "w-full rounded-xl bg-gray-50 border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"

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
    setMessage("Jika email terdaftar, kode OTP 6-digit telah dikirimkan ke email Anda.")
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
      setMessage("Kata sandi berhasil diperbarui! Silakan masuk kembali dengan kata sandi baru Anda.")
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal memperbarui kata sandi",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-semibold text-xs uppercase tracking-wider mb-1">
            <KeyRound size={16} />
            <span>Pemulihan Akun</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Lupa Kata Sandi</h1>
          <p className="mt-1 text-xs text-gray-500">
            {step === "email" && "Masukkan email akun Anda untuk menerima kode verifikasi OTP."}
            {step === "otp" && "Masukkan kode OTP yang telah dikirim ke email Anda dan buat kata sandi baru."}
            {step === "done" && "Proses pemulihan kata sandi akun Anda telah berhasil diselesaikan."}
          </p>
        </div>

        {/* Success Message Banner */}
        {message && (
          <div className="relative flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/90 p-3.5 text-xs sm:text-sm text-emerald-900 shadow-sm backdrop-blur-sm transition-all duration-200">
            <div className="mt-0.5 shrink-0 rounded-lg bg-emerald-100 p-1 text-emerald-600">
              <CheckCircle2 size={16} />
            </div>
            <div className="flex-1 pr-1">
              <p className="font-semibold text-emerald-950">Berhasil</p>
              <p className="mt-0.5 text-emerald-700 leading-relaxed">{message}</p>
            </div>
            <button
              type="button"
              onClick={() => setMessage("")}
              className="shrink-0 text-emerald-400 hover:text-emerald-700 transition-colors p-1 rounded-lg hover:bg-emerald-100/60"
              title="Tutup pesan"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Error Message Alert Card */}
        {errorMessage && (
          <div className="relative flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/90 p-3.5 text-xs sm:text-sm text-rose-900 shadow-sm backdrop-blur-sm transition-all duration-200">
            <div className="mt-0.5 shrink-0 rounded-lg bg-rose-100 p-1 text-rose-600">
              <AlertCircle size={16} />
            </div>
            <div className="flex-1 pr-1">
              <p className="font-semibold text-rose-950">Terjadi Kesalahan</p>
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

        {step === "email" && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-600">
                Email Akun
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={`${inputClass} pl-10`}
                  placeholder="Masukkan email terdaftar"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 font-medium text-white shadow-md shadow-blue-500/20 transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:shadow-blue-500/30 disabled:cursor-not-allowed disabled:opacity-75 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Mengirim...</span>
                </>
              ) : (
                <span>Kirim Kode OTP</span>
              )}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-600">
                Kode OTP
              </label>
              <input
                type="text"
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
                className={`${inputClass} text-center text-lg font-bold tracking-[0.5em] text-blue-600`}
                placeholder="000000"
                inputMode="numeric"
                maxLength={6}
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-600">
                Kata Sandi Baru
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className={`${inputClass} pl-10`}
                  placeholder="Minimal 8 karakter"
                  minLength={8}
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-600">
                Konfirmasi Kata Sandi Baru
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className={`${inputClass} pl-10`}
                  placeholder="Ulangi kata sandi baru"
                  minLength={8}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 font-medium text-white shadow-md shadow-blue-500/20 transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:shadow-blue-500/30 disabled:cursor-not-allowed disabled:opacity-75 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <span>Reset Kata Sandi</span>
              )}
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleResendOtp}
              className="w-full text-center text-xs font-medium text-blue-600 hover:text-blue-800 disabled:text-gray-400 transition cursor-pointer py-1"
            >
              Kirim ulang kode OTP
            </button>
          </form>
        )}

        {step === "done" && (
          <Link
            to="/"
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-center font-medium text-white shadow-md shadow-blue-500/20 transition-all hover:from-blue-700 hover:to-indigo-700"
          >
            <span>Kembali ke Halaman Masuk</span>
          </Link>
        )}

        {step !== "done" && (
          <div className="pt-2 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-blue-600 transition"
            >
              <ArrowLeft size={14} />
              <span>Kembali ke Halaman Masuk</span>
            </Link>
          </div>
        )}
      </div>
    </AuthLayout>
  )
}
