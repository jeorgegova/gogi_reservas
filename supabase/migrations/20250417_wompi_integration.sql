-- =========================================
-- WOMPI PAYMENT PROVIDER INTEGRATION
-- =========================================

-- 1. Add provider and Wompi fields to payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS provider text DEFAULT 'wompi',
  ADD COLUMN IF NOT EXISTS external_reference text,
  ADD COLUMN IF NOT EXISTS transaction_id text;

-- 2. Add provider field to subscription_payments
ALTER TABLE public.subscription_payments
  ADD COLUMN IF NOT EXISTS provider text DEFAULT 'wompi';

-- 3. Indexes for Wompi lookups
CREATE INDEX IF NOT EXISTS idx_payments_external_reference ON public.payments(external_reference);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON public.payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_provider ON public.subscription_payments(provider);

-- 4. Add auto_approve_payments for automatic reservation approval on payment
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS auto_approve_payments boolean DEFAULT false;
