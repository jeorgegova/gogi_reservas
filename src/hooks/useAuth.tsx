import { useState, useEffect, createContext, useContext, useRef, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getTerminology, type BusinessTerminology, type BusinessType } from '../lib/terminology';
import { queryClient } from '../lib/query-client';
import { initializePushNotifications, cleanupPushSubscriptions } from '../lib/pushNotifications';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  apartment: string | null;
  role: 'user' | 'admin' | 'super_admin' | 'guest';
  organization_id: string;
  organization_slug?: string;
  is_guest?: boolean;
}

interface OrganizationSettings {
  id: string;
  requires_auth: boolean;
  guest_user_id: string | null;
  business_type: BusinessType;
  name: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  impersonatedOrgId: string | null;
  setImpersonatedOrgId: (id: string | null) => void;
  businessType: BusinessType;
  terminology: BusinessTerminology;
  isGuest: boolean;
  orgSettings: OrganizationSettings | null;
  fetchOrgSettings: (slug: string) => Promise<OrganizationSettings | null>;
  setGuestMode: (guestUserId: string, orgSlug?: string, orgId?: string) => Promise<void>;
  clearGuestMode: () => void;
  restoreGuestSession: () => Promise<boolean>;
  authModal: { isOpen: boolean; view: 'login' | 'register' };
  openAuthModal: (view: 'login' | 'register') => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [businessType, setBusinessType] = useState<BusinessType>('residential');
  const [orgSettings, setOrgSettings] = useState<OrganizationSettings | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [authModal, setAuthModal] = useState<{ isOpen: boolean; view: 'login' | 'register' }>({
    isOpen: false,
    view: 'login',
  });
  const [impersonatedOrgId, setImpersonatedOrgId] = useState<string | null>(() => {
    const saved = localStorage.getItem('impersonatedOrgId');
    return saved || null;
  });

  const isGuestRef = useRef(false);

  const profileRef = useRef<Profile | null>(null);

  const openAuthModal = (view: 'login' | 'register' = 'login') => {
    setAuthModal({ isOpen: true, view });
  };

  const closeAuthModal = () => {
    setAuthModal((prev) => ({ ...prev, isOpen: false }));
  };

  const handleSetImpersonatedOrgId = (id: string | null) => {
    if (id) {
      localStorage.setItem('impersonatedOrgId', id);
    } else {
      localStorage.removeItem('impersonatedOrgId');
    }
    setImpersonatedOrgId(id);
  };

