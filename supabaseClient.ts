import { createClient } from '@supabase/supabase-js';

// Configuração fornecida pelo usuário
const SUPABASE_URL = 'https://vtedykszsbzogfxwvtyv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0ZWR5a3N6c2J6b2dmeHd2dHl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NTU3MjgsImV4cCI6MjA4MTEzMTcyOH0._Cd6-7CANL5lgSojDTfPSVZ4j44QWQ8tch9BlH8LCrA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false, // Gerenciamos sessão manualmente no mockBackend
    autoRefreshToken: false,
    detectSessionInUrl: false
  },
  global: {
    // Força o uso do fetch nativo para evitar erros de "Load failed" em alguns ambientes
    fetch: (url, options) => fetch(url, options)
  }
});