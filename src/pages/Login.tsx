import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Flame, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getApiBaseUrl } from '@/lib/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiUrl, setApiUrl] = useState(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('api_base_url') || '';
  });
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const isPreviewEnvironment =
    typeof window !== 'undefined' &&
    (window.location.hostname.includes('lovableproject.com') ||
      window.location.hostname.includes('lovable.app') ||
      window.location.hostname.includes('localhost'));

  const handleSaveApiUrl = () => {
    const normalized = apiUrl.trim().replace(/\/$/, '');
    if (!normalized) {
      localStorage.removeItem('api_base_url');
      toast({
        title: 'API removida',
        description: 'Voltando para /api (proxy do Nginx). Recarregando...',
      });
      window.location.reload();
      return;
    }

    if (!/^https?:\/\//i.test(normalized) && !normalized.startsWith('/')) {
      toast({
        title: 'URL inválida',
        description: 'Use algo como https://seu-dominio.com/api',
        variant: 'destructive',
      });
      return;
    }

    localStorage.setItem('api_base_url', normalized);
    toast({
      title: 'API salva',
      description: 'Recarregando para aplicar a configuração...',
    });
    window.location.reload();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: 'Erro',
        description: 'Preencha o email',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    const result = await login(email, password);
    setIsLoading(false);

    if (result.error) {
      toast({
        title: 'Erro ao entrar',
        description: result.error,
        variant: 'destructive',
      });
    } else if (result.mustChangePassword) {
      navigate('/change-password');
    } else {
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

          <h1 className="text-xl font-semibold text-center text-foreground mb-6">
            Entrar na sua conta
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-secondary border-border/50 focus:border-primary"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-secondary border-border/50 focus:border-primary"
                disabled={isLoading}
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
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>

          {isPreviewEnvironment && (
            <div className="mt-6 space-y-3 rounded-lg border border-border/50 bg-secondary/40 p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Configurar API (preview)</p>
                <p className="text-xs text-muted-foreground">
                  No ambiente de preview, informe a URL pública do seu backend (ex:
                  {' '}
                  <span className="font-mono">https://seu-dominio.com/api</span>).
                </p>
                <p className="text-xs text-muted-foreground">
                  Atual: <span className="font-mono">{getApiBaseUrl()}</span>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiUrl">URL da API</Label>
                <Input
                  id="apiUrl"
                  placeholder="https://seu-dominio.com/api"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  className="bg-secondary border-border/50 focus:border-primary"
                  disabled={isLoading}
                />
              </div>

              <Button type="button" className="w-full" onClick={handleSaveApiUrl} disabled={isLoading}>
                Salvar e recarregar
              </Button>
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground mt-6">
            Contate o administrador para obter acesso.
          </p>
        </div>
      </div>
    </div>
  );
}
