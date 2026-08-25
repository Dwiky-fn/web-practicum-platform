import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom"
import LecturerLayout from "./features/lecturer/components/LecturerLayout"
import LoginPage from "./features/auth/LoginPage"
import ForgotPasswordPage from "./features/auth/ForgotPasswordPage"
import DashboardPage from "./features/dashboard"
import SettingsPage from "./features/setting/SettingsPage"
import StudentCoursePage from "./features/student/courses/StudentCoursePage"
import CourseDetailPage from "./features/student/courses/CourseDetailPage"
import JobsheetOverviewPage from "./features/student/jobsheets/JobsheetOverviewPage"
import WorkPage from "./features/student/jobsheets/work/WorkPage"
import NotFoundPage from "./features/not-found/NotFoundPage"
import TheoryPage from "./features/student/jobsheets/work/content/theory/TheoryPage"
import ExperimentPage from "./features/student/jobsheets/work/content/practice/ExperimentPage"
import ExercisePage from "./features/student/jobsheets/work/content/practice/ExercisePage"
import TaskPage from "./features/student/jobsheets/work/content/task/TaskPage"
import ReviewPage from "./features/student/jobsheets/work/content/report/review/ReviewPage"
import AdminUsersPage from "./features/admin/users/AdminUsersPage"
import AdminAcademicNativePage from "./features/admin/academic/AdminAcademicNativePage"
import AdminUserProfilePage from "./features/admin/users/AdminUserProfilePage"
import AdminClassDetailPage from "./features/admin/academic/AdminClassDetailPage"
import AdminJobsheetPreviewPage from "./features/admin/academic/AdminJobsheetPreviewPage"
import LecturerCoursesPage from "./features/lecturer/pages/LecturerCoursesPage"
import LecturerClassDetailPage from "./features/lecturer/pages/LecturerClassDetailPage"
import LecturerJobsheetManagePage from "./features/lecturer/pages/LecturerJobsheetManagePage"
import LecturerJobsheetEditorPage from "./features/lecturer/pages/LecturerJobsheetEditorPage"
import LecturerJobsheetDetailPage from "./features/lecturer/pages/LecturerJobsheetDetailPage"
import LecturerStudentWorkpagePage from "./features/lecturer/pages/LecturerStudentWorkpagePage"
import LecturerReviewPage from "./features/lecturer/pages/LecturerReviewPage"
import UserGuidePage from "./features/documentation/UserGuidePage"
import NotificationsPage from "./features/notification/NotificationsPage"
import LecturerClassJobsheetMonitoringPage from "./features/lecturer/pages/LecturerClassJobsheetMonitoringPage"

export type AppUser = {
  role: "MAHASISWA" | "DOSEN" | "ADMIN"
} | null

function StudentWorkpageRedirect() {
  const { kelasPraktikumId = "", jobsheetId = "", studentId = "" } = useParams()
  const location = useLocation()
  return <Navigate to={`/lecturer/kelas-praktikum/${kelasPraktikumId}/jobsheets/${jobsheetId}/students/${studentId}/monitor${location.search}`} replace />
}

function requireUser(user: AppUser, location: ReturnType<typeof useLocation>, element: React.ReactNode) {
  return user ? element : <Navigate to="/" replace state={{ from: location }} />
}

function byRole(
  user: AppUser,
  location: ReturnType<typeof useLocation>,
  {
    mahasiswa,
    dosen,
    admin,
  }: {
    mahasiswa?: React.ReactNode
    dosen?: React.ReactNode
    admin?: React.ReactNode
  },
) {
  if (!user) return <Navigate to="/" replace state={{ from: location }} />
  if (user.role === "MAHASISWA") return mahasiswa ?? <NotFoundPage />
  if (user.role === "DOSEN") return dosen ?? <NotFoundPage />
  if (user.role === "ADMIN") return admin ?? <NotFoundPage />
  return <Navigate to="/" replace />
}

