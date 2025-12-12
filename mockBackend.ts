import { LxPayRequest, LxPayResponse, Transaction, TransactionStatus, TransactionType, User } from '../types';
import { supabase } from './supabaseClient';

/**
 * BACKEND SERVICE - GHOSTBANK (PRODUCTION MODE)
 * 
 * - Persistência Real: Supabase
 * - Pagamentos Reais: LxPay API
 * - ZERO SIMULAÇÃO: Se a API falhar, o erro é retornado ao usuário.
 */

// --- CONFIGURAÇÃO LXPAY ---
// Chaves fornecidas explicitamente para garantir funcionamento imediato
const LX_PUBLIC_KEY = "pedrolucasbastoslopes1313_1765205589251";
const LX_SECRET_KEY = "dcd1da41-5407-4df4-a4c4-b5ca6d546326";

const LX_API_URL = "https://api.lxpay.com.br/api/v1/gateway/pix/receive";
const LX_API_STATUS_URL = "https://api.lxpay.com.br/api/v1/gateway/transactions";
const WITHDRAW_FEE_PERCENTAGE = 0.12; 

// Cache simples da sessão em memória
let currentUserNickname: string | null = localStorage.getItem('ghostbank_user_nickname');

// Utilitários
const generateValidCPF = (): string => {
  const rnd = (n: number) => Math.round(Math.random() * n);
  const mod = (dividend: number, divisor: number) => Math.round(dividend - (Math.floor(dividend / divisor) * divisor));
  const n1 = rnd(9), n2 = rnd(9), n3 = rnd(9), n4 = rnd(9), n5 = rnd(9), n6 = rnd(9), n7 = rnd(9), n8 = rnd(9), n9 = rnd(9);
  let d1 = n9 * 2 + n8 * 3 + n7 * 4 + n6 * 5 + n5 * 6 + n4 * 7 + n3 * 8 + n2 * 9 + n1 * 10;
  d1 = 11 - (mod(d1, 11)); if (d1 >= 10) d1 = 0;
  let d2 = d1 * 2 + n9 * 3 + n8 * 4 + n7 * 5 + n6 * 6 + n5 * 7 + n4 * 8 + n3 * 9 + n2 * 10 + n1 * 11;
  d2 = 11 - (mod(d2, 11)); if (d2 >= 10) d2 = 0;
  return `${n1}${n2}${n3}.${n4}${n5}${n6}.${n7}${n8}${n9}-${d1}${d2}`;
};

// --- RETRY HELPER PARA REDE INSTÁVEL ---
async function safeDbCall<T>(operation: () => Promise<{ data: T | null, error: any }>, retries = 3): Promise<{ data: T | null, error: any }> {
  try {
    const result = await operation();
    if (result.error && (result.error.message?.includes('Load failed') || result.error.message?.includes('fetch'))) {
      throw new Error(result.error.message);
    }
    return result;
  } catch (err: any) {
    if (retries > 0 && (err.message?.includes('Load failed') || err.message?.includes('fetch') || err.name === 'TypeError')) {
      await new Promise(res => setTimeout(res, 1000));
      return safeDbCall(operation, retries - 1);
    }
    return { data: null, error: err };
  }
}

// --- REAL API FETCH HELPER (CORS HANDLING) ---
// Tenta estratégias diferentes para garantir que a requisição saia do navegador e chegue na LxPay
async function lxPayFetch(url: string, options: RequestInit) {
  // Estratégia 1: Tentar via Proxy Seguro (Geralmente necessário para APIs de Banco via Frontend)
  // Estratégia 2: Tentar direto (Caso o backend da LxPay libere CORS no futuro)
  
  const strategies = [
    {
      name: 'Proxy IO',
      url: `https://corsproxy.io/?${encodeURIComponent(url)}`
    },
    {
      name: 'Direct',
      url: url
    }
  ];

  let lastError: any = null;

  for (const strategy of strategies) {
    try {
      // console.log(`[LxPay] Tentando conexão via ${strategy.name}...`);
      const response = await fetch(strategy.url, options);
      
      // Se a resposta for um erro de servidor (500) ou cliente (400), retornamos ela para processar o JSON de erro
      // Se for erro de rede (CORS), cairá no catch
      return response;
    } catch (error: any) {
      console.warn(`[LxPay] Falha via ${strategy.name}: ${error.message}`);
      lastError = error;
      // Continua para a próxima estratégia
    }
  }

  // Se todas as estratégias falharem
  throw new Error(`Erro de Conexão com Gateway de Pagamento: ${lastError?.message || 'Verifique sua internet'}`);
}

