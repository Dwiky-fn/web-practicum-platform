import type { User } from "../../../../services/user/types";

interface WelcomeSectionProps {
  user: User | null;
}

function getSubtitle(user: User | null): string {
  if (!user) return "";

  switch (user.role) {
    case "MAHASISWA":
      return `Semester ${user.studentProfile?.semester} - ${user.studentProfile?.programStudi}`;

    case "DOSEN":
      return "Dosen Pengampu";

    case "ADMIN":
      return "Administrator Sistem";

    default:
      return "";
  }
}

export default function WelcomeSection({ user }: WelcomeSectionProps) {
  return (
    <section className="mb-8">
      <h1 className="text-2xl font-semibold text-gray-800">
        Halo, {user?.fullname}
      </h1>

      <p className="text-gray-500">
        {getSubtitle(user)}
      </p>
    </section>
  );
}
