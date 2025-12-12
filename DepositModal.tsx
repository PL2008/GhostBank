import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { walletService } from '../services/mockBackend';
import { LxPayResponse, Transaction } from '../types';

interface DepositModalProps {
  onClose: () => void;
  onSuccess: () => void;
  resumeTransaction?: Transaction | null;
}

export const DepositModal: React.FC<DepositModalProps> = ({ onClose, onSuccess, resumeTransaction }) => {
  const [step, setStep] = useState<'form' | 'payment' | 'success' | 'expired'>('form');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pixData, setPixData] = useState<LxPayResponse | null>(null);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes default
  const [copied, setCopied] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  // Inicialização para "Resumir" transação
  useEffect(() => {
    if (resumeTransaction) {
      setAmount(resumeTransaction.amount.toFixed(2));
      
      // Reconstrói o objeto LxPayResponse parcial com o que temos
      setPixData({
        transactionId: resumeTransaction.id,
        status: 'PENDING',
        order: { id: '', url: '' },
        pix: {
          code: resumeTransaction.pixCode || '',
          base64: resumeTransaction.pixQrImage || null,
          image: resumeTransaction.pixQrImage || null
        }
      });

      // Calcula tempo restante
      const createdAt = new Date(resumeTransaction.date).getTime();
      const expiresAt = createdAt + (10 * 60 * 1000); // 10 minutos
      const now = Date.now();
      const remaining = Math.floor((expiresAt - now) / 1000);

      if (remaining > 0) {
        setTimeLeft(remaining);
        setStep('payment');
      } else {
        setStep('expired');
      }
    }
  }, [resumeTransaction]);

  // Timer logic
  useEffect(() => {
    if (step === 'payment' && timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    } else if (step === 'payment' && timeLeft <= 0) {
      setStep('expired');
    }
  }, [timeLeft, step]);

  // AUTOMATIC POLLING: Verifica status a cada 10 segundos
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    if (step === 'payment' && pixData?.transactionId) {
      setIsPolling(true);
      
      const checkStatus = async () => {
        try {
          const isPaid = await walletService.verifyPixStatus(pixData.transactionId);
          console.log(`Verificando status TX ${pixData.transactionId}:`, isPaid ? 'PAGO' : 'PENDENTE');
          
          if (isPaid) {
            setStep('success');
            setTimeout(() => {
              onSuccess();
              onClose();
            }, 3500);
          }
        } catch (error) {
          console.error("Erro na verificação automática:", error);
        }
      };

      // Loop de 10 segundos
      intervalId = setInterval(checkStatus, 10000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [step, pixData, onSuccess, onClose]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleCreatePix = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    let cleanAmountStr = amount.replace(/[^0-9.]/g, ''); 
    const val = parseFloat(cleanAmountStr);

    if (!val || val <= 0) {
      setError("Por favor, digite um valor válido (ex: 10.00).");
      return;
    }

    setLoading(true);
    try {
      const response = await walletService.createDepositPix(val);
      
      if(response && response.transactionId) {
        setPixData(response);
        setStep('payment');
        setTimeLeft(600);
      } else {
        throw new Error("O Gateway não retornou dados válidos.");
      }
    } catch (error: any) {
      console.error(error);
      setError(error.message || "Erro desconhecido ao gerar PIX");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    const code = pixData?.pix?.code;
    if (code) {
      navigator.clipboard.writeText(code).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(err => {
        // Fallback para mobile antigo
        const textArea = document.createElement("textarea");
        textArea.value = code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  // Renderiza imagem do QR Code
  const getQrImage = () => {
    if (!pixData || !pixData.pix) return null;
    
    // 1. Prioridade: Base64 do Gateway
    if (pixData.pix.base64 && pixData.pix.base64.length > 20) {
      return pixData.pix.base64.startsWith('data:') 
        ? pixData.pix.base64 
        : `data:image/png;base64,${pixData.pix.base64}`;
    }
    
    // 2. Prioridade: URL de Imagem do Gateway
    if (pixData.pix.image && pixData.pix.image.startsWith('http')) {
        return pixData.pix.image;
    }
    
    // 3. Fallback Visual
    if (pixData.pix.code) {
      return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(pixData.pix.code)}`;
    }
    
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg p-4 transition-opacity duration-300">
      <div className="bg-cardbg border border-gray-700 w-full max-w-md rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden relative animate-scaleIn">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white z-10 p-2 transition-colors rounded-full hover:bg-gray-800"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            {step === 'form' && 'Depositar via PIX'}
            {step === 'payment' && 'Escaneie o QR Code'}
            {step === 'success' && 'Sucesso!'}
            {step === 'expired' && 'Pix Expirado'}
          </h2>

          {step === 'expired' && (
            <div className="text-center animate-fadeIn py-4">
              <div className="w-20 h-20 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-gray-300 mb-6">O tempo para pagamento deste QR Code expirou. Por favor, gere um novo depósito.</p>
              <Button onClick={() => setStep('form')} variant="primary">
                Gerar Novo PIX
              </Button>
            </div>
          )}

          {step === 'form' && (
            <form onSubmit={handleCreatePix} className="animate-fadeIn space-y-8">
              <div className="flex flex-col items-center">
                <label className="text-gray-400 text-sm mb-4 font-medium uppercase tracking-wide">Valor do depósito</label>
                <div className="relative w-full max-w-[240px]">
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-500 font-light text-3xl">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setError(''); }}
                    className="w-full bg-transparent border-b-2 border-gray-700 focus:border-ghost-500 py-2 pl-12 text-white text-5xl font-bold placeholder-gray-800 focus:outline-none transition-all text-center"
                    required
                    autoFocus
                  />
                </div>
              </div>
              
              {error && (
                <div className="p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-400 text-xs text-center">
                  {error}
                </div>
              )}

              <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-4 rounded-xl border border-gray-700/50 shadow-inner">
                <ul className="text-sm text-gray-400 space-y-3">
                  <li className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-900/50 flex items-center justify-center text-green-500">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                    </div>
                    <span>Cai na hora</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-900/50 flex items-center justify-center text-green-500">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                    </div>
                    <span>Seguro e verificado</span>
                  </li>
                </ul>
              </div>

              <Button type="submit" isLoading={loading} className="py-4 text-lg font-bold shadow-lg shadow-ghost-600/20 transform active:scale-95 transition-transform">
                Gerar PIX
              </Button>
            </form>
          )}

          {step === 'payment' && pixData && (
            <div className="flex flex-col items-center animate-fadeIn w-full">
              {/* Timer */}
              <div className="w-full flex justify-between items-center bg-yellow-900/10 rounded-full px-4 py-2 mb-6 border border-yellow-500/20">
                <span className="text-yellow-500/80 text-xs uppercase tracking-wider flex items-center gap-2 font-bold">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                  Aguardando Pagamento
                </span>
                <span className="text-yellow-500 font-mono font-bold">{formatTime(timeLeft)}</span>
              </div>

              {/* QR Code Container */}
              <div className="bg-white p-4 rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.1)] mb-6 relative group transition-transform hover:scale-[1.02] duration-300">
                 <div className="w-56 h-56 flex items-center justify-center bg-gray-50 overflow-hidden rounded-xl">
                   {getQrImage() ? (
                     <img src={getQrImage()!} alt="QR Code Pix" className="w-full h-full object-contain mix-blend-multiply" />
                   ) : (
                     <div className="text-gray-400 text-xs text-center p-4">
                       <svg className="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                       Carregando QR Code...
                     </div>
                   )}
                 </div>
              </div>
              
              {/* Copia e Cola */}
              <div className="w-full mb-6">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Pix Copia e Cola</p>
                  {copied && <span className="text-green-400 text-xs font-bold animate-bounce">Copiado!</span>}
                </div>
                
                <button 
                  onClick={handleCopy}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-300 relative overflow-hidden group ${copied ? 'bg-green-500/10 border-green-500/50' : 'bg-darkbg border-gray-700 hover:border-ghost-500'}`}
                >
                  <p className={`text-xs font-mono break-all pr-10 line-clamp-2 ${copied ? 'text-green-400' : 'text-gray-300 opacity-80'}`}>
                    {pixData.pix.code || "Código indisponível"}
                  </p>
                  <div className="absolute right-0 top-0 bottom-0 w-14 bg-gradient-to-l from-cardbg via-cardbg to-transparent flex items-center justify-center">
                    {copied ? (
                       <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                    ) : (
                       <svg className="w-6 h-6 text-ghost-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                    )}
                  </div>
                </button>
              </div>

              <div className="w-full text-center">
                 <p className="text-xs text-gray-500 mb-3">
                   Verificando pagamento automaticamente...
                 </p>
                 {isPolling && (
                    <div className="flex items-center justify-center gap-2 text-ghost-500 text-xs bg-ghost-900/20 py-1 px-3 rounded-full mx-auto w-fit">
                       <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Sincronizando com banco (10s)</span>
                    </div>
                 )}
              </div>
            </div>
          )}

          {step === 'success' && (
             <div className="flex flex-col items-center justify-center py-10 animate-scaleIn text-center">
                <div className="w-28 h-28 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(34,197,94,0.5)] relative">
                  <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-30"></div>
                  <svg className="w-14 h-14 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h3 className="text-3xl font-bold text-white mb-2">Sucesso!</h3>
                <p className="text-gray-300 mb-8 text-lg">
                  <strong className="text-green-400">R$ {parseFloat(amount).toFixed(2)}</strong> adicionados.
                </p>
                <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 animate-[width_3s_ease-out_forwards]" style={{width: '0%'}}></div>
                </div>
             </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes scaleIn {
            from { transform: scale(0.9); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
        .animate-scaleIn {
            animation: scaleIn 0.3s ease-out forwards;
        }
        @keyframes width {
            from { width: 0%; }
            to { width: 100%; }
        }
      `}</style>
    </div>
  );
};