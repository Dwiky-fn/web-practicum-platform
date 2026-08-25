import { useEffect } from "react";
import { useToastStore } from "./toastStore";
import { CheckCircle, AlertTriangle, AlertCircle, Info, MessageSquare, X } from "lucide-react";

interface ToastProps {
  id: string;
  type: "success" | "error" | "warning" | "info" | "chat";
  message: string;
  title?: string;
  senderName?: string;
  senderAvatar?: string;
  onClick?: () => void;
  duration?: number;
}

export default function Toast({
  id,
  type,
  message,
  title,
  senderName,
  senderAvatar,
  onClick,
  duration = 5000,
}: ToastProps) {
  const removeToast = useToastStore((state) => state.removeToast);

  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, removeToast]);

  const handleToastClick = () => {
    if (onClick) {
      onClick();
      removeToast(id);
    }
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-500 shrink-0" />,
    chat: <MessageSquare className="w-5 h-5 text-blue-600 shrink-0" />,
  };

  const borders = {
    success: "border-l-4 border-green-500",
    error: "border-l-4 border-red-500",
    warning: "border-l-4 border-amber-500",
    info: "border-l-4 border-blue-500",
    chat: "border-l-4 border-blue-600 bg-gradient-to-r from-blue-50/50 to-white",
  };

  return (
    <div
      onClick={handleToastClick}
      className={`flex items-start gap-3 w-[360px] max-w-full p-4 rounded-xl bg-white shadow-xl shadow-slate-900/10 border border-slate-200 ${borders[type]} animate-slide-in transition-all ${
        onClick ? "cursor-pointer hover:shadow-2xl hover:border-blue-300" : ""
      }`}
      role="alert"
    >
      <div className="mt-0.5 shrink-0">
        {senderAvatar ? (
          <img src={senderAvatar} alt={senderName || "Avatar"} className="w-7 h-7 rounded-full object-cover border border-blue-200" />
        ) : (
          icons[type]
        )}
      </div>
      <div className="flex-1 text-sm text-slate-800 break-words leading-relaxed min-w-0">
        {(type === "chat" || title || senderName) && (
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="font-bold text-xs text-blue-900 truncate">
              {senderName || title || "Pesan Chat Baru"}
            </span>
            <span className="text-[10px] text-blue-600 font-semibold px-1.5 py-0.5 rounded bg-blue-100 shrink-0">
              Pesan Baru
            </span>
          </div>
        )}
        <div className="text-xs font-medium text-slate-700 line-clamp-2">{message}</div>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          removeToast(id);
        }}
        className="text-slate-400 hover:text-slate-600 transition cursor-pointer shrink-0"
        aria-label="Tutup"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
