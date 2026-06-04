import { useEffect, useState, type FormEvent } from "react";

interface Props {
  email: string;
  saving?: boolean;
  message?: string;
  onChangeEmail: (payload: {
    email: string;
    currentPassword: string;
  }) => Promise<void>;
  onChangePassword: (payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => Promise<void>;
}

export default function AccountSection({
  email,
  saving = false,
  message,
  onChangeEmail,
  onChangePassword,
}: Props) {
  const [emailInput, setEmailInput] = useState(email);
  const [emailPassword, setEmailPassword] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    setEmailInput(email);
  }, [email]);

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onChangeEmail({
      email: emailInput,
      currentPassword: emailPassword,
    });
    setEmailPassword("");
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      return;
    }

    await onChangePassword({
      currentPassword: oldPassword,
      newPassword: password,
      confirmPassword,
    });
    setOldPassword("");
    setPassword("");
    setConfirmPassword("");
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

  return (
    <div className="bg-white rounded-2xl shadow p-8 space-y-8">
      
      {/* Ubah Email */}
      <form onSubmit={handleEmailSubmit}>
        <h3 className="font-semibold mb-4">Ubah Email</h3>
        <input
          type="email"
          placeholder="Email baru"
          value={emailInput}
          onChange={(event) => setEmailInput(event.target.value)}
          className="w-full border rounded-lg px-4 py-2 mb-3"
        />
        <input
          type="password"
          placeholder="Password saat ini"
          value={emailPassword}
          onChange={(event) => setEmailPassword(event.target.value)}
          className="w-full border rounded-lg px-4 py-2 mb-3"
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
          disabled={saving || !canSaveEmail}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition"
        >
          {saving ? "Menyimpan..." : "Simpan Email"}
        </button>
      </form>

      {/* Ubah Password */}
      <form onSubmit={handlePasswordSubmit}>
        <h3 className="font-semibold mb-4">Ubah Password</h3>
        <input
          type="password"
          placeholder="Password lama"
          value={oldPassword}
          onChange={(event) => setOldPassword(event.target.value)}
          className="w-full border rounded-lg px-4 py-2 mb-3"
        />
        <input
          type="password"
          placeholder="Password baru"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full border rounded-lg px-4 py-2 mb-3"
        />
        <input
          type="password"
          placeholder="Konfirmasi password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className="w-full border rounded-lg px-4 py-2 mb-3"
        />
        {password && password !== confirmPassword && (
          <p className="mb-3 text-sm text-red-600">
            Konfirmasi password belum sama.
          </p>
        )}
        {password && password.length < 8 && (
          <p className="mb-3 text-sm text-red-600">
            Password baru minimal 8 karakter.
          </p>
        )}
        <button
          type="submit"
          disabled={saving || !canSavePassword}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition"
        >
          {saving ? "Menyimpan..." : "Simpan Password"}
        </button>
      </form>

      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}
