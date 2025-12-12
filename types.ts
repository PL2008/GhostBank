export interface User {
  nickname: string;
  balance: number;
}

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAW = 'WITHDRAW',
  PAYMENT = 'PAYMENT',
  FEE = 'FEE'
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string; // ISO string
  status: TransactionStatus;
  description: string;
  // Novos campos para persistência do PIX
  pixCode?: string;
  pixQrImage?: string;
}

// --- Lxpay Gateway Interface Definitions ---

export interface LxPayClient {
  name: string;
  email: string;
  document: string; // CPF/CNPJ
  phone?: string;
}

export interface LxPayProduct {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface LxPaySplit {
  workspaceId: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  value: number;
}

export interface LxPayRequest {
  identifier: string;
  amount: number;
  client: LxPayClient;
  products?: LxPayProduct[];
  dueDate?: string;
  callbackUrl?: string;
  metadata?: Record<string, any>;
  splits?: LxPaySplit[];
}

export interface LxPayResponse {
  transactionId: string;
  status: string;
  order: {
    id: string;
    url: string;
  };
  pix: {
    code: string; // Copy paste code
    base64: string | null;
    image: string | null;
  };
}

export interface LxPayError {
  statusCode: number;
  errorCode: string;
  message: string;
  details?: any;
}