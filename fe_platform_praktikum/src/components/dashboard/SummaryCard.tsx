import type { ReactNode } from "react";

interface SummaryCardProps {
  title: string;
  value: number | string;
  icon?: ReactNode;
}

export default function SummaryCard({
  title,
  value,
  icon,
}: SummaryCardProps) {
  return (
    <div className="group flex flex-col justify-between rounded-2xl border border-blue-100/80 bg-gradient-to-br from-blue-50/80 via-white to-blue-50/20 p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-blue-700">{title}</span>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 transition-transform group-hover:scale-110">
            {icon}
          </div>
        )}
      </div>

      <p className="mt-3 text-3xl font-extrabold text-gray-900">{value}</p>
    </div>
  );
}
