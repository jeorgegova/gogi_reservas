-- =========================================
-- REMOVE STRIPE: Drop all Stripe columns
-- =========================================

-- 1. Drop Stripe indexes
DROP INDEX IF EXISTS public.idx_payments_stripe_payment_intent;
DROP INDEX IF EXISTS public.idx_payments_stripe_checkout_session;
DROP INDEX IF EXISTS public.idx_organizations_stripe_account;
DROP INDEX IF EXISTS public.idx_subscription_payments_stripe_pi;

-- 2. Drop Stripe columns from payments
ALTER TABLE public.payments
  DROP COLUMN IF EXISTS stripe_payment_intent_id,
  DROP COLUMN IF EXISTS stripe_checkout_session_id,
  DROP COLUMN IF EXISTS stripe_receipt_url,
  DROP COLUMN IF EXISTS stripe_account_id;

-- 3. Drop Stripe columns from subscription_payments
ALTER TABLE public.subscription_payments
  DROP COLUMN IF EXISTS stripe_payment_intent_id,
  DROP COLUMN IF EXISTS stripe_checkout_session_id,
  DROP COLUMN IF EXISTS stripe_customer_id;

-- 4. Drop Stripe columns from organizations
ALTER TABLE public.organizations
  DROP COLUMN IF EXISTS stripe_account_id,
  DROP COLUMN IF EXISTS stripe_onboarding_complete,
  DROP COLUMN IF EXISTS stripe_details_submitted,
  DROP COLUMN IF EXISTS stripe_charges_enabled,
  DROP COLUMN IF EXISTS stripe_payouts_enabled;

-- 5. Update existing payment records to use wompi provider
UPDATE public.payments SET provider = 'wompi' WHERE provider = 'stripe' OR provider IS NULL;
UPDATE public.subscription_payments SET provider = 'wompi' WHERE provider IS NULL OR provider = 'bank_transfer';

-- 6. Remove 'paid' status from reservations (no longer needed without Stripe)
-- Revert to the original status values
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_status_check;
ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_status_check
  CHECK (status = ANY (ARRAY[
    'pending_payment'::text,
    'pending_validation'::text,
    'approved'::text,
    'rejected'::text,
    'cancelled'::text
  ]));

-- Update any 'paid' reservations to 'approved' (they were already paid)
UPDATE public.reservations SET status = 'approved' WHERE status = 'paid';
