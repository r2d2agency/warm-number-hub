import { MessageSquare, Flame, Settings, LogOut, Shield } from "lucide-react";
import { Button } from "./ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api, Branding } from "@/lib/api";

export function Header() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [branding, setBranding] = useState<Branding>({
    appName: 'WhatsApp Warmer',
    appSubtitle: 'Sistema de Aquecimento',
    primaryColor: '#22c55e',
    logoUrl: null,
  });

  useEffect(() => {
    api.getBranding().then(({ data }) => {
      if (data) setBranding(data);
    });
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="glass-card border-b border-border/30 px-4 md:px-6 py-3 md:py-4 sticky top-0 z-50">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="relative">
            {branding.logoUrl ? (
              <img 
                src={branding.logoUrl} 
                alt={branding.appName} 
                className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl object-contain"
              />
            ) : (
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-primary/20 flex items-center justify-center glow-effect">
                <Flame className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              </div>
            )}
          </div>
          <div>
            <h1 className="text-sm md:text-lg font-bold text-foreground">{branding.appName}</h1>
            <p className="text-[10px] md:text-xs text-muted-foreground">{branding.appSubtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-3">
          {user && (
            <span className="text-xs md:text-sm text-muted-foreground hidden sm:block">
              {user.email}
            </span>
          )}
          {isAdmin && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-muted-foreground hover:text-primary h-8 w-8 md:h-10 md:w-10"
              onClick={() => navigate('/admin')}
              title="Administração"
            >
              <Shield className="w-4 h-4 md:w-5 md:h-5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-8 w-8 md:h-10 md:w-10">
            <MessageSquare className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-8 w-8 md:h-10 md:w-10">
            <Settings className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-muted-foreground hover:text-destructive h-8 w-8 md:h-10 md:w-10"
            onClick={handleLogout}
            title="Sair"
          >
            <LogOut className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
