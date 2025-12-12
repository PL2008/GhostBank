import React, { useEffect, useState } from 'react';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { Toast, ToastMessage, ToastType } from './components/Toast';
import { User } from './types';
import { authService } from './services/mockBackend';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Function to add notifications
  const addNotification = (type: ToastType, title: string, message: string) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Auto-login logic (Async with Supabase)
  useEffect(() => {
    const checkSession = async () => {
      try {
        const existingUser = await authService.getUser();
        if (existingUser) {
          setUser(existingUser);
        }
      } catch (e) {
        console.error("Session check failed", e);
      } finally {
        setInitializing(false);
      }
    };
    checkSession();
  }, []);

  // Function to force update user state
  const refreshUser = async () => {
    const updatedUser = await authService.getUser();
    if (updatedUser) {
      setUser(updatedUser);
    }
  };

  const handleLogin = (newUser: User) => {
    setUser(newUser);
    addNotification('success', 'Bem-vindo ao GhostBank', `Olá, ${newUser.nickname}!`);
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    addNotification('info', 'Sessão encerrada', 'Você saiu com segurança.');
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-darkbg flex items-center justify-center text-ghost-400">
        <svg className="animate-spin h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  return (
    <>
      {/* Toast Container */}
      <div aria-live="assertive" className="fixed inset-0 z-[60] flex items-end px-4 py-6 pointer-events-none sm:p-6 sm:items-start">
        <div className="w-full flex flex-col items-center sm:items-end space-y-4">
          {toasts.map((toast) => (
            <Toast key={toast.id} toast={toast} onClose={removeToast} />
          ))}
        </div>
      </div>

      {!user ? (
        <Auth onLogin={handleLogin} />
      ) : (
        <Dashboard 
          user={user} 
          onLogout={handleLogout} 
          notify={addNotification}
          refreshUser={refreshUser}
        />
      )}
    </>
  );
};

export default App;