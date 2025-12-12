import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { walletService } from '../services/mockBackend';

interface WithdrawModalProps {
  onClose: () => void;
  onSuccess: () => void;
  currentBalance: number;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({ onClose, onSuccess, currentBalance }) => {
  const [amount, setAmount] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [keyType, setKeyType] = useState('cpf');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const numAmount = parseFloat(amount) || 0;
  const fee = numAmount * 0.12;
  const total = numAmount + fee;
  
  // Real-time validation logic
  const isValidAmount = numAmount > 0;
  const hasBalance = currentBalance >= total;

  useEffect(() => {
    if (isValidAmount && !hasBalance) {
      setError('Saldo insuficiente para realizar esta transferência.');
    } else {
      setError('');
    }
  }, [amount, currentBalance]);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Final Validation check before submit
    if (!isValidAmount) {
      setError('Digite um valor válido.');
      return;
    }
    if (!pixKey) {
      setError('Digite a chave PIX de destino.');
      return;
    }
    if (!hasBalance) {
      setError(`Saldo insuficiente. Você precisa de R$ ${total.toFixed(2)}`);
      return;
    }

    setLoading(true);
    try {
      await walletService.requestWithdraw(numAmount, pixKey, keyType);
      
      // Success Feedback
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar saque. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-cardbg border border-gray-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white z-10 p-2"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-6">
          <div className="mb-6 text-center">
             <h2 className="text-xl font-bold text-white mb-1">Transferir via PIX</h2>
             <p className="text-sm text-gray-400">Saldo atual: <span className="text-white font-bold">R$ {currentBalance.toFixed(2)}</span></p>
          </div>

          <form onSubmit={handleWithdraw}>
            <div className="mb-4">
              <label className="block text-ghost-300 text-sm font-medium mb-2">Tipo de Chave</label>
              <div className="flex gap-2 bg-darkbg p-1 rounded-lg border border-gray-800">
                {['cpf', 'email', 'tel', 'aleat'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setKeyType(type)}
                    className={`flex-1 py-2 text-[10px] sm:text-xs font-semibold rounded uppercase transition-all ${
                      keyType === type 
                      ? 'bg-ghost-600 text-white shadow-lg' 
                      : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Chave PIX"
              placeholder={keyType === 'cpf' ? '000.000.000-00' : 'Chave do destinatário'}
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              required
            />

            <Input
              label="Valor da Transferência (R$)"
              type="number"
              step="0.01"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={!hasBalance && isValidAmount ? 'border-red-500 text-red-500' : ''}
              required
            />

            {/* Resumo Financeiro */}
            <div className={`p-4 rounded-lg border mb-6 space-y-2 transition-colors duration-300 ${(!hasBalance && isValidAmount) ? 'bg-red-900/20 border-red-500/50' : 'bg-gray-900/50 border-gray-800'}`}>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Valor a enviar:</span>
                <span className="text-white">R$ {numAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400 flex items-center gap-1">
                   Taxa de serviço (12%)
                </span>
                <span className="text-red-400 font-medium">+ R$ {fee.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-700/50 my-2 pt-2 flex justify-between items-center font-bold">
                <span className={(!hasBalance && isValidAmount) ? "text-red-300" : "text-gray-300"}>Total debitado:</span>
                <span className={`text-lg ${(!hasBalance && isValidAmount) ? 'text-red-400' : 'text-ghost-300'}`}>
                  R$ {total.toFixed(2)}
                </span>
              </div>
              {(!hasBalance && isValidAmount) && (
                <div className="flex items-center gap-2 text-red-400 text-xs justify-center mt-2 font-bold bg-red-900/30 py-1 rounded">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                  SALDO INSUFICIENTE
                </div>
              )}
            </div>

            {error && !(!hasBalance && isValidAmount) && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}

            <Button 
              type="submit" 
              isLoading={loading} 
              variant={(!hasBalance && isValidAmount) ? "danger" : "primary"}
              disabled={!hasBalance || !isValidAmount}
              className="mt-2"
            >
              {(!hasBalance && isValidAmount) ? 'Saldo Insuficiente' : 'Confirmar Transferência'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};