import { useEffect, useState, type FormEvent } from "react";

interface Props {
  email: string;
  saving?: boolean;
  message?: string;
  onSave: (payload: { email?: string; password?: string }) => Promise<void>;
}

export default function AccountSection({
  email,
  saving = false,
  message,
  onSave,
}: Props) {
  const [emailInput, setEmailInput] = useState(email);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    setEmailInput(email);
  }, [email]);

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSave({ email: emailInput });
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      return;
    }

    await onSave({ password });
    setPassword("");
    setConfirmPassword("");
  };

  const canSavePassword = password.length >= 6 && password === confirmPassword;

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
        <button
          type="submit"
          disabled={saving}
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
