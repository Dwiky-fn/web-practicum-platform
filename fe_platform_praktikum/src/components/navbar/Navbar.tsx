import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getNotifications } from "../../services/notification/service";
import { useCurrentUser } from "../../services/user/useCurrentUser";
import type { Notification } from "../../services/notification/types";
import logo from "../../assets/logopolnep.jpg";
import pattern from "../../assets/circuit-board.svg";
import NavbarOverlay from "./NavbarOverlay";
import MobileSidebar from "./MobileSidebar";
import DesktopNavbar from "./DesktopNavbar";

const defaultNavItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/courses", label: "Mata Kuliah" },
]

interface NavbarProps {
  navItems?: Array<{
    to: string
    label: string
  }>
  mobileEnabled?: boolean
}

export default function Navbar({
  navItems = defaultNavItems,
  mobileEnabled = true,
}: NavbarProps) {
  const { user } = useCurrentUser();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const userId = user.id

    async function fetchNotifications() {
      const data = await getNotifications(userId);
      setNotifications(data);
    }
    fetchNotifications();
  }, [user]);

  const handleMarkAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, isRead: true}))
    )
  }

  return (
    <>
      {/* Overlay */}
      <NavbarOverlay
        open={notifOpen || profileOpen || (mobileEnabled && mobileOpen)}
        onClose={() => {
          setNotifOpen(false)
          setProfileOpen(false)
          setMobileOpen(false)
        }}
      />

      {/* Sidebar Mobile */}
      {mobileEnabled && (
        <MobileSidebar
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          logo={logo}
          navItems={navItems}
          unreadCount={unreadCount}
        />
      )}
      
      {/* Navbar Desktop */}
      <DesktopNavbar
        user={user}
        logo={logo}
        pattern={pattern}
        navItems={navItems}
        showMobileButton={mobileEnabled}
        notifications={notifications}
        unreadCount={unreadCount}
        notifOpen={notifOpen}
        profileOpen={profileOpen}
        onOpenMobile={() => setMobileOpen(true)}
        onToggleNotif={() => {
          setNotifOpen(!notifOpen)
          setProfileOpen(false)
        }}
        onToggleProfile={() => {
          if (window.innerWidth >= 768) {
            setProfileOpen(!profileOpen)
            setNotifOpen(false)
          }
        }}
        onMarkAllNotif={handleMarkAllAsRead}
        onSettings={() => navigate('/settings')}
        onLogout={() => navigate('/')}
      />
    </>
  );
}
