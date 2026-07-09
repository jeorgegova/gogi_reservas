import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, Modal, DropdownMenu, DropdownMenuItem } from '@/components/ui/alert-dialog';
import {
  User,
  Search,
  Mail,
  Smartphone,
  MapPin,
  MoreHorizontal,
  Pencil,
  Trash2,
  Shield,
  ShieldOff,
  Save,
  X,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTerminology, type BusinessTerminology } from '@/lib/terminology';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  user_id: string;
  membership_id: string;
  email: string;
  full_name: string;
  apartment: string;
  phone: string;
  role: string;
  created_at: string;
}

export default function AdminUsersPage() {
  const { profile, orgSettings } = useAuth();

  // Fetch organization business type directly to ensure correct terminology
  const { data: organization } = useQuery({
    queryKey: ['organization_users', profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, business_type')
        .eq('id', profile!.organization_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.organization_id,
  });

  const businessType = organization?.business_type || 'residential';
  const terminology: BusinessTerminology = getTerminology(businessType);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [roleChangeUser, setRoleChangeUser] = useState<UserProfile | null>(null);
  const [isRoleAlertOpen, setIsRoleAlertOpen] = useState(false);
  const [roleChanging, setRoleChanging] = useState(false);

  // Form state
  const [editForm, setEditForm] = useState({
    full_name: '',
    apartment: '',
    phone: '',
    role: 'user'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.organization_id) {
      fetchUsers();
    }
  }, [profile?.organization_id]);

  const fetchUsers = async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('memberships')
      .select(`
        id,
        user_id,
        role,
        phone,
        apartment,
        created_at,
        profiles (
          id,
          email,
          full_name
        )
      `)
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching memberships:', error);
    } else {
      console.log('data users....', data);
      const transformedUsers: UserProfile[] = (data || []).map((m: any) => ({
        id: m.profiles.id,
        user_id: m.user_id,
        membership_id: m.id,
        email: m.profiles.email,
        full_name: m.profiles.full_name,
        role: m.role,
        phone: m.phone,
        apartment: m.apartment,
        created_at: m.created_at
      }));
      setUsers(transformedUsers);
    }
    setLoading(false);
  };

  const handleToggleRole = async () => {
    if (!roleChangeUser || !profile?.organization_id) return;
    setRoleChanging(true);
    const newRole = roleChangeUser.role === 'admin' ? 'user' : 'admin';

    console.log('handleToggleRole', {
      membership_id: roleChangeUser.membership_id,
      user_id: roleChangeUser.user_id,
      id: roleChangeUser.id,
      org_id: profile.organization_id,
      newRole
    });

    const { error: membershipsError } = await supabase
      .from('memberships')
      .update({ role: newRole })
      .eq('id', roleChangeUser.membership_id);

    if (membershipsError) {
      console.error('Error updating memberships:', membershipsError);
      toast.error('Error al actualizar membresía: ' + membershipsError.message);
      setRoleChanging(false);
      return;
    }

    const { error: profilesError } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', roleChangeUser.id);

    if (profilesError) {
      console.error('Error updating profile:', profilesError);
      toast.error('Error al actualizar perfil: ' + profilesError.message);
      setRoleChanging(false);
      return;
    }

    await fetchUsers();
    setRoleChanging(false);
    setIsRoleAlertOpen(false);
    setRoleChangeUser(null);
  };

  const handleDeleteUser = async () => {
    if (!deletingUser || !profile?.organization_id) return;

    const deleteQuery = supabase.from('memberships').delete();
    if (deletingUser.membership_id) {
      deleteQuery.eq('id', deletingUser.membership_id);
    } else {
      deleteQuery.eq('user_id', deletingUser.id).eq('organization_id', profile.organization_id);
    }
    await deleteQuery;

    fetchUsers();
    setIsDeleteAlertOpen(false);
    setDeletingUser(null);
  };

  const openEditModal = (user: UserProfile) => {
    setEditingUser(user);
    setEditForm({
      full_name: user.full_name || '',
      apartment: user.apartment || '',
      phone: user.phone || '',
      role: user.role || 'user'
    });
    setIsEditModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleSaveEdit = async () => {
    if (!editingUser || !profile?.organization_id) return;
    setIsSubmitting(true);

    const editQuery = supabase.from('memberships').update({
      role: editForm.role,
      apartment: editForm.apartment,
      phone: editForm.phone
    });
    if (editingUser.membership_id) {
      editQuery.eq('id', editingUser.membership_id);
    } else {
      editQuery.eq('user_id', editingUser.id).eq('organization_id', profile.organization_id);
    }
    const { error } = await editQuery;

    if (!error) {
      const profileUpdates: Record<string, string> = {};
      if (editForm.full_name !== editingUser.full_name) {
        profileUpdates.full_name = editForm.full_name;
      }
      if (editForm.role !== editingUser.role) {
        profileUpdates.role = editForm.role;
      }
      if (Object.keys(profileUpdates).length > 0) {
        await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', editingUser.id);
      }
    }

    if (!error) {
      fetchUsers();
      setIsEditModalOpen(false);
      setEditingUser(null);
    } else {
      console.error('Error updating user:', error);
    }
    setIsSubmitting(false);
  };

  const confirmDelete = (user: UserProfile) => {
    setDeletingUser(user);
    setIsDeleteAlertOpen(true);
    setOpenDropdownId(null);
  };

  const confirmRoleChange = (user: UserProfile) => {
    setRoleChangeUser(user);
    setIsRoleAlertOpen(true);
    setOpenDropdownId(null);
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (businessType === 'residential' && user.apartment?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-primary to-primary/70 rounded-2xl shadow-lg shadow-primary/25 ring-1 ring-white/20">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Gestión de {terminology.userLabel}s</h1>
            <p className="text-gray-500 text-sm">Administra los permisos y perfiles de los {terminology.userLabel.toLowerCase()}s.</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder={`Buscar por nombre, ${businessType === 'residential' ? terminology.unitLabel.toLowerCase() + ', ' : ''}email...`}
          className="pl-10 h-10 rounded-xl text-sm bg-white border-gray-200/80 shadow-sm focus:border-primary/30 focus:ring-2 focus:ring-primary/10 transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-2xl border border-gray-100/80 shadow-sm overflow-visible">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-6 py-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Usuario</th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Contacto</th>
              {businessType === 'residential' && <th className="px-6 py-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{terminology.unitLabel}</th>}
              <th className="px-6 py-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rol</th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={5} className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gray-100" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 bg-gray-100 rounded-full w-48" />
                        <div className="h-3 bg-gray-50 rounded-full w-32" />
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="w-8 h-8 text-gray-200" />
                    <p className="text-sm text-gray-400 font-medium">No se encontraron {terminology.userLabel.toLowerCase()}s.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 leading-tight">{user.full_name}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5 font-mono">ID: {user.id.substring(0, 8)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-gray-600 text-xs">
                        <Mail className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                        <span className="truncate max-w-[200px]">{user.email}</span>
                      </div>
                      {user.phone && (
                        <a href={`tel:${user.phone.replace(/[^0-9+]/g, '')}`}
                          className="flex items-center gap-1.5 mt-1 text-xs text-gray-400 hover:text-primary transition-colors">
                          <Smartphone className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                          <span>{user.phone}</span>
                        </a>
                      )}
                    </td>
                    {businessType === 'residential' && (
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-gray-700 text-xs font-medium">
                          <MapPin className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                          <span>{terminology.unitLabel} {user.apartment || <span className="text-gray-300 italic">N/A</span>}</span>
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
                        user.role === 'admin'
                          ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-200/60'
                          : 'bg-blue-50 text-blue-700 ring-1 ring-blue-200/60'
                      )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", user.role === 'admin' ? 'bg-purple-500' : 'bg-blue-500')} />
                        {user.role === 'admin' ? 'Admin' : 'Usuario'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end">
                        {user.id !== orgSettings?.guest_user_id ? (
                          <DropdownMenu
                            trigger={
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                                onClick={() => setOpenDropdownId(openDropdownId === user.id ? null : user.id)}
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            }
                          >
                            <DropdownMenuItem onClick={() => openEditModal(user)}>
                              <Pencil className="h-4 w-4" />
                              Editar {terminology.userLabel.toLowerCase()}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => confirmRoleChange(user)}>
                              {user.role === 'admin' ? (
                                <><ShieldOff className="h-4 w-4" /> Quitar admin</>
                              ) : (
                                <><Shield className="h-4 w-4" /> Hacer admin</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => confirmDelete(user)} variant="destructive">
                              <Trash2 className="h-4 w-4" />
                              Eliminar {terminology.userLabel.toLowerCase()}
                            </DropdownMenuItem>
                          </DropdownMenu>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-gray-400 bg-gray-50 rounded-lg uppercase tracking-wide">Sin Acciones</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100/80 p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 bg-gray-100 rounded-full w-40" />
                  <div className="h-3 bg-gray-50 rounded-full w-28" />
                </div>
              </div>
            </div>
          ))
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100/80 p-12 text-center">
            <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400 font-medium">No se encontraron {terminology.userLabel.toLowerCase()}s.</p>
          </div>
        ) : (
          filteredUsers.map((user) => (
              <div key={user.id} className="bg-white rounded-2xl border border-gray-100/80 shadow-sm overflow-hidden transition-all hover:shadow-md active:scale-[0.99]">
                <div className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 truncate text-sm">{user.full_name}</h3>
                          <span className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase shrink-0",
                            user.role === 'admin'
                              ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-200/60'
                              : 'bg-blue-50 text-blue-700 ring-1 ring-blue-200/60'
                          )}>
                            <span className={cn("w-1 h-1 rounded-full", user.role === 'admin' ? 'bg-purple-500' : 'bg-blue-500')} />
                            {user.role === 'admin' ? 'Admin' : 'User'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{user.email}</p>
                      </div>
                    </div>
                    {user.id !== orgSettings?.guest_user_id ? (
                      <DropdownMenu
                        trigger={
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl shrink-0"
                            onClick={() => setOpenDropdownId(openDropdownId === user.id ? null : user.id)}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        }
                      >
                        <DropdownMenuItem onClick={() => openEditModal(user)}>
                          <Pencil className="h-4 w-4" />
                          Editar {terminology.userLabel.toLowerCase()}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => confirmRoleChange(user)}>
                          {user.role === 'admin' ? (
                            <><ShieldOff className="h-4 w-4" /> Quitar admin</>
                          ) : (
                            <><Shield className="h-4 w-4" /> Hacer admin</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => confirmDelete(user)} variant="destructive">
                          <Trash2 className="h-4 w-4" />
                          Eliminar {terminology.userLabel.toLowerCase()}
                        </DropdownMenuItem>
                      </DropdownMenu>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-300 uppercase shrink-0">—</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50">
                    {user.phone && (
                      <a href={`tel:${user.phone.replace(/[^0-9+]/g, '')}`}
                        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary transition-colors">
                        <Smartphone className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                        <span>{user.phone}</span>
                      </a>
                    )}
                    {businessType === 'residential' && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                        <span>{terminology.unitLabel} {user.apartment || '—'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
          ))
        )}
      </div>

      {/* Edit User Modal */}
      <Modal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        title="Editar Usuario"
        size="md"
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="editName" className="text-sm font-medium text-gray-700">
              Nombre completo
            </Label>
            <Input
              id="editName"
              value={editForm.full_name}
              onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
              placeholder="Nombre del usuario"
              className="h-11 bg-gray-50 border-gray-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200"
            />
          </div>

          <div className={`grid ${businessType === 'residential' ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
            {businessType === 'residential' && (
              <div className="space-y-2">
                <Label htmlFor="editApartment" className="text-sm font-medium text-gray-700">
                  {terminology.unitLabel}
                </Label>
                <Input
                  id="editApartment"
                  value={editForm.apartment}
                  onChange={e => setEditForm({ ...editForm, apartment: e.target.value })}
                  placeholder={terminology.unitPlaceholder}
                  className="h-11 bg-gray-50 border-gray-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="editPhone" className="text-sm font-medium text-gray-700">
                Teléfono
              </Label>
              <Input
                id="editPhone"
                value={editForm.phone}
                onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="300 123 4567"
                className="h-11 bg-gray-50 border-gray-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Rol del usuario
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEditForm({ ...editForm, role: 'user' })}
                className={`
                  h-11 px-4 rounded-xl border-2 font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2
                  ${editForm.role === 'user'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                <User className="h-4 w-4" />
                {terminology.userLabel}
              </button>
              <button
                type="button"
                onClick={() => setEditForm({ ...editForm, role: 'admin' })}
                className={`
                  h-11 px-4 rounded-xl border-2 font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2
                  ${editForm.role === 'admin'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                <Shield className="h-4 w-4" />
                Administrador
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              className="flex-1 h-11 rounded-xl border-gray-200 font-medium hover:bg-gray-50"
            >
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={isSubmitting}
              className="flex-1 h-11 rounded-xl font-medium bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 text-primary-foreground transition-all duration-200"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar cambios
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Role Change Confirmation */}
      <AlertDialog
        open={isRoleAlertOpen}
        onOpenChange={setIsRoleAlertOpen}
        title={roleChangeUser?.role === 'admin' ? 'Quitar permisos de admin' : 'Conceder permisos de admin'}
        description={`¿Estás seguro de que quieres ${roleChangeUser?.role === 'admin' ? 'quitar los permisos de administrador' : 'hacer administrador'} a ${roleChangeUser?.full_name}?`}
        confirmText={roleChangeUser?.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}
        onConfirm={handleToggleRole}
        loading={roleChanging}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={isDeleteAlertOpen}
        onOpenChange={setIsDeleteAlertOpen}
        title={`Eliminar ${terminology.userLabel.toLowerCase()}`}
        description={`¿Estás seguro de que quieres eliminar a ${deletingUser?.full_name}? Esta acción no se puede deshacer y se eliminarán todos sus datos y ${terminology.reservationLabel.toLowerCase()}s.`}
        confirmText={`Eliminar ${terminology.userLabel.toLowerCase()}`}
        onConfirm={handleDeleteUser}
        variant="destructive"
      />
    </div>
  );
}
