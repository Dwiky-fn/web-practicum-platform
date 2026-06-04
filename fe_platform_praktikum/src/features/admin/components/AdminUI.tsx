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
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-lg border border-gray-200 bg-white shadow-sm ${className}`}>
      {children}
    </section>
  )
}

export function AdminSectionHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        {description && (
          <p className="mt-2 text-sm text-gray-600">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  )
}

export function AdminSearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <label className="relative block">
      <span className="sr-only">{placeholder}</span>
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:w-64"
      />
      <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
    </label>
  )
}

export function AdminSelect({
  value,
  onChange,
  children,
  label,
}: {
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
  label: string
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        {children}
      </select>
    </label>
  )
}

export function AdminTable({
  headers,
  children,
}: {
  headers: string[]
  children: React.ReactNode
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full min-w-[720px] border-collapse bg-white text-sm">
        <thead>
          <tr className="bg-blue-50 text-left text-gray-800">
            {headers.map((header) => (
              <th key={header} className="border-b border-gray-200 px-4 py-3 font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">{children}</tbody>
      </table>
    </div>
  )
}

export function EmptyState({
  title,
  action,
}: {
  title: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-6 text-center">
      <p className="text-lg font-medium text-gray-700">{title}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function AdminModal({
  title,
  children,
  footer,
  onClose,
}: {
  title: string
  children: React.ReactNode
  footer: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4">
      <button
        type="button"
        className="absolute inset-0"
        onClick={onClose}
        aria-label="Tutup modal"
      />
      <div className="relative w-full max-w-xl rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-center text-xl font-semibold text-gray-900">{title}</h2>
        <div className="mt-6">{children}</div>
        <div className="mt-6 flex justify-center gap-4">{footer}</div>
      </div>
    </div>
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