export function AppRoutes({ user }: { user: AppUser }) {
  const location = useLocation()
  const lecturerShell = user?.role === "DOSEN" && !location.pathname.includes("/monitor") && !location.pathname.includes("/workpage")

  const routes = (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/dashboard" element={requireUser(user, location, <DashboardPage />)} />
      <Route path="/settings" element={requireUser(user, location, <SettingsPage />)} />
      <Route path="/notifications" element={requireUser(user, location, <NotificationsPage />)} />
      <Route path="/notifikasi" element={<Navigate to="/notifications" replace />} />
      <Route path="/panduan" element={requireUser(user, location, <UserGuidePage />)} />
      <Route path="/mata-kuliah" element={byRole(user, location, { mahasiswa: <StudentCoursePage />, dosen: <LecturerCoursesPage />, admin: <Navigate to="/admin/academic/tahun-semester" replace /> })} />
      <Route path="/academic" element={byRole(user, location, { admin: <Navigate to="/admin/academic/tahun-semester" replace /> })} />
      <Route path="/admin/academic" element={byRole(user, location, { admin: <Navigate to="/admin/academic/tahun-semester" replace /> })} />
      <Route path="/admin/academic/:section" element={byRole(user, location, { admin: <AdminAcademicNativePage /> })} />
      <Route path="/admin/academic/tahun-semester/:tahunSemesterId" element={byRole(user, location, { admin: <AdminAcademicNativePage /> })} />
      <Route path="/admin/academic/tahun-semester/:tahunSemesterId/kelas-mahasiswa" element={byRole(user, location, { admin: <AdminAcademicNativePage /> })} />
      <Route path="/admin/academic/tahun-semester/:tahunSemesterId/kelas-mahasiswa/:semId/:kelasId" element={byRole(user, location, { admin: <AdminAcademicNativePage /> })} />
      <Route path="/admin/academic/kelas-praktikum/:id" element={byRole(user, location, { admin: <AdminAcademicNativePage /> })} />
      <Route path="/users/:role" element={byRole(user, location, { admin: <AdminUsersPage /> })} />
      <Route path="/users/:role/:id" element={byRole(user, location, { admin: <AdminUserProfilePage /> })} />
      <Route path="/kelas-praktikum/:id" element={byRole(user, location, { admin: <AdminClassDetailPage /> })} />
      <Route path="/kelas-praktikum/:courseId/:classId" element={byRole(user, location, { dosen: <LecturerClassDetailPage /> })} />
      <Route path="/mata-kuliah/:mataKuliahId" element={byRole(user, location, { mahasiswa: <CourseDetailPage />, dosen: <LecturerJobsheetManagePage />, admin: <Navigate to="/admin/academic/mata-kuliah" replace /> })} />
      <Route path="/mata-kuliah/:mataKuliahId/jobsheets" element={byRole(user, location, { dosen: <LecturerJobsheetManagePage /> })} />
      <Route path="/mata-kuliah/:mataKuliahId/create" element={byRole(user, location, { dosen: <LecturerJobsheetEditorPage /> })} />
      <Route path="/mata-kuliah/:mataKuliahId/jobsheets/create" element={byRole(user, location, { dosen: <LecturerJobsheetEditorPage /> })} />
      <Route path="/mata-kuliah/:mataKuliahId/:jobsheetId/edit" element={byRole(user, location, { dosen: <LecturerJobsheetEditorPage /> })} />
      <Route path="/mata-kuliah/:mataKuliahId/jobsheets/:jobsheetId/edit" element={byRole(user, location, { dosen: <LecturerJobsheetEditorPage /> })} />
      <Route path="/lecturer/mata-kuliah/:mataKuliahId/jobsheets/create" element={byRole(user, location, { dosen: <LecturerJobsheetEditorPage /> })} />
      <Route path="/lecturer/mata-kuliah/:mataKuliahId/jobsheets/:jobsheetId/edit" element={byRole(user, location, { dosen: <LecturerJobsheetEditorPage /> })} />
      <Route path="/lecturer/kelas-praktikum/:kelasPraktikumId/jobsheets/create" element={byRole(user, location, { dosen: <LecturerJobsheetEditorPage /> })} />
      <Route path="/lecturer/kelas-praktikum/:kelasPraktikumId/jobsheets/:jobsheetId/edit" element={byRole(user, location, { dosen: <LecturerJobsheetEditorPage /> })} />
      <Route path="/jobsheets/:id/preview" element={byRole(user, location, { admin: <AdminJobsheetPreviewPage /> })} />
      <Route path="/jobsheets/:jobsheetId" element={byRole(user, location, { dosen: <LecturerJobsheetDetailPage /> })} />
      <Route path="/monitoring" element={<Navigate to="/dashboard" replace />} />
      <Route path="/lecturer/kelas-praktikum/:kelasPraktikumId/jobsheets/:jobsheetId/monitoring" element={byRole(user, location, { dosen: <LecturerClassJobsheetMonitoringPage /> })} />
      <Route path="/lecturer/kelas-praktikum/:kelasPraktikumId/jobsheets/:jobsheetId/students/:studentId/monitor/*" element={byRole(user, location, { dosen: <LecturerStudentWorkpagePage /> })} />
      <Route path="/lecturer/kelas-praktikum/:kelasPraktikumId/jobsheets/:jobsheetId/students/:studentId/workpage" element={byRole(user, location, { dosen: <StudentWorkpageRedirect /> })} />
      <Route path="/reviews/:studentId" element={byRole(user, location, { dosen: <LecturerReviewPage /> })} />
      <Route path="/mata-kuliah/:mataKuliahId/jobsheets/:jobsheetId" element={byRole(user, location, { mahasiswa: <JobsheetOverviewPage /> })} />
      <Route path="/mata-kuliah/:mataKuliahId/jobsheets/:jobsheetId/works" element={byRole(user, location, { mahasiswa: <WorkPage /> })}>
        <Route path="theory/:theoryId" element={<TheoryPage />} />
        <Route path="experiments/:experimentId" element={<ExperimentPage />} />
        <Route path="exercises/:exerciseId" element={<ExercisePage />} />
        <Route path="task" element={<TaskPage />} />
      </Route>
      <Route path="/mata-kuliah/:mataKuliahId/jobsheets/:jobsheetId/review" element={byRole(user, location, { mahasiswa: <ReviewPage /> })} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )

  if (lecturerShell) {
    return <LecturerLayout>{routes}</LecturerLayout>
  }

  return routes
}
