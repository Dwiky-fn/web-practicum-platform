import * as React from "react"
import { PanelLeft } from "lucide-react"

const SIDEBAR_COOKIE_NAME = "sidebar_state"
const SIDEBAR_WIDTH = "18rem"
const SIDEBAR_WIDTH_MOBILE = "18rem"
const SIDEBAR_WIDTH_ICON = "4.5rem"
const SIDEBAR_KEYBOARD_SHORTCUT = "b"

interface SidebarContextValue {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (open: boolean | ((value: boolean) => boolean)) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null)

export function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }
  return context
}

export function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className = "",
  style,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [isMobile, setIsMobile] = React.useState(false)
  const [openMobile, setOpenMobile] = React.useState(false)

  const [internalOpen, _setInternalOpen] = React.useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COOKIE_NAME)
    if (saved !== null) return saved === "true"
    return defaultOpen
  })

  const open = openProp ?? internalOpen
  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState = typeof value === "function" ? value(open) : value
      if (setOpenProp) {
        setOpenProp(openState)
      } else {
        _setInternalOpen(openState)
      }
      localStorage.setItem(SIDEBAR_COOKIE_NAME, String(openState))
    },
    [setOpenProp, open],
  )

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile((val) => !val)
    } else {
      setOpen((val) => !val)
    }
  }, [isMobile, setOpen, setOpenMobile])

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault()
        toggleSidebar()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [toggleSidebar])

  const state = open ? "expanded" : "collapsed"

  const contextValue = React.useMemo<SidebarContextValue>(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    }),
    [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar],
  )

  return (
    <SidebarContext.Provider value={contextValue}>
      <div
        style={
          {
            "--sidebar-width": SIDEBAR_WIDTH,
            "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
            "--sidebar-width-mobile": SIDEBAR_WIDTH_MOBILE,
            ...style,
          } as React.CSSProperties
        }
        className={`group/sidebar-wrapper flex flex-1 min-h-0 w-full text-gray-900 ${className}`}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  )
}

