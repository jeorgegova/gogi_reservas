import { useState, useEffect, createContext, useContext, useRef } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getTerminology, type BusinessTerminology, type BusinessType } from '../lib/terminology';

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
   /** Tipo de negocio de la organización activa */
   businessType: BusinessType;
   /** Diccionario de terminología adaptado al tipo de negocio */
   terminology: BusinessTerminology;
   isGuest: boolean;
   orgSettings: OrganizationSettings | null;
   fetchOrgSettings: (slug: string) => Promise<OrganizationSettings | null>;
   setGuestMode: (guestUserId: string) => Promise<void>;
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

   const openAuthModal = (view: 'login' | 'register' = 'login') => {
     setAuthModal({ isOpen: true, view });
   };

   const closeAuthModal = () => {
     setAuthModal((prev) => ({ ...prev, isOpen: false }));
   };
 
   // Ref para tener el perfil actualizado dentro de los callbacks de Supabase
  const profileRef = useRef<Profile | null>(null);
  
  // Actualizar el ref cuando cambie el perfil
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);
  // Persistir impersonatedOrgId en localStorage para mantener el modo soporte entre recargas
  const [impersonatedOrgId, setImpersonatedOrgId] = useState<string | null>(() => {
    const saved = localStorage.getItem('impersonatedOrgId');
    return saved || null;
  });

  // Función para actualizar impersonatedOrgId y persistir en localStorage
  const handleSetImpersonatedOrgId = (id: string | null) => {
    if (id) {
      localStorage.setItem('impersonatedOrgId', id);
    } else {
      localStorage.removeItem('impersonatedOrgId');
    }
    setImpersonatedOrgId(id);
  };

  const fetchProfile = async (userId: string, isInitialLoad = false) => {
    console.log('useAuth: fetchProfile iniciando para:', userId, 'isInitialLoad:', isInitialLoad);
    
    // Evitar múltiples llamadas si ya tenemos el perfil
    if (profileRef.current && profileRef.current.id === userId && !isInitialLoad) {
      console.log('useAuth: Perfil ya existe, saltando fetchProfile');
      return;
    }
    
    // Solo mostramos el estado de carga global si no tenemos perfil actual o es la carga inicial
    if (!profileRef.current || isInitialLoad) {
      setLoading(true);
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, organizations(slug, business_type)')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('useAuth: Error en consulta de perfil:', error);
        throw error;
      }
      if (data) {
        const profileData = {
          ...data,
          organization_slug: data.organizations?.slug
        };
        // Cargar business_type de la organización
        const orgBusinessType = (data.organizations?.business_type as BusinessType) || 'residential';
        setBusinessType(orgBusinessType);
        console.log('useAuth: Perfil obtenido exitosamente:', profileData, '| business_type:', orgBusinessType);
        setProfile(profileData);
      }
    } catch (error) {
      console.error('useAuth: Error fetching profile (catch):', error);
    } finally {
      console.log('useAuth: Finalizando loading del perfil');
      setLoading(false);
    }
   };
 
   const fetchOrgSettings = async (slug: string): Promise<OrganizationSettings | null> => {
     try {
       const { data, error } = await supabase
         .from('organizations')
         .select('requires_auth, guest_user_id, business_type, name')
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
   };
 
   const fetchGuestProfile = async (guestUserId: string) => {
     setLoading(true);
     try {
       const { data, error } = await supabase
         .from('profiles')
         .select('*, organizations(slug, business_type)')
         .eq('id', guestUserId)
         .single();
 
       if (error) throw error;
       if (data) {
         const profileData = {
           ...data,
           organization_slug: data.organizations?.slug,
           is_guest: true
         };
         setProfile(profileData);
         setIsGuest(true);
       }
     } catch (error) {
       console.error('useAuth: Error fetching guest profile:', error);
     } finally {
       setLoading(false);
     }
   };

  useEffect(() => {
    console.log('useAuth: useEffect inicial disparado');
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('useAuth: Sesión inicial obtenida:', session?.user?.id);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, true);
      } else {
        console.log('useAuth: No hay sesión inicial, loading false');
        setLoading(false);
      }
    });

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('useAuth: onAuthStateChange disparado:', event, session?.user?.id);
      
      const currentUser = session?.user ?? null;
      setSession(session);
      setUser(currentUser);
      
      if (currentUser) {
        // Solo llamar fetchProfile en eventos específicos para evitar duplicados
        // SIGNED_IN = nuevo inicio de sesión
        // Ignoramos TOKEN_REFRESHED y INITIAL_SESSION si ya tenemos perfil
        if (event === 'SIGNED_IN') {
          console.log('useAuth: Evento SIGNED_IN, llamando fetchProfile');
          fetchProfile(currentUser.id, false);
        } else if (event === 'SIGNED_OUT') {
          console.log('useAuth: Evento SIGNED_OUT, limpiando perfil');
          setProfile(null);
          setLoading(false);
        }
        // Para INITIAL_SESSION y TOKEN_REFRESHED no hacemos nada si ya tenemos perfil
       } else {
         console.log('useAuth: Cambio de estado sin sesión, profile null, loading false');
         setProfile(null);
         setIsGuest(false);
         setLoading(false);
       }
     });

    return () => {
      console.log('useAuth: Cleanup useEffect (unsubscribe)');
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const contextFetchProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  // Profile override for super_admin impersonation
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
       setGuestMode: fetchGuestProfile,
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
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
