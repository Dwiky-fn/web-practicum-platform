interface NavbarOverlayProps {
  open: boolean
  onClose: () => void
}

export default function NavbarOverlay({
  open,
  onClose,
}: NavbarOverlayProps) {
  return (
    <div
      onClick={onClose}
      className={`
        fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40
        transition-opacity duration-200
        ${open ? "opacity-100" : "opacity-0 pointer-events-none"}
      `}
    />
  )
}
