import { useEffect } from "react";
import { useToastStore } from "./toastStore";
import { CheckCircle, AlertTriangle, AlertCircle, Info, X } from "lucide-react";

interface ToastProps {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
  duration?: number;
}

export default function Toast({ id, type, message, duration = 3000 }: ToastProps) {
  const removeToast = useToastStore((state) => state.removeToast);

  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, removeToast]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-500 shrink-0" />,
  };

  const borders = {
    success: "border-l-4 border-green-500",
    error: "border-l-4 border-red-500",
    warning: "border-l-4 border-amber-500",
    info: "border-l-4 border-blue-500",
  };

  return (
    <div
      className={`flex items-start gap-3 w-[350px] max-w-full p-4 rounded-xl bg-white shadow-xl shadow-slate-900/10 border border-slate-100 ${borders[type]} animate-slide-in transition-all`}
      role="alert"
    >
      <div className="mt-0.5">{icons[type]}</div>
      <div className="flex-1 text-sm font-medium text-slate-800 break-words leading-relaxed">
        {message}
      </div>
      <button
        onClick={() => removeToast(id)}
        className="text-slate-400 hover:text-slate-600 transition cursor-pointer shrink-0"
        aria-label="Tutup"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
