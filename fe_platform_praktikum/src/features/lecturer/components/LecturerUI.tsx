import { ChevronDown, Search } from "lucide-react"
import {
  AdminButton,
  AdminModal,
  AdminPanel,
  AdminSearchInput,
  AdminSelect,
  AdminTable,
  EmptyState,
  FieldRow,
  inputClass,
} from "../../admin/components/AdminUI"

export {
  AdminButton as LecturerButton,
  AdminModal as LecturerModal,
  AdminPanel as LecturerPanel,
  AdminSearchInput as LecturerSearchInput,
  AdminSelect as LecturerSelect,
  AdminTable as LecturerTable,
  EmptyState as LecturerEmptyState,
  FieldRow,
  inputClass,
}

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string
  subtitle?: string
  right?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

export function StatCard({ label, value, caption }: { label: string; value: string | number; caption?: string }) {
  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50 p-5 text-center">
      <p className="text-3xl font-bold text-blue-800">{value}</p>
      <p className="mt-1 text-sm font-semibold text-blue-950">{label}</p>
      {caption && <p className="mt-1 text-xs text-blue-700">{caption}</p>}
    </div>
  )
}

export function FilterBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
      {children}
    </div>
  )
}

export function NativeSelect({
  value,
  onChange,
  children,
  label,
  className = "",
  labelClassName = "text-gray-500",
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
  label?: string
  className?: string
  labelClassName?: string
  disabled?: boolean
}) {
  return (
    <label className={`block min-w-0 ${className}`}>
      {label && (
        <span className={`mb-1 block text-xs font-semibold uppercase tracking-wide ${labelClassName}`}>
          {label}
        </span>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="h-11 w-full appearance-none rounded-md border border-gray-300 bg-white px-3 pr-9 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-50 disabled:bg-gray-50"
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
      </div>
    </label>
  )
}

export function SearchBox({
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
  return (
    <label className={`relative block min-w-0 ${className}`}>
      <span className="sr-only">{placeholder}</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:min-w-[240px]"
      />
      <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
    </label>
  )
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-4 flex-1 overflow-hidden rounded-full border border-blue-200 bg-white">
        <div className="h-full rounded-full bg-blue-700" style={{ width: `${value}%` }} />
      </div>
      <span className="w-10 text-right text-sm font-semibold text-gray-700">{value}%</span>
    </div>
  )
}

export function TabButton<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: T; label: string }>
  active: T
  onChange: (tab: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-gray-200">
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
