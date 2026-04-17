import type {
  PaymentProvider,
  CreatePaymentData,
  CreatePaymentResult,
  VerifyPaymentResult,
  PaymentStatus,
} from './paymentProvider';

const WOMPI_PUBLIC_KEY = import.meta.env.VITE_WOMPI_PUBLIC_KEY || '';
const WOMPI_BASE_URL =
  import.meta.env.VITE_WOMPI_BASE_URL || 'https://checkout.wompi.co';
const WOMPI_API_URL =
  import.meta.env.VITE_WOMPI_API_URL || 'https://api.wompi.co/v1';

const STATUS_MAP: Record<string, PaymentStatus> = {
  APPROVED: 'completed',
  DECLINED: 'failed',
  ERROR: 'failed',
  VOIDED: 'cancelled',
  PENDING: 'pending',
};

export class WompiProvider implements PaymentProvider {
  private readonly publicKey: string;
  private readonly baseUrl: string;
  private readonly apiUrl: string;

  constructor() {
    this.publicKey = WOMPI_PUBLIC_KEY;
    this.baseUrl = WOMPI_BASE_URL;
    this.apiUrl = WOMPI_API_URL;
  }

  async createPayment(data: CreatePaymentData): Promise<CreatePaymentResult> {
    const amountInCents = Math.round(data.amount * 100);

    const url = new URL(`${this.baseUrl}/l/`);
    url.searchParams.set('public_key', this.publicKey);
    url.searchParams.set('currency', data.currency);
    url.searchParams.set('amount-in-cents', amountInCents.toString());
    url.searchParams.set('reference', data.reference);
    url.searchParams.set('redirect-url', data.redirectUrl);

    if (data.description) {
      url.searchParams.set('description', data.description);
    }

    if (data.metadata) {
      for (const [key, value] of Object.entries(data.metadata)) {
        url.searchParams.set(`metadata:${key}`, value);
      }
    }

    return {
      checkout_url: url.toString(),
      reference: data.reference,
    };
  }

  async verifyPayment(transactionId: string): Promise<VerifyPaymentResult> {
    try {
      const response = await fetch(
        `${this.apiUrl}/transactions/${transactionId}`,
        {
          headers: { Authorization: `Bearer ${this.publicKey}` },
        }
      );

      if (!response.ok) {
        return { status: 'pending' };
      }

      const result = await response.json();
      const tx = result.data;
      if (!tx) return { status: 'pending' };

      return {
        status: STATUS_MAP[tx.status] || 'pending',
        transactionId: tx.id,
        reference: tx.reference,
        amount: tx.amount_in_cents / 100,
        currency: tx.currency,
      };
    } catch {
      return { status: 'pending' };
    }
  }
}

export const wompiProvider = new WompiProvider();
