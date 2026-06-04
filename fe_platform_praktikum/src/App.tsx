import { Routes, Route } from "react-router-dom"
import { CurrentUserProvider } from "./services/user/CurrentUserProvider"
import { useCurrentUser } from "./services/user/useCurrentUser"
import LoginPage from "./features/auth/LoginPage"
import DashboardPage from "./features/dashboard"
import SettingsPage from "./features/setting/SettingsPage"
import FullScreenLoader from "./components/loading/FullScreenLoader"
import StudentCoursePage from "./features/course/student/StudentCoursePage"
import CourseDetailPage from "./features/course/student/CourseDetailPage" 
import JobsheetOverviewPage from "./features/jobsheet/student/JobsheetOverviewPage"
import WorkPage from "./features/jobsheet/student/work/WorkPage"
import NotFoundPage from "./features/not-found/NotFoundPage"
import TheoryPage from "./features/jobsheet/student/work/content/theory/TheoryPage"
import ExperimentPage from "./features/jobsheet/student/work/content/practice/ExperimentPage"
import ExercisePage from "./features/jobsheet/student/work/content/practice/ExercisePage"
import TaskPage from "./features/jobsheet/student/work/content/task/TaskPage"
import PreviewPage from "./features/jobsheet/student/work/content/report/preview/PreviewPage"
import ReviewPage from "./features/jobsheet/student/work/content/report/review/ReviewPage"
import AdminDashboard from "./features/admin/dashboard/AdminDashboard"
import AdminUsersPage from "./features/admin/users/AdminUsersPage"
import AdminAcademicPage from "./features/admin/academic/AdminAcademicPage"
import AdminUserProfilePage from "./features/admin/users/AdminUserProfilePage"
import AdminClassDetailPage from "./features/admin/academic/AdminClassDetailPage"
import AdminJobsheetPreviewPage from "./features/admin/academic/AdminJobsheetPreviewPage"

function AppContent() {
  const { loading } = useCurrentUser()

  if (loading) {
    return <FullScreenLoader text="Memeriksa sesi..." />
  }

  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/users/:role" element={<AdminUsersPage />} />
      <Route path="/admin/users/:role/:id" element={<AdminUserProfilePage />} />
      <Route path="/admin/academic" element={<AdminAcademicPage />} />
      <Route path="/admin/classes/:id" element={<AdminClassDetailPage />} />
      <Route path="/admin/jobsheets/:id/preview" element={<AdminJobsheetPreviewPage />} />
      <Route path="/courses" element={<StudentCoursePage />} />
      <Route path="/courses/:courseId" element={<CourseDetailPage />} />
      <Route path="/courses/:courseId/jobsheets/:jobsheetId" element={<JobsheetOverviewPage />} />
      <Route
        path="/courses/:courseId/jobsheets/:jobsheetId/works"
        element={<WorkPage />}
      >
        <Route path="theory/:theoryId" element={<TheoryPage />} />
        <Route path="experiments/:experimentId" element={<ExperimentPage />} />
        <Route path="exercises/:exerciseId" element={<ExercisePage />} />
        <Route path="task" element={<TaskPage />} />
      </Route>
      <Route
        path="/courses/:courseId/jobsheets/:jobsheetId/preview"
        element={<PreviewPage />}
      />
      <Route
        path="/courses/:courseId/jobsheets/:jobsheetId/review"
        element={<ReviewPage />}
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default function App() {
  return (
    <CurrentUserProvider>
      <AppContent />
    </CurrentUserProvider>
  )
}
