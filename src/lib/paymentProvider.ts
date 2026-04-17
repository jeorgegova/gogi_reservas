export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export interface CreatePaymentData {
  reservationId?: string;
  subscriptionId?: string;
  amount: number;
  currency: string;
  reference: string;
  description?: string;
  metadata?: Record<string, string>;
  redirectUrl: string;
}

export interface CreatePaymentResult {
  checkout_url: string;
  reference: string;
}

export interface VerifyPaymentResult {
  status: PaymentStatus;
  transactionId?: string;
  reference?: string;
  amount?: number;
  currency?: string;
}

export interface PaymentProvider {
  createPayment(data: CreatePaymentData): Promise<CreatePaymentResult>;
  verifyPayment(transactionId: string): Promise<VerifyPaymentResult>;
}
