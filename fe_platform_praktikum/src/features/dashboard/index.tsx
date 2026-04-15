import { useAuth } from "../../entities/auth/useAuth";
import AdminDashboard from "./admin/AdminDashboardPage";
import LecturerDashboard from "./lecturer/LecturerDashboardPage";
import StudentDashboard from "./student/StudentDashboardPage";

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  switch (user.role) {
    case "MAHASISWA":
      return <StudentDashboard />

    case "DOSEN":
      return <LecturerDashboard />
      
    case "ADMIN":
      return <AdminDashboard />
  }
}