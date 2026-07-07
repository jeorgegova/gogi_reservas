import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

type SubscriptionStatus = 'active' | 'past_due' | 'pending_validation' | 'cancelled' | 'inactive';

interface SubscriptionStatusInfo {
  status: SubscriptionStatus;
  hasSubscription: boolean;
  latestEndDate?: string;
  daysUntilExpiry?: number;
  loading: boolean;
  previousSubscriptionExpiredBeyond20Days?: boolean;
  maxReservationsPerDay: number | null;
  todayReservationsCount: number;
  isPlanFree: boolean;
}


export function useSubscriptionStatus(organizationId: string | undefined): SubscriptionStatusInfo {
  const [statusInfo, setStatusInfo] = useState<SubscriptionStatusInfo>({ 
    status: 'inactive', 
    hasSubscription: false, 
    loading: true,
    maxReservationsPerDay: null,
    todayReservationsCount: 0,
    isPlanFree: false
  });

  useEffect(() => {
    if (!organizationId) {
      setStatusInfo({ status: 'inactive', hasSubscription: false, loading: false, maxReservationsPerDay: null, todayReservationsCount: 0, isPlanFree: false });
      return;
    }

    const fetchSubscriptionStatus = async () => {
      try {
        // First get organization subscription_status
        const { data: orgData } = await supabase
          .from('organizations')
          .select('subscription_status, subscription_end_date')
          .eq('id', organizationId)
          .single();

        // Then get top 2 subscription details (most recent first)
        const { data, error } = await supabase
          .from('subscriptions')
          .select('id, end_date, status, updated_at, plan_id')
          .eq('organization_id', organizationId)
          .order('updated_at', { ascending: false })
          .limit(2);

        if (error) {
          console.error('Error fetching subscription:', error);
          setStatusInfo({ status: 'inactive', hasSubscription: false, loading: false, maxReservationsPerDay: null, todayReservationsCount: 0, isPlanFree: false });
          return;
        }

        // Also fetch the active plan's daily limit and count today's reservations
        let maxReservationsPerDay: number | null = null;
        let todayReservationsCount = 0;
        let isPlanFree = false;
        
        if (data && data.length > 0) {
          const activeSubscription = data[0];
          const { data: planData } = await supabase
            .from('subscription_plans')
            .select('max_reservations_per_day, price')
            .eq('id', activeSubscription.plan_id)
            .single();
          
          maxReservationsPerDay = planData?.max_reservations_per_day ?? null;
          isPlanFree = (planData?.price ?? 1) === 0;
          
          if (maxReservationsPerDay !== null) {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);
            
            const { count } = await supabase
              .from('reservations')
              .select('*', { count: 'exact', head: true })
              .eq('organization_id', organizationId)
              .gte('start_datetime', todayStart.toISOString())
              .lte('start_datetime', todayEnd.toISOString())
              .not('status', 'in', '("cancelled","rejected")');
            
            todayReservationsCount = count ?? 0;
          }
        }
        
        let previousSubscriptionExpiredBeyond20Days = false;
        if (data && data.length >= 2) {
          const previousSubscription = data[1]; // Second most recent
          const previousEndDate = new Date(previousSubscription.end_date);
          const now = new Date();
          const daysSincePreviousExpiry = Math.ceil((now.getTime() - previousEndDate.getTime()) / (1000 * 60 * 60 * 24));
          previousSubscriptionExpiredBeyond20Days = daysSincePreviousExpiry > 20;
        }

        if (!data || data.length === 0) {
          // Check if organization has a stored subscription_status
          if (orgData?.subscription_status && orgData.subscription_status !== 'inactive') {
            setStatusInfo({ 
              status: orgData.subscription_status as SubscriptionStatus, 
              hasSubscription: true, 
              latestEndDate: orgData.subscription_end_date,
              loading: false,
              previousSubscriptionExpiredBeyond20Days: false,
              maxReservationsPerDay: null,
              todayReservationsCount: 0,
              isPlanFree: false
            });
          } else {
            setStatusInfo({ status: 'inactive', hasSubscription: false, loading: false, maxReservationsPerDay: null, todayReservationsCount: 0, isPlanFree: false });
          }
          return;
        }

        const latestSubscription = data[0];
        const now = new Date();

        // Tentative calculation with latest
        const endDate = new Date(latestSubscription.end_date);
        let daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        let status: SubscriptionStatus;
        
        // Check subscription status from the table first
        if (latestSubscription.status === 'cancelled') {
          status = 'cancelled';
          // Sync with organization table
          if (orgData?.subscription_status !== 'cancelled') {
            await supabase
              .from('organizations')
              .update({ subscription_status: 'cancelled' })
              .eq('id', organizationId);
          }
        } else if (latestSubscription.status === 'pending' || (orgData?.subscription_status === 'pending' || orgData?.subscription_status === 'pending_validation')) {
          // Pending subscriptions (waiting for payment approval)
          // Block if previous subscription is expired beyond 20 days
          if (previousSubscriptionExpiredBeyond20Days) {
            status = 'past_due';
          } else {
            status = 'pending_validation';
          }
        } else if (daysUntilExpiry < 0) {
          // Subscription is expired by date - update to past_due
          status = 'past_due';
          // Auto-update expired subscriptions in the database
          if (latestSubscription.status !== 'expired') {
            await supabase
              .from('subscriptions')
              .update({ status: 'expired' })
              .eq('id', latestSubscription.id);
            
            await supabase
              .from('organizations')
              .update({ subscription_status: 'past_due' })
              .eq('id', organizationId);
          } else {
            // Already marked as expired in subscriptions, sync organization
            if (orgData?.subscription_status !== 'past_due') {
              await supabase
                .from('organizations')
                .update({ subscription_status: 'past_due' })
                .eq('id', organizationId);
            }
          }
        } else if (daysUntilExpiry <= 7) {
          // Expiring soon - treat as pending validation
          status = 'pending_validation';
        } else {
          status = 'active';
        }

        // If pending_validation due to pending status, use previous subscription for daysUntilExpiry
        if (status === 'pending_validation' && latestSubscription.status === 'pending' && data.length >= 2) {
          const previousSubscription = data[1];
          const previousEndDate = new Date(previousSubscription.end_date);
          daysUntilExpiry = Math.ceil((previousEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        }

        setStatusInfo({
          status,
          hasSubscription: true,
          latestEndDate: latestSubscription.end_date,
          daysUntilExpiry,
          loading: false,
          previousSubscriptionExpiredBeyond20Days,
          maxReservationsPerDay,
          todayReservationsCount,
          isPlanFree
        });
      } catch (error) {
        console.error('Error fetching subscription status:', error);
        setStatusInfo({ status: 'inactive', hasSubscription: false, loading: false, maxReservationsPerDay: null, todayReservationsCount: 0, isPlanFree: false });
      }
    };

    fetchSubscriptionStatus();
  }, [organizationId]);

  return statusInfo;
}