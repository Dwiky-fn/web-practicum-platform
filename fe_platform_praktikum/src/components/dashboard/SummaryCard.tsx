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
    <div className="bg-white p-6 rounded-2xl shadow-sm flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-semibold mt-2">{value}</p>
      </div>

      {icon && (
        <div className="text-blue-600">
          {icon}
        </div>
      )}
    </div>
  );
}
