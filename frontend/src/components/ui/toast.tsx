import { Toaster as HotToaster } from 'react-hot-toast';

export function ToastProvider() {
  return (
    <HotToaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#0f172a',
          color: '#f1f5f9',
          border: '1px solid #1e293b',
          borderRadius: '8px',
          fontSize: '14px',
        },
        success: {
          iconTheme: { primary: '#10b981', secondary: '#f0fdf4' },
        },
        error: {
          iconTheme: { primary: '#ef4444', secondary: '#fef2f2' },
        },
      }}
    />
  );
}