export function Sidebar({
  side = "left",
  variant = "sidebar",
  collapsible = "icon",
  className = "",
  children,
  ...props
}: React.ComponentProps<"div"> & {
  side?: "left" | "right"
  variant?: "sidebar" | "floating" | "inset"
  collapsible?: "offcanvas" | "icon" | "none"
}) {
  const { isMobile, state, setOpen, openMobile, setOpenMobile } = useSidebar()

  if (collapsible === "none") {
    return (
      <div
        className={`flex h-full w-[var(--sidebar-width)] flex-col bg-white border-r border-gray-200 text-gray-900 ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }

  if (isMobile) {
    return (
      <>
        {openMobile && (
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setOpenMobile(false)}
          />
        )}
        <div
          className={`fixed inset-y-0 ${side === "left" ? "left-0" : "right-0"} z-50 flex h-full w-[var(--sidebar-width-mobile)] flex-col border-r border-gray-200 bg-white shadow-2xl transition-transform duration-300 ${
            openMobile ? "translate-x-0" : side === "left" ? "-translate-x-full" : "translate-x-full"
          } ${className}`}
          {...props}
        >
          {children}
        </div>
      </>
    )
  }

  const isCollapsed = state === "collapsed"

  return (
    <div
      data-state={state}
      data-collapsible={isCollapsed ? collapsible : ""}
      data-variant={variant}
      data-side={side}
      className={`group peer hidden md:block text-gray-900 shrink-0 sticky top-0 h-[calc(100vh-96px)] max-h-[calc(100vh-96px)] ${className}`}
    >
      <div
        onClick={() => {
          if (isCollapsed) {
            setOpen(true)
          }
        }}
        className={`relative h-full flex flex-col border-r border-gray-200/90 bg-white transition-[width] duration-300 ease-in-out ${
          isCollapsed ? "w-[var(--sidebar-width-icon)] cursor-pointer hover:bg-gray-50/80" : "w-[var(--sidebar-width)]"
        }`}
        title={isCollapsed ? "Klik untuk memperluas sidebar" : undefined}
        {...props}
      >
        {children}
      </div>
    </div>
  )
}

export function SidebarTrigger({
  className = "",
  onClick,
  ...props
}: React.ComponentProps<"button">) {
  const { toggleSidebar, state } = useSidebar()
  return (
    <button
      type="button"
      data-sidebar="trigger"
      className={`inline-flex items-center justify-center rounded-xl p-2 text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-700 focus:outline-none ${className}`}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      aria-label="Toggle Sidebar"
      title={state === "collapsed" ? "Buka Sidebar (Ctrl+B)" : "Tutup Sidebar (Ctrl+B)"}
      {...props}
    >
      <PanelLeft size={20} />
      <span className="sr-only">Toggle Sidebar</span>
    </button>
  )
}

export function SidebarRail({
  className = "",
  ...props
}: React.ComponentProps<"button">) {
  const { toggleSidebar } = useSidebar()
  return (
    <button
      type="button"
      data-sidebar="rail"
      aria-label="Toggle Sidebar Rail"
      onClick={toggleSidebar}
      className={`absolute inset-y-0 right-0 z-20 hidden w-1.5 -translate-x-1/2 transition-all hover:bg-blue-500/30 sm:flex ${className}`}
      {...props}
    />
  )
}

export function SidebarInset({
  className = "",
  children,
  ...props
}: React.ComponentProps<"main">) {
  return (
    <main
      className={`relative flex flex-1 flex-col bg-gray-50 text-gray-900 min-w-0 ${className}`}
      {...props}
    >
      {children}
    </main>
  )
}

export function SidebarHeader({
  className = "",
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-sidebar="header"
      className={`flex flex-col p-3 border-b border-gray-100 shrink-0 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function SidebarFooter({
  className = "",
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-sidebar="footer"
      className={`mt-auto shrink-0 flex flex-col p-3 border-t border-gray-100 bg-white ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function SidebarContent({
  className = "",
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-sidebar="content"
      className={`flex flex-1 flex-col gap-2 overflow-y-auto min-h-0 p-3 text-gray-900 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function SidebarGroup({
  className = "",
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-sidebar="group"
      className={`flex flex-col gap-1 py-1 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function SidebarGroupLabel({
  className = "",
  children,
  ...props
}: React.ComponentProps<"div">) {
  const { state } = useSidebar()
  if (state === "collapsed") return null
  return (
    <div
      data-sidebar="group-label"
      className={`px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-gray-400 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function SidebarGroupContent({
  className = "",
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-sidebar="group-content"
      className={`w-full ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function SidebarMenu({
  className = "",
  children,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-sidebar="menu"
      className={`flex w-full flex-col gap-1 ${className}`}
      {...props}
    >
      {children}
    </ul>
  )
}

export function SidebarMenuItem({
  className = "",
  children,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      data-sidebar="menu-item"
      className={`relative list-none ${className}`}
      {...props}
    >
      {children}
    </li>
  )
}

export function SidebarMenuButton({
  isActive = false,
  className = "",
  children,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & {
  isActive?: boolean
  asChild?: boolean
}) {
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  const baseClass = `group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
    isActive
      ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-100"
      : "text-gray-700 hover:bg-gray-100 hover:text-blue-700"
  } ${isCollapsed ? "justify-center px-2" : ""} ${className}`

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ className?: string }>, {
      className: `${baseClass} ${(children.props as { className?: string }).className || ""}`,
    })
  }

  return (
    <button
      type="button"
      data-sidebar="menu-button"
      data-active={isActive}
      className={baseClass}
      {...props}
    >
      {children}
    </button>
  )
}

export function SidebarMenuSub({
  className = "",
  children,
  ...props
}: React.ComponentProps<"ul">) {
  const { state } = useSidebar()
  if (state === "collapsed") return null
  return (
    <ul
      data-sidebar="menu-sub"
      className={`ml-4 mt-1 flex flex-col gap-0.5 border-l-2 border-gray-100 pl-3 ${className}`}
      {...props}
    >
      {children}
    </ul>
  )
}

export function SidebarMenuSubItem({
  className = "",
  children,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li className={`list-none ${className}`} {...props}>
      {children}
    </li>
  )
}

export function SidebarMenuSubButton({
  isActive = false,
  className = "",
  children,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & {
  isActive?: boolean
  asChild?: boolean
}) {
  const baseClass = `flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
    isActive
      ? "text-blue-700 font-bold bg-blue-50/70"
      : "text-gray-600 hover:text-blue-700 hover:bg-gray-50"
  } ${className}`

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ className?: string }>, {
      className: `${baseClass} ${(children.props as { className?: string }).className || ""}`,
    })
  }

  return (
    <button
      type="button"
      className={baseClass}
      {...props}
    >
      {children}
    </button>
  )
}

export function SidebarMenuBadge({
  className = "",
  children,
  ...props
}: React.ComponentProps<"div">) {
  const { state } = useSidebar()
  if (state === "collapsed") return null
  return (
    <div
      data-sidebar="menu-badge"
      className={`ml-auto rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-700 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
