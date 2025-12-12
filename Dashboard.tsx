import React, { useEffect, useState, useRef } from 'react';
import { User, Transaction, TransactionType } from '../types';
import { walletService } from '../services/mockBackend';
import { TransactionList } from './TransactionList';
import { DepositModal } from './DepositModal';
import { WithdrawModal } from './WithdrawModal';
import { Button } from './Button';
import { ToastType } from './Toast';

interface DashboardProps {
  user: User;
  onLogout: () => void;
  notify: (type: ToastType, title: string, message: string) => void;
  refreshUser: () => void;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  date: string;
  type: 'success' | 'alert' | 'info';
  read: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, notify, refreshUser }) => {
  const [balance, setBalance] = useState(user.balance);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  
  // Notification States
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Sync internal balance state when parent user prop changes (important for auto-updates)
  useEffect(() => {
    setBalance(user.balance);
  }, [user.balance]);

  // Click outside to close notifications
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Generate Notifications from Transactions
  const updateNotifications = (txs: Transaction[]) => {
    const generatedNotifs: NotificationItem[] = txs.map(tx => ({
      id: `notif_${tx.id}`,
      title: tx.type === TransactionType.DEPOSIT ? 'Depósito Recebido' : 
             tx.type === TransactionType.WITHDRAW ? 'Transferência Enviada' : 'Atualização na Conta',
      message: `${tx.description} - R$ ${tx.amount.toFixed(2)}`,
      date: tx.date,
      type: tx.type === TransactionType.DEPOSIT ? 'success' : 'info',
      read: false 
    }));

    // Add a welcome notification if list is empty or just always
    generatedNotifs.push({
      id: 'welcome_msg',
      title: 'Bem-vindo ao GhostBank',
      message: 'Sua conta segura está ativa.',
      date: new Date().toISOString(),
      type: 'info',
      read: false
    });

    // Sort by date desc
    const sorted = generatedNotifs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setNotifications(sorted);
    setUnreadCount(sorted.length); // Simple simulation: all are unread initially
  };

  const fetchData = async () => {
    // Silent update if already loaded once
    if (transactions.length === 0) setLoading(true);
    try {
      // Re-fetch balance from service to ensure sync
      const bal = await walletService.getBalance();
      const txs = await walletService.getTransactions();
      setBalance(bal);
      setTransactions(txs);
      updateNotifications(txs);
      
      // Notify parent to update global state
      refreshUser();
    } catch (error) {
      console.error("Failed to fetch dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      // Mark as read visually when opening
      setUnreadCount(0);
    }
  };

  // Handler para clicar em transação pendente
  const handleTransactionClick = (tx: Transaction) => {
    setSelectedTransaction(tx);
    setShowDeposit(true);
  };

  const getNotificationIcon = (type: string) => {
    if (type === 'success') return <div className="w-2 h-2 rounded-full bg-green-500"></div>;
    return <div className="w-2 h-2 rounded-full bg-ghost-500"></div>;
  };

  const formatNotifTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60); // minutes
    if (diff < 60) return `${diff} min atrás`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `${hours} h atrás`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-darkbg text-white pb-20">
      {/* Navbar */}
      <nav className="border-b border-gray-800 bg-cardbg/50 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-ghost-500 to-ghost-800 rounded-lg flex items-center justify-center shadow-lg shadow-ghost-500/20">
              <span className="font-bold text-white">G</span>
            </div>
            <span className="font-bold text-lg tracking-tight hidden sm:block">GhostBank</span>
          </div>
          <div className="flex items-center gap-4">
            
            {/* Notification Bell */}
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={handleNotificationClick}
                className={`p-2 relative rounded-full transition-all duration-200 group ${showNotifications ? 'bg-ghost-900/50 text-white' : 'hover:bg-gray-800 text-gray-400 hover:text-white'}`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                {/* Notification Dot */}
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-cardbg animate-pulse"></span>
                )}
              </button>

              {/* Dropdown Menu */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-cardbg/95 backdrop-blur-xl border border-gray-700 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden z-50 animate-fadeIn origin-top-right">
                  <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                    <h3 className="font-bold text-white">Notificações</h3>
                    <span className="text-xs text-ghost-400 cursor-pointer hover:text-white" onClick={() => setShowNotifications(false)}>Fechar</span>
                  </div>
                  <div className="max-h-[350px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-500 text-sm">
                        Nenhuma notificação nova.
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div key={notif.id} className="p-4 border-b border-gray-800/50 hover:bg-white/5 transition-colors cursor-default">
                          <div className="flex justify-between items-start mb-1">
                            <div className="flex items-center gap-2">
                              {getNotificationIcon(notif.type)}
                              <p className="text-sm font-semibold text-gray-200">{notif.title}</p>
                            </div>
                            <span className="text-[10px] text-gray-600">{formatNotifTime(notif.date)}</span>
                          </div>
                          <p className="text-xs text-gray-400 pl-4">{notif.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-3 bg-gray-900/50 text-center border-t border-gray-800">
                    <button className="text-xs text-ghost-400 hover:text-white transition-colors">
                      Ver histórico completo
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="h-6 w-px bg-gray-700 mx-1"></div>

            <div className="text-sm text-right hidden sm:block">
              <p className="text-gray-400 text-xs">Conta Privada</p>
              <p className="font-medium text-ghost-200">{user.nickname}</p>
            </div>
            <button 
              onClick={onLogout}
              className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-red-400"
              title="Sair"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        
        {/* Balance Card */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-700 shadow-2xl p-8">
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-64 h-64 bg-ghost-600/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
          
          <div className="relative z-10">
            <p className="text-gray-400 font-medium mb-1 flex items-center gap-2">
              Saldo disponível
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </p>
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-8 tracking-tight">
              R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h2>

            <div className="grid grid-cols-2 gap-4 max-w-md">
              <Button 
                variant="primary" 
                onClick={() => { setSelectedTransaction(null); setShowDeposit(true); }}
                className="flex items-center justify-center gap-2 group"
              >
                <svg className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                Depositar
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowWithdraw(true)}
                className="flex items-center justify-center gap-2 group"
              >
                <svg className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
                Transferir
              </Button>
            </div>
          </div>
        </section>

        {/* Transactions */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="w-1 h-6 bg-ghost-500 rounded-full"></span>
              Extrato
            </h3>
            <button 
              onClick={fetchData}
              className="p-2 hover:bg-gray-800 rounded-lg text-ghost-400 hover:text-white transition-colors"
              title="Atualizar extrato"
            >
              <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            </button>
          </div>
          <TransactionList 
            transactions={transactions} 
            loading={loading} 
            onTransactionClick={handleTransactionClick}
          />
        </section>

      </main>

      {/* Modals */}
      {showDeposit && (
        <DepositModal 
          onClose={() => { setShowDeposit(false); setSelectedTransaction(null); }} 
          resumeTransaction={selectedTransaction}
          onSuccess={() => {
            fetchData();
            notify('success', 'Depósito Recebido', 'Seu saldo foi atualizado com sucesso.');
          }}
        />
      )}

      {showWithdraw && (
        <WithdrawModal 
          onClose={() => setShowWithdraw(false)} 
          currentBalance={balance}
          onSuccess={() => {
            fetchData();
            notify('success', 'Transferência Enviada', 'O valor foi debitado da sua conta.');
          }}
        />
      )}
    </div>
  );
};