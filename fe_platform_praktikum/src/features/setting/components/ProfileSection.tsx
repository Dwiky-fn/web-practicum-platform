import type { Role } from "../../../services/user/types";
import { profileFieldByRole } from "../config/fieldConfig";
import Avatar from "../../../components/Avatar";

interface Props {
  role: Role;
  data: Record<string, string | number>;
  avatarUrl?: string;
}

export default function ProfileSection({ role, data, avatarUrl }: Props) {
  const fields = profileFieldByRole[role];
  const fullname = String(data.fullname ?? '');

  return (
    <div className="bg-white rounded-2xl shadow p-8">
      <h2 className="text-xl font-semibold mb-6">
        Profil Pengguna
      </h2>

      {/* Avatar Section */}
      <div className="flex items-center gap-6 mb-4">
        <Avatar avatarUrl={avatarUrl} fullname={fullname} size={112} />
        <div>
          <button
            className="mt-4 px-4 py-2 text-sm bg-blue-600 font-semibold text-blue-100 rounded-lg hover:bg-blue-100 hover:text-blue-600 transition active:bg-blue-100 active:text-blue-600"
          >
            Upload Foto
          </button>
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
              className="w-full border rounded-lg px-4 py-2"
              readOnly
            />
          </div>
        ))}
      </div>
    </div>
  );
}