  const fetchProfile = async (userId: string, isInitialLoad = false) => {
    const currentProfile = profileRef.current;
    if (currentProfile && currentProfile.id === userId && !isInitialLoad) return;
    if (!currentProfile || isInitialLoad) setLoading(true);

    try {
      const { data: globalProfile, error: globalError } = await supabase
        .from('profiles')
        .select('*, organizations!profiles_organization_id_fkey(slug, business_type)')
        .eq('id', userId)
        .single();

      if (globalError) throw globalError;

      const pathSegments = window.location.pathname.split('/');
      let currentSlugInUrl = pathSegments[1];
      
      // Ignorar segmentos que no son slugs de organización
      const excludedSegments = ['login', 'register', 'dashboard', 'admin', 'profile', 'reservations', 'super-admin'];
      if (excludedSegments.includes(currentSlugInUrl)) {
        currentSlugInUrl = '';
      }

      const lastSlug = localStorage.getItem('lastOrganizationSlug');
      const currentSlug = currentSlugInUrl || lastSlug || globalProfile.organizations?.slug;
      
      let membershipData = null;
      let activeOrgSlug = globalProfile.organizations?.slug;
      let activeOrgBusinessType = globalProfile.organizations?.business_type;

      console.log('useAuth: Iniciando validación de contexto para slug:', currentSlug);

      if (currentSlug) {
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('id, slug, business_type')
          .eq('slug', currentSlug)
          .single();
          
        if (orgError && orgError.code !== 'PGRST116') {
          console.error('useAuth: Error buscando organización:', orgError);
        }

        if (org) {
          activeOrgSlug = org.slug;
          activeOrgBusinessType = org.business_type;
          console.log('useAuth: Org encontrada:', org.id, 'Verificando membresía...');
          
          const { data: membership, error: memError } = await supabase
            .from('memberships')
            .select('*')
            .eq('user_id', userId)
            .eq('organization_id', org.id)
            .maybeSingle();
          
          if (memError) {
            console.error('useAuth: Error buscando membresía:', memError);
          }

          if (membership) {
            console.log('useAuth: Membresía existente encontrada para org:', org.id);
            membershipData = membership;
          } else {
            // Auto-creación de membresía si el usuario está en una nueva org
            console.log('useAuth: No hay membresía, INTENTANDO auto-creación para org:', org.id);
            const { data: newMembership, error: createError } = await supabase
              .from('memberships')
              .insert({
                user_id: userId,
                organization_id: org.id,
                role: 'user',
                phone: globalProfile.phone,
                apartment: globalProfile.apartment
              })
              .select('*')
              .single();
            
            if (createError) {
              console.error('useAuth: Error al crear membresía automática:', createError);
            } else if (newMembership) {
              console.log('useAuth: Membresía creada exitosamente:', newMembership.id);
              membershipData = newMembership;
            }
          }
        } else {
          console.warn('useAuth: No se encontró la organización con slug:', currentSlug);
        }
      }

      const profileData = {
        ...globalProfile,
        organization_slug: membershipData ? activeOrgSlug : globalProfile.organizations?.slug,
        role: membershipData?.role || globalProfile.role,
        organization_id: membershipData?.organization_id || globalProfile.organization_id,
        phone: membershipData?.phone || globalProfile.phone,
        apartment: membershipData?.apartment || globalProfile.apartment,
      };

      // Only persist the slug if the user actually has a membership there
      if (membershipData && activeOrgSlug) {
        localStorage.setItem('lastOrganizationSlug', activeOrgSlug);
      }

      const orgBusinessType = (activeOrgBusinessType as BusinessType) || 'residential';
      setBusinessType(orgBusinessType);
      setProfile(profileData);
      profileRef.current = profileData;
      isGuestRef.current = false;
    } catch (error) {
      console.error('useAuth: Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrgSettings = useCallback(async (slug: string): Promise<OrganizationSettings | null> => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, requires_auth, guest_user_id, business_type, name')
        .eq('slug', slug)
        .single();

      if (error) throw error;
      if (data) {
        const settings = data as OrganizationSettings;
        setOrgSettings(settings);
        setBusinessType(settings.business_type);
        return settings;
      }
      return null;
    } catch (error) {
      console.error('useAuth: Error fetching org settings:', error);
      return null;
    }
  }, []);

  const clearGuestMode = () => {
    setProfile(null);
    setIsGuest(false);
    setOrgSettings(null);
    isGuestRef.current = false;
    profileRef.current = null;
    localStorage.removeItem('guestSession');
  };

  const restoreGuestSession = useCallback(async () => {
    const saved = localStorage.getItem('guestSession');
    if (!saved) return false;
    try {
      const data = JSON.parse(saved);

      let guestProfileId = data.guestUserId;
      if (!guestProfileId && data.orgId) {
        const { data: org } = await supabase
          .from('organizations')
          .select('guest_user_id')
          .eq('id', data.orgId)
          .single();
        guestProfileId = org?.guest_user_id;
      }

      const guestProfile: Profile = {
        id: guestProfileId || data.orgId || 'guest',
        email: 'guest@guest.com',
        full_name: null,
        phone: null,
        apartment: null,
        role: 'guest',
        organization_id: data.orgId,
        organization_slug: data.orgSlug,
        is_guest: true,
      };
      profileRef.current = guestProfile;
      isGuestRef.current = true;
      setProfile(guestProfile);
      setIsGuest(true);
      return true;
    } catch {
      localStorage.removeItem('guestSession');
      return false;
    }
  }, []);

  const fetchGuestProfile = useCallback(async (guestUserId: string, orgSlug?: string, orgId?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, organizations!profiles_organization_id_fkey(id, slug, business_type)')
        .eq('id', guestUserId)
        .single();

      if (error) throw error;
      if (data) {
        const guestProfile = {
          ...data,
          organization_id: orgId || data.organization_id,
          organization_slug: orgSlug || data.organizations?.slug,
          is_guest: true
        };
        profileRef.current = guestProfile;
        isGuestRef.current = true;
        setProfile(guestProfile);
        setIsGuest(true);
        localStorage.setItem('guestSession', JSON.stringify({ guestUserId: data.id, orgSlug: orgSlug || data.organizations?.slug, orgId: orgId || data.organization_id }));
      }
    } catch (error) {
      console.error('useAuth: Error fetching guest profile:', error);
      setIsGuest(false);
      setProfile(null);
      localStorage.removeItem('guestSession');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, true).finally(() => {
          initializePushNotifications().catch(() => {
            // No bloquear la carga inicial si las notificaciones fallan
          });
        });
      } else {
        restoreGuestSession().finally(() => setLoading(false));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null;
      setSession(session);
      setUser(currentUser);
      
      if (currentUser) {
        setIsGuest(false);
        isGuestRef.current = false;
        if (event === 'SIGNED_IN') {
          fetchProfile(currentUser.id, false).then(() => {
            initializePushNotifications().catch(() => {
              // No bloquear la sesión si las notificaciones fallan
            });
          });
        } else if (event === 'TOKEN_REFRESHED') {
          initializePushNotifications().catch(() => {
            // No bloquear la sesión si las notificaciones fallan
          });
        }
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        profileRef.current = null;
        setIsGuest(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

    const signOut = useCallback(async () => {
      try {
        // 0. Eliminar suscripciones push antes de cerrar sesión
        await cleanupPushSubscriptions();
      } catch {
        // Ignorar errores de limpieza push
      }

      try {
        // 1. Sign out from Supabase (this handles session clearing)
        await supabase.auth.signOut();
      } catch (error) {
        console.error('Error signing out from Supabase:', error);
      }
      
      // 2. Clear all localStorage to remove organization slugs, impersonation IDs, and cached images
      localStorage.clear();
      
      // 3. Clear sessionStorage just in case
      sessionStorage.clear();
      
      // 4. Reset the React Query client to clear memory cache
      queryClient.clear();
      
      // 5. Clear organization-related state
      setOrgSettings(null);
      setBusinessType('residential'); // Reset to default

      // 6. Reset local authentication and profile states immediately
      setUser(null);
      setProfile(null);
      setSession(null);
      setIsGuest(false);
      isGuestRef.current = false;
      profileRef.current = null;
    }, []);

  const contextFetchProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const effectiveProfile = profile && profile.role === 'super_admin' && impersonatedOrgId
    ? { ...profile, organization_id: impersonatedOrgId }
    : profile;

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile: effectiveProfile, 
      session, 
      loading, 
      signOut, 
      fetchProfile: contextFetchProfile,
      impersonatedOrgId,
      setImpersonatedOrgId: handleSetImpersonatedOrgId,
      businessType,
      terminology: getTerminology(businessType),
      isGuest,
      orgSettings,
      fetchOrgSettings,
      clearGuestMode,
  setGuestMode: fetchGuestProfile,
      restoreGuestSession,
      authModal,
      openAuthModal,
      closeAuthModal,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
