import { useRef } from "react";
import type { Role } from "../../../services/user/types";
import { profileFieldByRole } from "../config/fieldConfig";
import Avatar from "../../../components/Avatar";

interface Props {
  role: Role;
  data: Record<string, string | number>;
  avatarUrl?: string;
  saving?: boolean;
  message?: string;
  onUploadAvatar: (file: File) => Promise<void>;
}

export default function ProfileSection({
  role,
  data,
  avatarUrl,
  saving = false,
  message,
  onUploadAvatar,
}: Props) {
  const fields = profileFieldByRole[role];
  const fullname = String(data.fullname ?? '');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (file?: File) => {
    if (!file) return;
    await onUploadAvatar(file);
  };

  return (
    <div className="bg-white rounded-2xl shadow p-8">
      <h2 className="text-xl font-semibold mb-6">
        Profil Pengguna
      </h2>

      {/* Avatar Section */}
      <div className="flex items-center gap-6 mb-4">
        <Avatar avatarUrl={avatarUrl} fullname={fullname} size={112} />
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => handleFileChange(event.target.files?.[0])}
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 text-sm bg-blue-600 font-semibold text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-300"
          >
            {saving ? "Mengupload..." : "Upload Foto"}
          </button>
          <p className="mt-2 text-sm text-gray-500">
            Foto profil akan disimpan ke Cloudinary.
          </p>
          {message && (
            <p className="mt-2 text-sm text-gray-500">
              {message}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {fields.map((field) => (
          <div key={field.name}>
            <label className="block text-sm font-medium mb-1">
              {field.label}
            </label>
            <input
              type={field.type || 'text'}
              value={data[field.name] ?? ''}
              className="w-full border rounded-lg px-4 py-2 bg-gray-50 text-gray-600"
              readOnly
            />
          </div>
        ))}
      </div>
    </div>
  );
}
