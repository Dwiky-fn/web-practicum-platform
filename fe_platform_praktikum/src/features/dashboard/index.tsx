import { useCurrentUser } from "../../services/user/useCurrentUser"; 
import { Navigate } from "react-router-dom";
import AdminDashboard from "../admin/dashboard/AdminDashboard";
import LecturerDashboard from "../lecturer/pages/LecturerDashboardPage";
import StudentDashboard from "../student/dashboard/StudentDashboardPage";

export default function DashboardPage() {
  const { user, loading } = useCurrentUser();
  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;

  switch (user.role) {
    case "MAHASISWA":
      return <StudentDashboard />;

    case "DOSEN":
      return <LecturerDashboard />;
      
    case "ADMIN":
      return <AdminDashboard />;

    default:
      return <Navigate to="/" replace />;
  }
}
