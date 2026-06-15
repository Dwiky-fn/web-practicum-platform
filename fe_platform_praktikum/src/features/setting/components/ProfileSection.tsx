import { useRef } from "react";
import type { Role } from "../../../services/user/types";
import { profileFieldByRole } from "../config/fieldConfig";
import Avatar from "../../../components/Avatar";
import { toast } from "../../../components/toast/toastStore";

const MAX_AVATAR_SIZE_MB = 2;
const MAX_AVATAR_SIZE_BYTES = MAX_AVATAR_SIZE_MB * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface Props {
  role: Role;
  data: Record<string, string | number>;
  avatarUrl?: string;
  saving?: boolean;
  onUploadAvatar: (file: File) => Promise<void>;
}

export default function ProfileSection({
  role,
  data,
  avatarUrl,
  saving = false,
  onUploadAvatar,
}: Props) {
  const fields = profileFieldByRole[role];
  const fullname = String(data.fullname ?? '');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (file?: File) => {
    if (!file) return;

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      toast.warning("Format gambar tidak didukung. Gunakan JPG, PNG, atau WebP.");
      return;
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      toast.warning(`Ukuran foto maksimal ${MAX_AVATAR_SIZE_MB} MB.`);
      return;
    }

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
          <p className="mb-2 text-sm font-medium text-gray-700">
            Foto Profil
          </p>
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
          <p className="mt-2 text-xs text-gray-500">
            Format JPG, PNG, atau WebP. Maksimal {MAX_AVATAR_SIZE_MB} MB.
          </p>
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
