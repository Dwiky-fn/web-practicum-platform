import { useToastStore } from "./toastStore";
import Toast from "./Toast";

export default function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast
            id={toast.id}
            type={toast.type}
            message={toast.message}
            title={toast.title}
            senderName={toast.senderName}
            senderAvatar={toast.senderAvatar}
            onClick={toast.onClick}
            duration={toast.duration}
          />
        </div>
      ))}
    </div>
  );
}
