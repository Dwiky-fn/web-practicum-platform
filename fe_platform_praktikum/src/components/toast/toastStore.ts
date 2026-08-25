import { create } from "zustand";

export interface ToastData {
  id: string;
  type: "success" | "error" | "warning" | "info" | "chat";
  message: string;
  title?: string;
  senderName?: string;
  senderAvatar?: string;
  onClick?: () => void;
  duration?: number;
}

export interface ToastStore {
  toasts: ToastData[];
  addToast: (toast: Omit<ToastData, "id">) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

export const toast = {
  success: (message: string, duration?: number) =>
    useToastStore.getState().addToast({ type: "success", message, duration }),
  error: (message: string, duration?: number) =>
    useToastStore.getState().addToast({ type: "error", message, duration }),
  warning: (message: string, duration?: number) =>
    useToastStore.getState().addToast({ type: "warning", message, duration }),
  info: (message: string, duration?: number) =>
    useToastStore.getState().addToast({ type: "info", message, duration }),
  chat: (data: {
    message: string;
    title?: string;
    senderName?: string;
    senderAvatar?: string;
    onClick?: () => void;
    duration?: number;
  }) => useToastStore.getState().addToast({ type: "chat", duration: 6000, ...data }),
};
