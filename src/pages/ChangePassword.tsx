import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Flame, Loader2, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ChangePassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { changePassword, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast({
        title: 'Erro',
        description: 'Senha deve ter pelo menos 6 caracteres',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Erro',
        description: 'As senhas não coincidem',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    const { error } = await changePassword(newPassword);
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Erro ao alterar senha',
        description: error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Senha alterada',
        description: 'Sua senha foi alterada com sucesso.',
      });
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="glass-card p-8">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="p-2 rounded-lg bg-primary/20">
              <Flame className="w-8 h-8 text-primary" />
            </div>
            <span className="text-2xl font-bold text-foreground">WhatsApp Warmer</span>
          </div>

          <div className="flex items-center justify-center gap-2 mb-6">
            <Lock className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-semibold text-foreground">Defina sua nova senha</h1>
          </div>

          <p className="text-center text-muted-foreground mb-6">
            Por segurança, você precisa definir uma senha antes de continuar.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-secondary border-border/50 focus:border-primary"
                disabled={isLoading}
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-secondary border-border/50 focus:border-primary"
                disabled={isLoading}
                minLength={6}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Senha'
              )}
            </Button>
          </form>

          <Button
            variant="ghost"
            className="w-full mt-4 text-muted-foreground"
            onClick={logout}
          >
            Sair
          </Button>
        </div>
      </div>
    </div>
  );
}
