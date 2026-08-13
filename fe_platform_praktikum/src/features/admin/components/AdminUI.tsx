import { useEffect } from "react"
import { Search } from "lucide-react"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger"
}

export function AdminButton({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const styles = {
    primary: "bg-blue-700 text-white hover:bg-blue-800 disabled:bg-gray-300",
    secondary: "border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 disabled:bg-gray-100",
    ghost: "text-blue-700 hover:bg-blue-50 disabled:text-gray-400",
    danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-300",
  }

  return (
    <button
      type="button"
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function AdminPanel({
  children,
  className = "",
  variant = "full",
}: {
  children: React.ReactNode
  className?: string
  variant?: "compact" | "medium" | "full"
}) {
  const variantStyle =
    variant === "compact"
      ? "max-w-2xl mr-auto w-full"
      : variant === "medium"
        ? "max-w-4xl mr-auto w-full"
        : "w-full"

  return (
    <section className={`rounded-xl border border-gray-200 bg-white shadow-xs transition-all ${variantStyle} ${className}`}>
      {children}
    </section>
  )
}

export function AdminSectionHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{eyebrow}</p>
        )}
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        {description && (
          <p className="mt-2 text-sm text-gray-600">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-3 md:flex-nowrap md:justify-end">
          {actions}
        </div>
      )}
    </div>
  )
}

export function AdminSearchInput({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  className?: string
}) {
  const widthClass = className || "md:w-64"

  return (
    <label className="relative block">
      <span className="sr-only">{placeholder}</span>
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={`h-10 w-full rounded-md border border-gray-300 bg-white px-3 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${widthClass}`}
      />
      <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
    </label>
  )
}

export function AdminSelect({
  value,
  onChange,
  children,
  label = "",
  className = "",
  ...props
}: {
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
  label?: string
  className?: string
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange" | "children">) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`h-10 rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  )
}

export function AdminTable({
  headers,
  children,
  variant = "full",
  className = "",
}: {
  headers: Array<string | { text: string; align?: "left" | "center" | "right" }>
  children: React.ReactNode
  variant?: "compact" | "medium" | "full"
  className?: string
}) {
  const variantContainerStyle =
    variant === "compact"
      ? "max-w-2xl mr-auto w-full"
      : variant === "medium"
        ? "max-w-4xl mr-auto w-full"
        : "w-full"

  return (
    <div className={`overflow-x-auto rounded-xl border border-gray-200 shadow-xs bg-white ${variantContainerStyle} ${className}`}>
      <table className="w-full border-collapse bg-white text-sm">
        <thead>
          <tr className="bg-blue-50/90 text-gray-700 border-b border-gray-200">
            {headers.map((header, idx) => {
              const text = typeof header === "string" ? header : header.text
              return (
                <th
                  key={typeof header === "string" ? `${header}_${idx}` : `${header.text}_${idx}`}
                  className="px-4 py-3.5 font-semibold text-xs uppercase tracking-wider text-gray-600 text-center"
                >
                  {text}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-gray-700">{children}</tbody>
      </table>
    </div>
  )
}

export function AdminActionCell({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <td className={`px-4 py-2.5 text-right whitespace-nowrap ${className}`}>
      <div className="flex items-center justify-end gap-1.5">
        {children}
      </div>
    </td>
  )
}

export function EmptyState({
  title,
}: {
  title: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex min-h-90 flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-6 text-center">
      <p className="text-lg font-medium text-gray-700">{title}</p>
    </div>
  )
}

export function AdminModal({
  title,
  description,
  children,
  footer,
  onClose,
  size = "md",
}: {
  title: string
  description?: string
  children: React.ReactNode
  footer: React.ReactNode
  onClose: () => void
  size?: "sm" | "md" | "lg" | "xl" | "2xl"
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  const sizeClasses = {
    sm: "max-w-[480px]",
    md: "max-w-190",
    lg: "max-w-4xl",
    xl: "max-w-5xl",
    "2xl": "max-w-6xl",
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-gray-900/50 px-3 py-4">
      <button
        type="button"
        className="absolute inset-0"
        onClick={onClose}
        aria-label="Tutup modal"
      />
      <div className={`relative flex max-h-[90vh] w-full ${sizeClasses[size]} flex-col overflow-hidden rounded-lg bg-white shadow-xl`}>
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-5 py-4">
          <h2 className="text-center text-xl font-semibold text-gray-900">{title}</h2>
          {description && (
            <p className="mt-1 text-center text-sm text-gray-500">{description}</p>
          )}
        </div>
        <div className="max-h-[calc(90vh-140px)] overflow-y-auto px-5 py-4 pr-6">
          {children}
        </div>
        <div className="sticky bottom-0 z-10 flex justify-end gap-3 border-t border-gray-200 bg-white px-5 py-4">
          {footer}
        </div>
      </div>
    </div>
  )
}

export function AdminConfirmModal({
  title,
  message,
  confirmLabel = "Konfirmasi",
  cancelLabel = "Batal",
  variant = "primary",
  loading = false,
  onCancel,
  onConfirm,
}: {
  title: string
  message: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: "primary" | "danger"
  loading?: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <AdminModal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <AdminButton variant="secondary" onClick={onCancel} disabled={loading}>{cancelLabel}</AdminButton>
          <AdminButton variant={variant} onClick={onConfirm} disabled={loading}>
            {loading ? "Memproses..." : confirmLabel}
          </AdminButton>
        </>
      }
    >
      <div className="text-center text-sm text-gray-700">{message}</div>
    </AdminModal>
  )
}

export function FieldRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-gray-700 md:grid-cols-[160px_1fr] md:items-center">
      <span>{label}</span>
      {children}
    </label>
  )
}

export const inputClass =
  "h-10 rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"

export function AdminTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: T; label: string }>
  active: T
  onChange: (tab: T) => void
}) {
  return (
    <div className="mb-0 flex flex-wrap gap-2 border-b border-gray-200">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`rounded-t-lg px-5 py-3 text-sm font-semibold transition ${
            active === tab.id
              ? "bg-blue-700 text-white"
              : "bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-700"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
