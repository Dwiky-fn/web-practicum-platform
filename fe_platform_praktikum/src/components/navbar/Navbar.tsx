import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getNotifications, markNotificationsAsRead } from "../../services/notification/service";
import { useCurrentUser } from "../../services/user/useCurrentUser";
import { useChatNotification } from "../../services/chat/ChatNotificationContext";
import type { Notification } from "../../services/notification/types";
import logo from "../../assets/logopolnep.jpg";
import pattern from "../../assets/circuit-board.svg";
import NavbarOverlay from "./NavbarOverlay";
import MobileSidebar from "./MobileSidebar";
import DesktopNavbar from "./DesktopNavbar";

const studentNavItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/mata-kuliah", label: "Mata Kuliah" },
]

const lecturerNavItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/mata-kuliah", label: "Mata Kuliah" },
]

interface NavbarProps {
  navItems?: Array<{
    to: string
    label: string
  }>
  mobileEnabled?: boolean
}

export default function Navbar({
  navItems,
  mobileEnabled = true,
}: NavbarProps) {
  const { user, setUser } = useCurrentUser();
  const { openGlobalChat, unreadTotal } = useChatNotification();
  const location = useLocation();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const navigate = useNavigate();

  const resolvedNavItems =
    navItems ??
    (user?.role === "DOSEN"
      ? lecturerNavItems
      : user?.role === "ADMIN"
      ? []
      : studentNavItems);

  useEffect(() => {
    setProfileOpen(false);
    setNotifOpen(false);
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!profileOpen && !notifOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const isInsideBell = target.closest("#notification-bell-container");
      const isInsideProfile = target.closest("#profile-menu-container");

      if (!isInsideBell && !isInsideProfile) {
        setProfileOpen(false);
        setNotifOpen(false);
      }
    };

    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [profileOpen, notifOpen]);

  useEffect(() => {
    if (!user) return;

    const userId = user.id;

    async function fetchNotifications() {
      const data = await getNotifications(userId);
      setNotifications(data);
    }
    fetchNotifications();
  }, [user]);

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await markNotificationsAsRead(user.id);
  };

  const handleMarkItemAsRead = async (id: string) => {
    if (!user) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    await markNotificationsAsRead(user.id);
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    setUser(null);
    setNotifOpen(false);
    setProfileOpen(false);
    setMobileOpen(false);
    navigate("/");
  };

  const handleSettings = () => {
    setProfileOpen(false);
    setNotifOpen(false);
    setMobileOpen(false);
    navigate("/settings");
  };

  const handleGuide = () => {
    setProfileOpen(false);
    setNotifOpen(false);
    setMobileOpen(false);
    navigate("/panduan");
  };

  return (
    <>
      {/* Overlay */}
      <NavbarOverlay
        open={mobileEnabled && mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      {/* Sidebar Mobile */}
      {mobileEnabled && (
        <MobileSidebar
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          logo={logo}
          navItems={resolvedNavItems}
          unreadCount={unreadCount}
          onLogout={handleLogout}
        />
      )}

      {/* Navbar Desktop */}
      <DesktopNavbar
        user={user}
        logo={logo}
        pattern={pattern}
        navItems={resolvedNavItems}
        showMobileButton={mobileEnabled}
        notifications={notifications}
        unreadCount={unreadCount}
        chatUnreadCount={unreadTotal}
        notifOpen={notifOpen}
        profileOpen={profileOpen}
        onOpenMobile={() => setMobileOpen(true)}
        onToggleNotif={() => {
          setNotifOpen(!notifOpen);
          setProfileOpen(false);
        }}
        onToggleProfile={() => {
          setProfileOpen(!profileOpen);
          setNotifOpen(false);
        }}
        onMarkAllNotif={handleMarkAllAsRead}
        onMarkItemRead={handleMarkItemAsRead}
        onOpenChat={openGlobalChat}
        onGuide={handleGuide}
        onSettings={handleSettings}
        onLogout={handleLogout}
      />

      {/* Banner Notifikasi Password Default */}
      {user && user.isPasswordChanged === false && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 md:px-10 py-3.5 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center text-sm text-amber-900 relative z-40 shadow-inner">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-1.5 rounded-lg text-amber-600 flex-shrink-0">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="font-medium leading-relaxed">
              Password Anda masih menggunakan password default. Demi keamanan akun, silakan segera mengganti password.
            </p>
          </div>
          <button
            onClick={() => navigate("/settings")}
            className="flex-shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-sm hover:shadow transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
          >
            Ganti Password
          </button>
        </div>
      )}
    </>
  );
}
