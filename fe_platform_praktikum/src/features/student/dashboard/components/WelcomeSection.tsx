import { Sparkles, GraduationCap, BookOpen, Layers } from "lucide-react";
import type { User } from "../../../../services/user/types";

interface WelcomeSectionProps {
  user: User | null;
}

function getSubtitle(user: User | null): string {
  if (!user) return "";

  switch (user.role) {
    case "MAHASISWA":
      return "";

    case "DOSEN":
      return "Dosen Praktikum";

    case "ADMIN":
      return "Administrator Platform Praktikum Pemrograman";

    default:
      return "";
  }
}

export default function WelcomeSection({ user }: WelcomeSectionProps) {
  const isStudent = user?.role === "MAHASISWA";

  return (
    <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 p-6 text-white shadow-lg">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-200">
            <Sparkles size={16} className="text-yellow-400" />
            Selamat Datang di Platform Praktikum Pemrograman
          </div>
          <h1 className="mt-1 text-2xl font-bold text-white">
            Halo, {user?.fullname ?? "Mahasiswa"}
          </h1>
          <p className="mt-1 text-xs text-blue-200">
            {getSubtitle(user)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-bold text-white backdrop-blur-md border border-white/10">
            <GraduationCap size={16} className="text-blue-300" />
            <span>NIM: {user?.studentProfile?.nim ?? user?.email ?? "Belum ada NIM"}</span>
          </div>
          {isStudent && (
            <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-bold text-white backdrop-blur-md border border-white/10">
              <Layers size={16} className="text-blue-300" />
              <span>Semester: {user?.studentProfile?.semester ?? "Belum diatur"}</span>
            </div>
          )}
          {isStudent && (
            <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-bold text-white backdrop-blur-md border border-white/10">
              <BookOpen size={16} className="text-blue-300" />
              <span>Kelas: {user?.studentProfile?.kelas ?? "Belum ada kelas"}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
