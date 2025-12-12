import React, { useState, useEffect } from 'react';
import { Input } from './Input';
import { Button } from './Button';
import { authService } from '../services/mockBackend';
import { telegramService, TelegramBotInfo } from '../services/telegramService';
import { User } from '../types';

interface AuthProps {
  onLogin: (user: User) => void;
}

type AuthStage = 'USERNAME' | 'CONNECTING' | 'OTP';

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [stage, setStage] = useState<AuthStage>('USERNAME');
  const [nickname, setNickname] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [botInfo, setBotInfo] = useState<TelegramBotInfo | null>(null);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    const initBot = async () => {
        // Limpa webhook ao carregar
        await telegramService.resetWebhook();
        const info = await telegramService.getMe();
        if (info) {
            setBotInfo(info);
        } else {
            setError("Erro: Não foi possível conectar ao Bot do Telegram. Verifique sua conexão.");
        }
    };
    initBot();
  }, []);

  const performCheck = async () => {
    if (!nickname) return;
    
    // 1. Tenta encontrar o Chat ID nas atualizações recentes
    const chatId = await telegramService.findChatIdByUsername(nickname);
    
    if (chatId) {
      setPolling(false);
      
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);
      
      // 2. Tenta enviar a mensagem REALMENTE
      const sent = await telegramService.sendVerificationCode(chatId, code);
      
      if (sent) {
        setStage('OTP');
        return true;
      } else {
        setStage('USERNAME');
        setError("O Bot encontrou você, mas falhou ao enviar o código. Verifique se você não bloqueou o bot.");
        return false;
      }
    }
    return false;
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (stage === 'CONNECTING') {
      setPolling(true);
      performCheck(); 
      interval = setInterval(performCheck, 3000); 
    }

    return () => clearInterval(interval);
  }, [stage, nickname]);


  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!botInfo) {
        setError("O sistema de autenticação está indisponível no momento.");
        return;
    }

    if (!nickname.includes('@') && nickname.length > 0) {
      setNickname('@' + nickname);
    }
    setError('');

    await telegramService.resetWebhook();
    setStage('CONNECTING');
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (otp === generatedOtp) { 
        const user = await authService.login(nickname, 'telegram-verified');
        onLogin(user);
      } else {
        setError('Código incorreto.');
      }
    } catch (err) {
      setError('Erro ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStage('USERNAME');
    setOtp('');
    setError('');
    setPolling(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[url('https://images.unsplash.com/photo-1639322537228-ad7142913a52?q=80&w=2664&auto=format&fit=crop')] bg-cover bg-center">
      <div className="absolute inset-0 bg-darkbg/90 backdrop-blur-sm"></div>
      
      <div className="relative w-full max-w-md bg-cardbg/80 backdrop-blur-xl border border-gray-800 p-8 rounded-2xl shadow-2xl animate-fadeIn">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-ghost-400 to-ghost-600 mb-2">
            GhostBank
          </h1>
          <p className="text-gray-400">Acesso seguro</p>
        </div>

        {error && stage === 'USERNAME' && (
            <div className="mb-4 text-red-400 text-sm text-center font-bold bg-red-900/20 p-3 rounded border border-red-500/30">
                {error}
            </div>
        )}

        {stage === 'USERNAME' && (
          <form onSubmit={handleUsernameSubmit}>
            <div className="mb-6">
              <label className="block text-ghost-300 text-sm font-medium mb-2">
                Usuário Telegram
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">@</span>
                <input
                  type="text"
                  placeholder="seu_usuario"
                  value={nickname.replace('@', '')}
                  onChange={(e) => setNickname('@' + e.target.value.replace('@', ''))}
                  className="w-full bg-darkbg border border-gray-700 focus:border-ghost-500 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-ghost-500/20 transition-all text-lg"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                O bot enviará um código para confirmar sua identidade.
              </p>
            </div>
            
            <Button type="submit" disabled={!botInfo}>
              {botInfo ? 'Continuar' : 'Conectando ao serviço...'}
            </Button>
          </form>
        )}

        {stage === 'CONNECTING' && (
          <div className="text-center space-y-6 animate-fadeIn">
            <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto relative">
               <svg className="w-10 h-10 text-blue-400 animate-pulse" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm-2.033 16.01c-.564.294-1.194.576-1.81.756-.636.186-1.056.242-1.218.156-.363-.192-.128-.908.57-2.606l2.126-5.186c.667-1.619 1.488-2.68 2.059-2.607.452.057.251 1.259-.395 3.568l-2.008 7.152c-.105.375.25.56.676.767zm9.643-9.98c-1.353 5.48-2.071 8.877-2.227 10.226-.145 1.256-.465 1.706-.889 1.737-.589.043-1.423-.526-2.122-1.026-1.109-.792-1.744-1.282-2.903-2.049-1.341-.886.297-2.028 1.442-3.159 2.503-2.47 2.584-2.834 2.113-3.091-.497-.272-2.662 1.01-6.732 3.755-1.761 1.189-3.033 1.258-4.053.967-1.117-.319-2.285-.688-2.736-.879-.769-.327-.584-1.043.156-1.559 4.318-3.007 8.046-5.19 11.231-6.529 3.035-1.277 5.09-1.583 6.138-1.042.883.456 1.054 2.108.582 2.649z"/></svg>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white mb-2">Conectando...</h3>
              <p className="text-gray-400 text-sm mb-4">
                Envie uma mensagem para <strong>@{botInfo?.username}</strong> para autorizar o acesso.
              </p>
              
              <div className="bg-darkbg/50 p-4 rounded-xl border border-blue-500/30 mb-4 text-left text-sm text-gray-300">
                1. Clique no botão abaixo<br/>
                2. Clique em <strong>COMEÇAR</strong> ou digite "Oi"<br/>
                3. Aguarde o código aqui na tela
              </div>

              {botInfo && (
                <a 
                  href={`https://t.me/${botInfo.username}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-full py-3 px-6 rounded-lg font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-lg shadow-blue-500/30 mb-4"
                >
                  Abrir Telegram
                  <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
              )}
              
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500 animate-pulse">
                Procurando sua mensagem...
              </div>
            </div>
            
            <button onClick={reset} className="text-sm text-gray-500 hover:text-white underline block w-full">
              Cancelar
            </button>
          </div>
        )}

        {stage === 'OTP' && (
          <form onSubmit={handleOtpSubmit} className="animate-fadeIn">
            <div className="mb-6 text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-green-500">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Código Enviado</h3>
              <p className="text-gray-400 text-sm">
                Verifique o chat no Telegram.
              </p>
            </div>

            <div className="mb-6">
              <Input 
                label="Código de 6 dígitos" 
                placeholder="000000"
                value={otp}
                onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                    setOtp(val);
                }}
                className="text-center text-2xl tracking-[0.5em] font-mono"
                required
                maxLength={6}
                autoFocus
              />
            </div>
            
            {error && <div className="mb-4 text-red-400 text-sm text-center font-bold bg-red-900/20 p-2 rounded">{error}</div>}

            <Button type="submit" isLoading={loading} className="mb-4">
              Acessar Conta
            </Button>

            <button type="button" onClick={reset} className="text-xs text-gray-500 hover:text-white w-full text-center">
              Tentar novamente
            </button>
          </form>
        )}
      </div>
    </div>
  );
};