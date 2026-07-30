import { useRef } from "react";
import type { Role } from "../../../services/user/types";
import { profileFieldByRole } from "../config/fieldConfig";
import Avatar from "../../../components/Avatar";
import { toast } from "../../../components/toast/toastStore";
import { Camera, User } from "lucide-react";

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
    <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm">
      <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3 mb-6 flex items-center gap-2">
        <User size={18} className="text-blue-700" /> Profil Pengguna
      </h2>

      {/* Avatar Section */}
      <div className="flex flex-col sm:flex-row items-center gap-6 mb-8 rounded-xl bg-blue-50/50 p-5 border border-blue-100">
        <div className="relative group">
          <Avatar avatarUrl={avatarUrl} fullname={fullname} size={96} />
        </div>

        <div className="text-center sm:text-left">
          <p className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-1">
            Foto Profil
          </p>
          <p className="text-xs text-gray-500 mb-3">
            Format JPG, PNG, atau WebP. Maksimal {MAX_AVATAR_SIZE_MB} MB.
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
            className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-blue-800 disabled:opacity-50"
          >
            <Camera size={14} />
            <span>{saving ? "Mengupload..." : "Upload Foto Baru"}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map((field) => (
          <div key={field.name}>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
              {field.label}
            </label>
            <input
              type={field.type || 'text'}
              value={data[field.name] ?? ''}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs font-medium text-gray-700 cursor-not-allowed focus:outline-none"
              readOnly
            />
          </div>
        ))}
      </div>
    </div>
  );
}
