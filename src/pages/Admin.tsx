import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api, AdminUser, AppRole, Branding } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Key, Trash2, Shield, Users, ArrowLeft, Palette, Image, Save } from 'lucide-react';

export default function Admin() {
  const { isAdmin, isSuperAdmin, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Create user form
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<AppRole>('user');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Reset password form
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  // Branding
  const [branding, setBranding] = useState<Branding>({
    appName: 'WhatsApp Warmer',
    appSubtitle: 'Sistema de Aquecimento',
    primaryColor: '#22c55e',
    logoUrl: null,
  });
  const [isSavingBranding, setIsSavingBranding] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    loadUsers();
    loadBranding();
  }, [isAdmin, navigate]);

  const loadBranding = async () => {
    const { data } = await api.getBranding();
    if (data) {
      setBranding(data);
    }
  };

  const loadUsers = async () => {
    setIsLoading(true);
    const { data, error } = await api.getUsers();
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Erro',
        description: error,
        variant: 'destructive',
      });
      return;
    }

    if (data) {
      setUsers(data);
    }
  };

  const handleCreateUser = async () => {
    if (!newEmail.trim()) {
      toast({
        title: 'Erro',
        description: 'Email é obrigatório',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    const { data, error } = await api.createUser(
      newEmail.trim(),
      newPassword || undefined,
      newRole
    );
    setIsCreating(false);

    if (error) {
      toast({
        title: 'Erro ao criar usuário',
        description: error,
        variant: 'destructive',
      });
      return;
    }

    if (data) {
      setUsers((prev) => [data, ...prev]);
      setNewEmail('');
      setNewPassword('');
      setNewRole('user');
      setCreateDialogOpen(false);
      toast({
        title: 'Usuário criado',
        description: newPassword
          ? 'Usuário criado com a senha definida.'
          : 'Usuário criado. Ele deverá definir a senha no primeiro login.',
      });
    }
  };

  const handleResetPassword = async () => {
    if (!resetUserId) return;

    const { error } = await api.resetUserPassword(resetUserId, resetPassword || undefined);

    if (error) {
      toast({
        title: 'Erro ao resetar senha',
        description: error,
        variant: 'destructive',
      });
      return;
    }

    setResetUserId(null);
    setResetPassword('');
    setResetDialogOpen(false);
    loadUsers();
    toast({
      title: 'Senha resetada',
      description: resetPassword
        ? 'Nova senha definida.'
        : 'Senha removida. Usuário deverá definir no próximo login.',
    });
  };

  const handleUpdateRole = async (userId: string, role: AppRole) => {
    const { error } = await api.updateUserRole(userId, role);

    if (error) {
      toast({
        title: 'Erro ao atualizar role',
        description: error,
        variant: 'destructive',
      });
      return;
    }

    loadUsers();
    toast({
      title: 'Role atualizada',
    });
  };

  const handleDeleteUser = async (userId: string) => {
    const { error } = await api.deleteUser(userId);

    if (error) {
      toast({
        title: 'Erro ao deletar usuário',
        description: error,
        variant: 'destructive',
      });
      return;
    }

    setUsers((prev) => prev.filter((u) => u.id !== userId));
    toast({
      title: 'Usuário deletado',
    });
  };

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case 'superadmin':
        return 'destructive';
      case 'admin':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const handleSaveBranding = async () => {
    setIsSavingBranding(true);
    const { data, error } = await api.updateBranding(branding);
    setIsSavingBranding(false);

    if (error) {
      toast({
        title: 'Erro ao salvar branding',
        description: error,
        variant: 'destructive',
      });
      return;
    }

    if (data) {
      setBranding(data);
      toast({
        title: 'Branding atualizado',
        description: 'As alterações foram salvas. Recarregue a página para ver as mudanças.',
      });
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Painel de Administração
            </h1>
            <p className="text-muted-foreground">Gerencie usuários e permissões</p>
          </div>
        </div>

        {/* Branding Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Branding
            </CardTitle>
            <CardDescription>Personalize a aparência do sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="appName">Nome do App</Label>
                <Input
                  id="appName"
                  value={branding.appName}
                  onChange={(e) => setBranding({ ...branding, appName: e.target.value })}
                  placeholder="WhatsApp Warmer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="appSubtitle">Subtítulo</Label>
                <Input
                  id="appSubtitle"
                  value={branding.appSubtitle}
                  onChange={(e) => setBranding({ ...branding, appSubtitle: e.target.value })}
                  placeholder="Sistema de Aquecimento"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logoUrl" className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  URL do Logo
                </Label>
                <Input
                  id="logoUrl"
                  value={branding.logoUrl || ''}
                  onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value || null })}
                  placeholder="https://exemplo.com/logo.png"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Cor Primária</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={branding.primaryColor}
                    onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                    className="w-14 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={branding.primaryColor}
                    onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                    placeholder="#22c55e"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={handleSaveBranding} disabled={isSavingBranding}>
                {isSavingBranding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Salvar Branding
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Usuários
              </CardTitle>
              <CardDescription>{users.length} usuário(s) cadastrado(s)</CardDescription>
            </div>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Usuário
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Usuário</DialogTitle>
                  <DialogDescription>
                    Deixe a senha em branco para forçar o usuário a definir no primeiro login.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newEmail">Email *</Label>
                    <Input
                      id="newEmail"
                      type="email"
                      placeholder="usuario@email.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Senha (opcional)</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="Deixe em branco para o usuário definir"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Permissão</Label>
                    <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Usuário</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        {isSuperAdmin && <SelectItem value="superadmin">Super Admin</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateUser} disabled={isCreating}>
                    {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Criar Usuário
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum usuário encontrado</p>
            ) : (
              <div className="space-y-3">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border/50"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{u.email}</span>
                        {u.id === user?.id && (
                          <Badge variant="outline" className="text-xs">
                            Você
                          </Badge>
                        )}
                        {u.must_change_password && (
                          <Badge variant="outline" className="text-xs text-orange-500 border-orange-500">
                            Deve trocar senha
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {(Array.isArray(u.roles) ? u.roles : [u.roles || 'user']).map((role) => (
                          <Badge key={role} variant={getRoleBadgeVariant(role)}>
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Role selector */}
                      {u.id !== user?.id && (
                        <Select
                          value={(Array.isArray(u.roles) ? u.roles[0] : u.roles) || 'user'}
                          onValueChange={(v) => handleUpdateRole(u.id, v as AppRole)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">Usuário</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            {isSuperAdmin && <SelectItem value="superadmin">Super Admin</SelectItem>}
                          </SelectContent>
                        </Select>
                      )}

                      {/* Reset password */}
                      <Dialog
                        open={resetDialogOpen && resetUserId === u.id}
                        onOpenChange={(open) => {
                          setResetDialogOpen(open);
                          if (!open) {
                            setResetUserId(null);
                            setResetPassword('');
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setResetUserId(u.id)}
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Resetar Senha</DialogTitle>
                            <DialogDescription>
                              Deixe em branco para remover a senha e forçar o usuário a definir uma nova.
                            </DialogDescription>
                          </DialogHeader>

                          <div className="space-y-2">
                            <Label>Nova Senha (opcional)</Label>
                            <Input
                              type="password"
                              placeholder="Nova senha"
                              value={resetPassword}
                              onChange={(e) => setResetPassword(e.target.value)}
                            />
                          </div>

                          <DialogFooter>
                            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
                              Cancelar
                            </Button>
                            <Button onClick={handleResetPassword}>Resetar Senha</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      {/* Delete user */}
                      {u.id !== user?.id && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Deletar usuário?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O usuário {u.email} será removido
                                permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteUser(u.id)}>
                                Deletar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
