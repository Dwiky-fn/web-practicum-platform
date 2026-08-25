import { CurrentUserProvider } from "./services/user/CurrentUserProvider"
import { useCurrentUser } from "./services/user/useCurrentUser"
import FullScreenLoader from "./components/loading/FullScreenLoader"
import TopProgressBar from "./components/loading/TopProgressBar"
import ToastContainer from "./components/toast/ToastContainer"
import { AppRoutes } from "./routes"
import { ChatNotificationProvider } from "./services/chat/ChatNotificationContext"

function AppContent() {
  const { user, loading } = useCurrentUser()

  if (loading) {
    return <FullScreenLoader text="Memeriksa sesi..." />
  }

  return (
    <ChatNotificationProvider>
      <AppRoutes user={user} />
    </ChatNotificationProvider>
  )
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
