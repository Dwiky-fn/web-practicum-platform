import { Navigate, Routes, Route, useLocation } from "react-router-dom"
import { CurrentUserProvider } from "./services/user/CurrentUserProvider"
import { useCurrentUser } from "./services/user/useCurrentUser"
import LoginPage from "./features/auth/LoginPage"
import ForgotPasswordPage from "./features/auth/ForgotPasswordPage"
import DashboardPage from "./features/dashboard"
import SettingsPage from "./features/setting/SettingsPage"
import FullScreenLoader from "./components/loading/FullScreenLoader"
import LecturerLayout from "./features/lecturer/components/LecturerLayout"
import TopProgressBar from "./components/loading/TopProgressBar"
import StudentCoursePage from "./features/student/courses/StudentCoursePage"
import CourseDetailPage from "./features/student/courses/CourseDetailPage" 
import JobsheetOverviewPage from "./features/student/jobsheets/JobsheetOverviewPage"
import WorkPage from "./features/student/jobsheets/work/WorkPage"
import NotFoundPage from "./features/not-found/NotFoundPage"
import TheoryPage from "./features/student/jobsheets/work/content/theory/TheoryPage"
import ExperimentPage from "./features/student/jobsheets/work/content/practice/ExperimentPage"
import ExercisePage from "./features/student/jobsheets/work/content/practice/ExercisePage"
import TaskPage from "./features/student/jobsheets/work/content/task/TaskPage"
import PreviewPage from "./features/student/jobsheets/work/content/report/preview/PreviewPage"
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
import LecturerMonitoringPage from "./features/lecturer/pages/LecturerMonitoringPage"
import LecturerReviewPage from "./features/lecturer/pages/LecturerReviewPage"
import ToastContainer from "./components/toast/ToastContainer"


function AppContent() {
  const { user, loading } = useCurrentUser()
  const location = useLocation()

  if (loading) {
    return <FullScreenLoader text="Memeriksa sesi..." />
  }

  const requireUser = (element: React.ReactNode) => (
    user ? element : <Navigate to="/" replace state={{ from: location }} />
  )

  const byRole = ({
    mahasiswa,
    dosen,
    admin,
  }: {
    mahasiswa?: React.ReactNode
    dosen?: React.ReactNode
    admin?: React.ReactNode
  }) => {
    if (!user) return <Navigate to="/" replace state={{ from: location }} />
    if (user.role === "MAHASISWA") return mahasiswa ?? <NotFoundPage />
    if (user.role === "DOSEN") return dosen ?? <NotFoundPage />
    if (user.role === "ADMIN") return admin ?? <NotFoundPage />
    return <Navigate to="/" replace />
  }

  const routes = (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/dashboard" element={requireUser(<DashboardPage />)} />
      <Route path="/settings" element={requireUser(<SettingsPage />)} />
      <Route
        path="/mata-kuliah"
        element={byRole({
          mahasiswa: <StudentCoursePage />,
          dosen: <LecturerCoursesPage />,
          admin: <Navigate to="/admin/academic/tahun-semester" replace />,
        })}
      />

      <Route
        path="/academic"
        element={byRole({ admin: <Navigate to="/admin/academic/tahun-semester" replace /> })}
      />
      <Route
        path="/admin/academic"
        element={byRole({ admin: <Navigate to="/admin/academic/tahun-semester" replace /> })}
      />
      <Route
        path="/admin/academic/:section"
        element={byRole({ admin: <AdminAcademicNativePage /> })}
      />
      <Route
        path="/admin/academic/tahun-semester/:tahunSemesterId"
        element={byRole({ admin: <AdminAcademicNativePage /> })}
      />
      <Route
        path="/admin/academic/tahun-semester/:tahunSemesterId/kelas-mahasiswa"
        element={byRole({ admin: <AdminAcademicNativePage /> })}
      />
      <Route
        path="/admin/academic/tahun-semester/:tahunSemesterId/kelas-mahasiswa/:semId/:kelasId"
        element={byRole({ admin: <AdminAcademicNativePage /> })}
      />
      <Route
        path="/admin/academic/kelas-praktikum/:id"
        element={byRole({ admin: <AdminAcademicNativePage /> })}
      />
      <Route
        path="/users/:role"
        element={byRole({ admin: <AdminUsersPage /> })}
      />
      <Route
        path="/users/:role/:id"
        element={byRole({ admin: <AdminUserProfilePage /> })}
      />
      <Route
        path="/kelas-praktikum/:id"
        element={byRole({ admin: <AdminClassDetailPage /> })}
      />
      <Route
        path="/kelas-praktikum/:courseId/:classId"
        element={byRole({ dosen: <LecturerClassDetailPage /> })}
      />

      <Route
        path="/mata-kuliah/:mataKuliahId"
        element={byRole({
          mahasiswa: <CourseDetailPage />,
          dosen: <LecturerJobsheetManagePage />,
          admin: <Navigate to="/admin/academic/mata-kuliah" replace />,
        })}
      />
      <Route
        path="/mata-kuliah/:mataKuliahId/jobsheets"
        element={byRole({ dosen: <LecturerJobsheetManagePage /> })}
      />
      <Route
        path="/mata-kuliah/:mataKuliahId/jobsheets/create"
        element={byRole({ dosen: <LecturerJobsheetEditorPage /> })}
      />
      <Route
        path="/mata-kuliah/:mataKuliahId/jobsheets/:jobsheetId/edit"
        element={byRole({ dosen: <LecturerJobsheetEditorPage /> })}
      />
      <Route
        path="/jobsheets/:id/preview"
        element={byRole({ admin: <AdminJobsheetPreviewPage /> })}
      />
      <Route
        path="/jobsheets/:jobsheetId"
        element={byRole({ dosen: <LecturerJobsheetDetailPage /> })}
      />
      <Route
        path="/monitoring"
        element={byRole({ dosen: <LecturerMonitoringPage /> })}
      />
      <Route
        path="/reviews/:studentId"
        element={byRole({ dosen: <LecturerReviewPage /> })}
      />
      <Route
        path="/mata-kuliah/:mataKuliahId/jobsheets/:jobsheetId"
        element={byRole({ mahasiswa: <JobsheetOverviewPage /> })}
      />
      <Route
        path="/mata-kuliah/:mataKuliahId/jobsheets/:jobsheetId/works"
        element={byRole({ mahasiswa: <WorkPage /> })}
      >
        <Route path="theory/:theoryId" element={<TheoryPage />} />
        <Route path="experiments/:experimentId" element={<ExperimentPage />} />
        <Route path="exercises/:exerciseId" element={<ExercisePage />} />
        <Route path="task" element={<TaskPage />} />
      </Route>
      <Route
        path="/mata-kuliah/:mataKuliahId/jobsheets/:jobsheetId/preview"
        element={byRole({ mahasiswa: <PreviewPage /> })}
      />
      <Route
        path="/mata-kuliah/:mataKuliahId/jobsheets/:jobsheetId/review"
        element={byRole({ mahasiswa: <ReviewPage /> })}
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )

  if (user?.role === "DOSEN") {
    return <LecturerLayout>{routes}</LecturerLayout>
  }

  return routes
}

export default function App() {
  return (
    <CurrentUserProvider>
      <TopProgressBar />
      <AppContent />
      <ToastContainer />
    </CurrentUserProvider>
  )
}
