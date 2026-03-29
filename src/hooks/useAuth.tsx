import { useState, useEffect, createContext, useContext, useRef } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  apartment: string | null;
  role: 'user' | 'admin' | 'super_admin';
  organization_id: string;
  organization_slug?: string;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
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
    // Esto previene que al cambiar de pestaña y que Supabase refresque el token,
    // se desmonte toda la app por el estado loading.
    if (!profileRef.current || isInitialLoad) {
      setLoading(true);
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, organizations(slug)')
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
        console.log('useAuth: Perfil obtenido exitosamente:', profileData);
        setProfile(profileData);
      }
    } catch (error) {
      console.error('useAuth: Error fetching profile (catch):', error);
    } finally {
      console.log('useAuth: Finalizando loading del perfil');
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
      setImpersonatedOrgId: handleSetImpersonatedOrgId
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
