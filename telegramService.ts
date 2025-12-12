// Serviço para lidar com a API do Telegram diretamente do Frontend
// MODO ESTRITO: Apenas interações reais via API.

export interface TelegramBotInfo {
  id: number;
  first_name: string;
  username: string;
}

// Obtém o token de forma segura das variáveis de ambiente ou usa o fornecido
const getBotToken = () => {
  // Tenta obter do ENV de forma segura
  let envToken = "";
  try {
     envToken = (import.meta as any).env?.VITE_TELEGRAM_BOT_TOKEN;
  } catch (e) {}

  // Prioriza variável de ambiente se válida, senão usa o token hardcoded fornecido pelo usuário
  if (envToken && envToken.length > 20 && envToken !== "YOUR_BOT_TOKEN_HERE") {
    return envToken.trim();
  }
  
  // Token fornecido:
  return "8348551542:AAFU6cZNZGb1NhtcdQQuot0xytrNk6GNXOk";
};

/**
 * Executa requisições à API do Telegram.
 */
const telegramFetch = async (method: string, params: Record<string, any> = {}) => {
  const token = getBotToken();
  
  // Verificação graciosa para evitar erros no console se não estiver configurado
  if (!token || token === "YOUR_BOT_TOKEN_HERE") {
    return { ok: false, description: "Token not configured", error_code: 404 };
  }

  // Constrói URL com Query Params
  const urlObj = new URL(`https://api.telegram.org/bot${token}/${method}`);
  Object.keys(params).forEach(key => {
    const value = typeof params[key] === 'object' ? JSON.stringify(params[key]) : String(params[key]);
    urlObj.searchParams.append(key, value);
  });
  
  // Cache buster
  urlObj.searchParams.append('_t', Date.now().toString());
  const targetUrl = urlObj.toString();

  // Estratégias de Proxy para contornar CORS do navegador
  const strategies = [
    { 
        name: 'AllOrigins', 
        fn: (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}` 
    },
    { 
        name: 'CorsProxy', 
        fn: (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}` 
    }
  ];

  let lastError;

  for (const strategy of strategies) {
    try {
      const response = await fetch(strategy.fn(targetUrl), {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        // Alguns proxies retornam o JSON dentro de um campo 'contents' ou 'data'
        const result = data.contents ? JSON.parse(data.contents) : data;
        
        if (result.ok) {
            return result;
        } else {
             // API respondeu, mas com erro (ex: 404, 401)
             // Se for erro de token inválido (401), retornamos compatível com "missing"
             if (result.error_code === 401) {
                 return { ok: false, description: "Invalid Token", error_code: 401 };
             }
             return result;
        }
      }
    } catch (error) {
      lastError = error;
    }
  }

  console.warn("Falha de conexão Telegram:", lastError);
  return { ok: false, description: "Network Error" };
};

export const telegramService = {
  resetWebhook: async () => {
    if (!getBotToken()) return;
    await telegramFetch('deleteWebhook', { drop_pending_updates: false });
  },

  getMe: async (): Promise<TelegramBotInfo | null> => {
    const response = await telegramFetch('getMe');
    if (response.ok) return response.result;
    return null;
  },

  findChatIdByUsername: async (username: string): Promise<number | null> => {
    const response = await telegramFetch('getUpdates', {
      offset: -100, 
      limit: 100,
      allowed_updates: ["message"]
    });

    if (!response.ok || !response.result) return null;

    const targetUser = username.replace('@', '').toLowerCase().trim();
    const updates = response.result.reverse();

    for (const update of updates) {
      if (update.message?.from?.username?.toLowerCase() === targetUser) {
        return update.message.chat.id;
      }
    }
    return null;
  },

  sendVerificationCode: async (chatId: number, code: string): Promise<boolean> => {
    const response = await telegramFetch('sendMessage', {
      chat_id: chatId,
      text: `🔐 *GhostBank Auth*\n\nSeu código de acesso: \`${code}\`\n\n_Válido por 5 minutos._`,
      parse_mode: 'Markdown'
    });

    return !!response.ok;
  }
};