import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Button, Card } from './ui';

type ToastVariant = 'success' | 'error' | 'info';

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
};

type ToastState = {
  id: number;
  message: string;
  variant: ToastVariant;
};

type ConfirmState = ConfirmOptions & {
  resolve: (confirmed: boolean) => void;
};

type FeedbackContextValue = {
  toast: (message: string, variant?: ToastVariant) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toastState, setToastState] = useState<ToastState | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const toast = useCallback((message: string, variant: ToastVariant = 'success') => {
    const id = Date.now();
    setToastState({ id, message, variant });
    window.setTimeout(() => {
      setToastState((current) => current?.id === id ? null : current);
    }, 3500);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ ...options, resolve });
    });
  }, []);

  const closeConfirm = (confirmed: boolean) => {
    setConfirmState((current) => {
      current?.resolve(confirmed);
      return null;
    });
  };

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}

      {toastState && (
        <div className="fixed left-4 right-4 bottom-24 z-50 mx-auto max-w-md">
          <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg ${
            toastState.variant === 'error'
              ? 'bg-red-50 border-red-100 text-red-700'
              : toastState.variant === 'info'
                ? 'bg-blue-50 border-blue-100 text-blue-700'
                : 'bg-emerald-50 border-emerald-100 text-emerald-700'
          }`}>
            {toastState.variant === 'error' ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
            <p className="text-sm font-medium">{toastState.message}</p>
          </div>
        </div>
      )}

      {confirmState && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6 pt-16 backdrop-blur-sm sm:items-center sm:pb-16">
          <Card className="w-full max-w-sm p-5 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">{confirmState.title}</h3>
            {confirmState.message && <p className="mt-2 text-sm leading-relaxed text-gray-500">{confirmState.message}</p>}
            <div className="mt-5 flex gap-2">
              <Button
                variant="secondary"
                onClick={() => closeConfirm(false)}
                className="flex-1"
              >
                {confirmState.cancelLabel || 'Cancelar'}
              </Button>
              <Button
                variant={confirmState.variant === 'danger' ? 'danger' : 'primary'}
                onClick={() => closeConfirm(true)}
                className={confirmState.variant === 'danger' ? 'flex-1 bg-danger-600 text-white hover:bg-red-700' : 'flex-1'}
              >
                {confirmState.confirmLabel || 'Confirmar'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error('useFeedback must be used within FeedbackProvider');
  return context;
}
