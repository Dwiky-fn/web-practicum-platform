import { useEffect, useState, type FormEvent } from "react";
import {
  AdminButton,
  AdminModal,
} from "../../admin/components/AdminUI";
import { toast } from "../../../components/toast/toastStore";

interface Props {
  email: string;
  emailSaving?: boolean;
  passwordSaving?: boolean;
  onRequestEmailChange?: (payload: {
    email: string;
    currentPassword: string;
  }) => Promise<void>;
  onSendEmailOtp?: () => Promise<void>;
  onVerifyEmailChange: (payload: {
    email: string;
    currentPassword: string;
    otp: string;
  }) => Promise<void>;
  onChangePassword: (payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => Promise<void>;
}

export default function AccountSection({
  email,
  emailSaving = false,
  passwordSaving = false,
  onRequestEmailChange,
  onSendEmailOtp,
  onVerifyEmailChange,
  onChangePassword,
}: Props) {
  const OTP_RESEND_INTERVAL = 60;
  const [emailInput, setEmailInput] = useState(email);
  const [emailPassword, setEmailPassword] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingOldEmail, setPendingOldEmail] = useState("");
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpSent, setOtpSent] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    setEmailInput(email);
  }, [email]);

  useEffect(() => {
    if (!otpModalOpen || otpCountdown <= 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setOtpCountdown((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [otpModalOpen, otpCountdown]);

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextEmail = emailInput.trim().toLowerCase();
    try {
      await onRequestEmailChange?.({
        email: nextEmail,
        currentPassword: emailPassword,
      });
      setPendingOldEmail(email);
      setPendingEmail(nextEmail);
      setOtpInput("");
      setOtpCountdown(0);
      setOtpSent(false);
      setOtpModalOpen(true);
    } catch {
      return;
    }
  };

  const handleSendOtp = async () => {
    if (otpCountdown > 0 || !pendingEmail) {
      return;
    }

    try {
      await onSendEmailOtp?.();

      setOtpSent(true);
      setOtpCountdown(OTP_RESEND_INTERVAL);
    } catch {
      return;
    }
  };

  const handleVerifyOtp = async () => {
    try {
      await onVerifyEmailChange({
        email: pendingEmail,
        currentPassword: emailPassword,
        otp: otpInput.trim(),
      });

      setOtpModalOpen(false);
      setEmailPassword("");
      setOtpInput("");
      setOtpSent(false);
      setOtpCountdown(0);
    } catch {
      return;
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      toast.warning("Password baru dan konfirmasi password tidak sama.");
      return;
    }

    try {
      await onChangePassword({
        currentPassword: oldPassword,
        newPassword: password,
        confirmPassword,
      });
      setOldPassword("");
      setPassword("");
      setConfirmPassword("");
    } catch {
      return;
    }
  };

  const emailChanged = emailInput.trim().toLowerCase() !== email.toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const canSaveEmail =
    emailInput.trim().length > 0 &&
    emailPattern.test(emailInput.trim()) &&
    emailChanged &&
    emailPassword.length > 0;
  const canSavePassword =
    oldPassword.length > 0 &&
    password.length >= 8 &&
    password === confirmPassword;
  const canVerifyOtp = otpSent && otpInput.trim().length === 6;
  const otpCountdownLabel =
    otpCountdown > 0
      ? `Kirim ulang dalam ${otpCountdown} detik`
      : otpSent
      ? "Bisa kirim ulang OTP sekarang."
      : "Klik Kirim OTP untuk menerima kode verifikasi.";

  return (
    <>
      <div className="space-y-6">
        <section className="rounded-2xl bg-white p-8 shadow">
          <form id="change-email-form" onSubmit={handleEmailSubmit}>
            <h3 className="mb-4 font-semibold">Ubah Email</h3>
            <p className="mb-4 text-sm text-gray-500">
              Setelah email baru diajukan, sistem akan mengirim OTP ke email
              baru untuk verifikasi. Email lama juga akan menerima notifikasi
              perubahan email.
            </p>
            <input
              type="email"
              placeholder="Email baru"
              value={emailInput}
              onChange={(event) => setEmailInput(event.target.value)}
              className="mb-3 w-full rounded-lg border px-4 py-2"
            />
            <input
              type="password"
              placeholder="Kata Sandi saat ini"
              value={emailPassword}
              onChange={(event) => setEmailPassword(event.target.value)}
              className="mb-3 w-full rounded-lg border px-4 py-2"
            />
            {emailInput && !emailPattern.test(emailInput.trim()) && (
              <p className="mb-3 text-sm text-red-600">
                Format email tidak valid.
              </p>
            )}
            {emailInput.trim().length > 0 && !emailChanged && (
              <p className="mb-3 text-sm text-gray-500">
                Email baru harus berbeda dari email saat ini.
              </p>
            )}
            <button
              type="submit"
              form="change-email-form"
              disabled={emailSaving || !canSaveEmail}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700 disabled:bg-gray-300"
            >
              {emailSaving ? "Memproses..." : "Lanjut Verifikasi"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl bg-white p-8 shadow">
          <form id="change-password-form" onSubmit={handlePasswordSubmit}>
            <h3 className="mb-4 font-semibold">Ubah Kata Sandi</h3>
            <input
              type="password"
              placeholder="Kata Sandi saat ini"
              value={oldPassword}
              onChange={(event) => setOldPassword(event.target.value)}
              className="mb-3 w-full rounded-lg border px-4 py-2"
            />
            <input
              type="password"
              placeholder="Kata Sandi baru"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mb-3 w-full rounded-lg border px-4 py-2"
            />
            <input
              type="password"
              placeholder="Konfirmasi Kata Sandi"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="mb-3 w-full rounded-lg border px-4 py-2"
            />
            {password && password !== confirmPassword && (
              <p className="mb-3 text-sm text-red-600">
                Konfirmasi kata sandi belum sama.
              </p>
            )}
            {password && password.length < 8 && (
              <p className="mb-3 text-sm text-red-600">
                Kata sandi baru minimal 8 karakter.
              </p>
            )}
            <button
              type="submit"
              form="change-password-form"
              disabled={passwordSaving || !canSavePassword}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700 disabled:bg-gray-300"
            >
              {passwordSaving ? "Menyimpan..." : "Simpan Kata Sandi"}
            </button>
          </form>
        </section>
      </div>
    {otpModalOpen && (
      <AdminModal
        title="Verifikasi OTP Ubah Email"
        onClose={() => {
          if (emailSaving) {
            return;
          }
          setOtpModalOpen(false);
        }}
        footer={
          <>
            <AdminButton
              variant="secondary"
              onClick={() => setOtpModalOpen(false)}
              disabled={emailSaving}
            >
              Batal
            </AdminButton>
            <AdminButton
              onClick={handleVerifyOtp}
              disabled={emailSaving || !canVerifyOtp}
            >
              {emailSaving ? "Memverifikasi..." : "Verifikasi OTP"}
            </AdminButton>
          </>
        }
      >
        <div className="space-y-4 text-sm text-gray-700">
          <p>
            Kode OTP akan dikirim ke email baru{" "}
            <span className="font-semibold text-gray-900">{pendingEmail}</span>.
          </p>
          <p>
            Email lama{" "}
            <span className="font-semibold text-gray-900">
              {pendingOldEmail}
            </span>{" "}
            akan menerima notifikasi bahwa email telah diganti ke{" "}
            <span className="font-semibold text-gray-900">{pendingEmail}</span>.
          </p>
          <div className="space-y-2 text-left">
            <label
              htmlFor="otp-email-change"
              className="block text-sm font-medium text-gray-700"
            >
              Masukkan OTP
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <input
                id="otp-email-change"
                type="text"
                inputMode="numeric"
                placeholder="Contoh: 123456"
                value={otpInput}
                onChange={(event) =>
                  setOtpInput(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <AdminButton
                variant="secondary"
                onClick={handleSendOtp}
                disabled={emailSaving || otpCountdown > 0}
                className="w-full sm:w-auto sm:min-w-30"
              >
                {otpSent ? "Kirim Ulang OTP" : "Kirim OTP"}
              </AdminButton>
            </div>
            <p className="text-xs text-gray-500">{otpCountdownLabel}</p>
          </div>
        </div>
      </AdminModal>
    )}
    </>
  );
}
