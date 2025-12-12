import React from 'react';
import { Transaction, TransactionStatus, TransactionType } from '../types';

interface TransactionListProps {
  transactions: Transaction[];
  loading: boolean;
  onTransactionClick?: (tx: Transaction) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({ transactions, loading, onTransactionClick }) => {
  if (loading) {
    return <div className="text-center text-gray-500 py-8">Carregando extrato...</div>;
  }

  if (transactions.length === 0) {
    return <div className="text-center text-gray-500 py-8">Nenhuma transação recente.</div>;
  }

  const getIcon = (type: TransactionType) => {
    switch (type) {
      case TransactionType.DEPOSIT:
        return (
          <div className="w-10 h-10 rounded-full bg-green-900/30 flex items-center justify-center text-green-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
          </div>
        );
      case TransactionType.WITHDRAW:
        return (
           <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center text-red-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
          </div>
        );
      case TransactionType.FEE:
        return (
           <div className="w-10 h-10 rounded-full bg-orange-900/30 flex items-center justify-center text-orange-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
        );
    }
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isClickable = (tx: Transaction) => {
    return tx.status === TransactionStatus.PENDING && tx.type === TransactionType.DEPOSIT;
  };

  return (
    <div className="space-y-4">
      {transactions.map((tx) => {
        const clickable = isClickable(tx);
        return (
          <div 
            key={tx.id} 
            onClick={() => clickable && onTransactionClick && onTransactionClick(tx)}
            className={`flex items-center justify-between p-4 bg-darkbg border border-gray-800 rounded-xl transition-all duration-200
              ${clickable 
                ? 'cursor-pointer hover:bg-gray-800/50 hover:border-ghost-600 hover:shadow-lg hover:shadow-ghost-900/20 active:scale-[0.99]' 
                : 'hover:border-gray-700'
              }`}
          >
            <div className="flex items-center gap-4">
              {getIcon(tx.type)}
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-white">{tx.description}</p>
                  {clickable && (
                    <span className="text-[10px] bg-ghost-900 text-ghost-300 px-1.5 py-0.5 rounded border border-ghost-700/50 animate-pulse">
                      Pagar
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">{formatDate(tx.date)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`font-semibold ${
                tx.type === TransactionType.DEPOSIT ? 'text-green-400' : 
                tx.type === TransactionType.FEE ? 'text-orange-400' : 'text-white'
              }`}>
                {tx.type === TransactionType.DEPOSIT ? '+' : '-'} R$ {tx.amount.toFixed(2)}
              </p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                tx.status === TransactionStatus.COMPLETED ? 'bg-green-900/30 text-green-400' :
                tx.status === TransactionStatus.PENDING ? 'bg-yellow-900/30 text-yellow-400' :
                'bg-red-900/30 text-red-400'
              }`}>
                {tx.status === TransactionStatus.COMPLETED ? 'Realizado' : 
                 tx.status === TransactionStatus.PENDING ? 'Pendente' : 'Falha'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};