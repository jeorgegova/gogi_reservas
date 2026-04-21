import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  apartment: string;
  phone: string;
  role: string;
  created_at: string;
}

export default function AdminUsersPage() {
  const { profile, terminology } = useAuth();
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
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('full_name', { ascending: true });
    setUsers(data || []);
    setLoading(false);
  };

  const handleToggleRole = async () => {
    if (!roleChangeUser) return;
    const newRole = roleChangeUser.role === 'admin' ? 'user' : 'admin';
    
    await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', roleChangeUser.id)
      .eq('organization_id', profile?.organization_id);
    fetchUsers();
    setIsRoleAlertOpen(false);
    setRoleChangeUser(null);
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    
    await supabase
      .from('profiles')
      .delete()
      .eq('id', deletingUser.id)
      .eq('organization_id', profile?.organization_id);
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
    if (!editingUser) return;
    setIsSubmitting(true);
    
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editForm.full_name,
        apartment: editForm.apartment,
        phone: editForm.phone,
        role: editForm.role
      })
      .eq('id', editingUser.id)
      .eq('organization_id', profile?.organization_id);
    
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
    user.apartment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary rounded-xl shadow-lg shadow-primary/20">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Gestión de Usuarios</h1>
            <p className="text-gray-500 text-sm">Administra los permisos y perfiles de los {terminology.userLabel.toLowerCase()}s.</p>
          </div>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-white">
        <CardHeader className="p-4 bg-gray-50/50 border-b border-gray-100">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Buscar por nombre, apto..." 
              className="pl-10 h-9 rounded-lg text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-visible">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-50/30 border-b border-gray-100">
                  <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Usuario</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contacto</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{terminology.unitLabel}</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rol</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-6 py-4">
                        <div className="h-4 bg-gray-100 rounded-full w-full" />
                      </td>
                    </tr>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                       No se encontraron usuarios.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 leading-tight">{user.full_name}</div>
                            <div className="text-[10px] text-gray-400 uppercase mt-0.5">ID: {user.id.substring(0, 8)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-gray-600 font-medium">
                          <Mail className="w-3.5 h-3.5 text-gray-300" />
                          <span>{user.email}</span>
                        </div>
                        {user.phone && (
                          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-400">
                            <Smartphone className="w-3.5 h-3.5 text-gray-300" />
                            <span>{user.phone}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-gray-700 font-bold">
                           <MapPin className="w-3.5 h-3.5 text-gray-300" />
                           <span>{terminology.unitLabel} {user.apartment || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border uppercase",
                          user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'
                        )}>
                          {user.role}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end">
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
                              Editar usuario
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => confirmRoleChange(user)}>
                              {user.role === 'admin' ? (
                                <>
                                  <ShieldOff className="h-4 w-4" />
                                  Quitar admin
                                </>
                              ) : (
                                <>
                                  <Shield className="h-4 w-4" />
                                  Hacer admin
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => confirmDelete(user)} variant="destructive">
                              <Trash2 className="h-4 w-4" />
                              Eliminar usuario
                            </DropdownMenuItem>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden flex flex-col divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 animate-pulse">
                  <div className="h-16 bg-gray-100 rounded-xl w-full" />
                </div>
              ))
            ) : filteredUsers.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-400 text-sm">
                 No se encontraron usuarios.
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div key={user.id} className="p-4 bg-white hover:bg-gray-50 transition-colors flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        {user.full_name ? user.full_name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <h3 className="font-bold text-gray-900 truncate">{user.full_name}</h3>
                        <span className="text-xs text-gray-500 truncate">{user.email}</span>
                      </div>
                    </div>
                    
                    <DropdownMenu
                      trigger={
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-full shrink-0"
                          onClick={() => setOpenDropdownId(openDropdownId === user.id ? null : user.id)}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      }
                    >
                      <DropdownMenuItem onClick={() => openEditModal(user)}>
                        <Pencil className="h-4 w-4" />
                        Editar usuario
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => confirmRoleChange(user)}>
                        {user.role === 'admin' ? (
                          <>
                            <ShieldOff className="h-4 w-4" />
                            Quitar admin
                          </>
                        ) : (
                          <>
                            <Shield className="h-4 w-4" />
                            Hacer admin
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => confirmDelete(user)} variant="destructive">
                        <Trash2 className="h-4 w-4" />
                        Eliminar usuario
                      </DropdownMenuItem>
                    </DropdownMenu>
                  </div>
                  
                  <div className="flex items-center gap-3 mt-1">
                    <div className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border uppercase shrink-0",
                      user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'
                    )}>
                      {user.role}
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 truncate">
                        <Smartphone className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="truncate">{user.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-xs text-gray-700 font-bold ml-auto shrink-0">
                       <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                       <span>{terminology.unitLabel} {user.apartment || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

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

          <div className="grid grid-cols-2 gap-4">
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
                Usuario
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
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={isDeleteAlertOpen}
        onOpenChange={setIsDeleteAlertOpen}
        title="Eliminar usuario"
        description={`¿Estás seguro de que quieres eliminar a ${deletingUser?.full_name}? Esta acción no se puede deshacer y se eliminarán todos sus datos y reservas.`}
        confirmText="Eliminar usuario"
        onConfirm={handleDeleteUser}
        variant="destructive"
      />
    </div>
  );
}