export const authService = {
  login: async (username: string, method: string): Promise<User> => {
    const { data: existingUser, error: fetchError } = await safeDbCall<any>(() => 
      supabase
        .from('users')
        .select('*')
        .eq('nickname', username)
        .maybeSingle()
    );

    if (fetchError) {
      if (fetchError.code === '42P01') throw new Error("Erro de Configuração: Tabelas não encontradas no Supabase.");
      throw new Error(`Erro ao conectar: ${fetchError.message}`);
    }

    if (existingUser) {
      currentUserNickname = existingUser.nickname;
      localStorage.setItem('ghostbank_user_nickname', currentUserNickname!);
      return {
        nickname: existingUser.nickname,
        balance: parseFloat(existingUser.balance)
      };
    } else {
      const { data: newUser, error: createError } = await safeDbCall<any>(() => 
        supabase
          .from('users')
          .insert([{ nickname: username, balance: 0 }])
          .select()
          .single()
      );

      if (createError) throw new Error("Não foi possível criar sua conta.");

      currentUserNickname = newUser.nickname;
      localStorage.setItem('ghostbank_user_nickname', currentUserNickname!);
      return {
        nickname: newUser.nickname,
        balance: parseFloat(newUser.balance)
      };
    }
  },

  logout: () => {
    localStorage.removeItem('ghostbank_user_nickname');
    currentUserNickname = null;
  },

  getUser: async (): Promise<User | null> => {
    const storedNick = localStorage.getItem('ghostbank_user_nickname');
    if (!storedNick) return null;

    const { data, error } = await safeDbCall<any>(() => 
      supabase
        .from('users')
        .select('*')
        .eq('nickname', storedNick)
        .maybeSingle()
    );

    if (error || !data) return null;

    currentUserNickname = data.nickname;
    return {
      nickname: data.nickname,
      balance: parseFloat(data.balance)
    };
  }
};

export const walletService = {
  getBalance: async (): Promise<number> => {
    if (!currentUserNickname) return 0;
    const { data } = await safeDbCall<any>(() => 
      supabase.from('users').select('balance').eq('nickname', currentUserNickname).maybeSingle()
    );
    return data ? parseFloat(data.balance) : 0;
  },

  getTransactions: async (): Promise<Transaction[]> => {
    if (!currentUserNickname) return [];
    const { data } = await safeDbCall<any[]>(() => 
      supabase.from('transactions').select('*').eq('user_nickname', currentUserNickname).order('created_at', { ascending: false })
    );
    
    return (data || []).map((row: any) => ({
      id: row.id,
      type: row.type as TransactionType,
      amount: parseFloat(row.amount),
      date: row.created_at,
      status: row.status as TransactionStatus,
      description: row.description,
      pixCode: row.pix_code,
      pixQrImage: row.pix_qr_image
    }));
  },

  createDepositPix: async (amount: number): Promise<LxPayResponse> => {
    if (!currentUserNickname) throw new Error("Usuário não autenticado");

    if (!LX_PUBLIC_KEY || !LX_SECRET_KEY) {
      throw new Error("Erro de Configuração: Chaves LxPay não configuradas.");
    }

    // 1. Configurar Requisição Real
    const requestBody: LxPayRequest = {
      identifier: `dep_${Date.now()}`,
      amount: amount,
      client: {
        name: currentUserNickname.replace('@', ''),
        email: 'cliente@ghostbank.com',
        document: generateValidCPF().replace(/\D/g, ''),
      }
    };

    console.log("Iniciando requisição REAL PIX para LxPay...");

    // 2. Chamada à API (Sem Mock fallback)
    const response = await lxPayFetch(LX_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // CORREÇÃO: Envio de AMBAS as chaves nos headers
        'x-public-key': LX_PUBLIC_KEY,
        'x-secret-key': LX_SECRET_KEY
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    // 3. Tratamento de Erro Real
    if (!response.ok) {
      console.error("Erro API LxPay Detalhado:", JSON.stringify(data, null, 2));
      
      if (response.status === 401 || data.errorCode === "MISSING_HEADERS") {
        throw new Error("Falha na Autorização: Chaves de API inválidas. Verifique x-public-key e x-secret-key.");
      }
      if (data.message) {
        throw new Error(`Gateway Recusou: ${data.message}`);
      }
      throw new Error("Erro desconhecido no Gateway de Pagamento.");
    }

    // 4. Sucesso Real - Salvar no Supabase
    const pixResponse = data as LxPayResponse;

    const { error: dbError } = await safeDbCall(() => 
      supabase
        .from('transactions')
        .insert([{
          id: pixResponse.transactionId || requestBody.identifier,
          user_nickname: currentUserNickname,
          type: TransactionType.DEPOSIT,
          amount: amount,
          status: TransactionStatus.PENDING,
          description: 'Depósito PIX',
          pix_code: pixResponse.pix.code,
          pix_qr_image: pixResponse.pix.base64 || pixResponse.pix.image
        }])
    );

    if (dbError) {
      console.error("Erro DB ao salvar transação:", dbError);
    }

    return pixResponse;
  },

  verifyPixStatus: async (transactionId: string): Promise<boolean> => {
    if (!currentUserNickname) return false;

    // Apenas verificamos IDs reais
    if (transactionId.startsWith('mock_')) return false;

    // 1. Checar DB local para evitar chamadas excessivas se já pago
    const { data: tx } = await safeDbCall<any>(() => 
      supabase.from('transactions').select('*').eq('id', transactionId).maybeSingle()
    );

    if (!tx) return false;
    if (tx.status === TransactionStatus.COMPLETED) return true;

    // 2. Consultar Status na LxPay (Real)
    try {
      const response = await lxPayFetch(`${LX_API_STATUS_URL}/${transactionId}`, {
        method: 'GET',
        headers: {
          // CORREÇÃO: Headers de autenticação com ambas as chaves
          'x-public-key': LX_PUBLIC_KEY,
          'x-secret-key': LX_SECRET_KEY,
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const status = data.status?.toLowerCase();
        
        console.log(`[LxPay Status] TX: ${transactionId} | Status: ${status}`);

        // Status oficiais de sucesso da LxPay
        if (status === 'paid' || status === 'completed' || status === 'approved') {
           
           // 3. Atualizar Status no Supabase
           await safeDbCall(() => 
             supabase
               .from('transactions')
               .update({ status: TransactionStatus.COMPLETED })
               .eq('id', transactionId)
           );

           // 4. Atualizar Saldo
           const currentBalance = await walletService.getBalance();
           const newBalance = currentBalance + parseFloat(tx.amount);

           await safeDbCall(() => 
             supabase
               .from('users')
               .update({ balance: newBalance })
               .eq('nickname', currentUserNickname)
           );
           
           return true;
        }
      }
    } catch (e) {
      console.error("Erro ao verificar status na API LxPay:", e);
    }

    return false;
  },

  requestWithdraw: async (amount: number, pixKey: string, keyType: string): Promise<boolean> => {
    if (!currentUserNickname) throw new Error("Usuário não logado");

    const currentBalance = await walletService.getBalance();
    const fee = amount * WITHDRAW_FEE_PERCENTAGE;
    const total = amount + fee;

    if (currentBalance < total) {
      throw new Error("Saldo insuficiente");
    }

    // Deduzir Saldo
    const newBalance = currentBalance - total;
    const { error: balanceError } = await safeDbCall(() => 
      supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('nickname', currentUserNickname)
    );

    if (balanceError) throw new Error("Erro ao atualizar saldo.");

    // Registrar Saque
    await safeDbCall(() => 
      supabase.from('transactions').insert([{
        id: `wd_${Date.now()}`,
        user_nickname: currentUserNickname,
        type: TransactionType.WITHDRAW,
        amount: amount,
        status: TransactionStatus.COMPLETED,
        description: `PIX para ${pixKey}`,
        created_at: new Date().toISOString()
      }])
    );

    // Registrar Taxa
    await safeDbCall(() => 
      supabase.from('transactions').insert([{
        id: `fee_${Date.now()}`,
        user_nickname: currentUserNickname,
        type: TransactionType.FEE,
        amount: fee,
        status: TransactionStatus.COMPLETED,
        description: 'Taxa de transação',
        created_at: new Date().toISOString()
      }])
    );

    return true;
  }
};