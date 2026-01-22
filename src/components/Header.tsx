import { MessageSquare, Flame, Settings } from "lucide-react";
import { Button } from "./ui/button";

export function Header() {
  return (
    <header className="glass-card border-b border-border/30 px-6 py-4 sticky top-0 z-50">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center glow-effect">
              <Flame className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">WhatsApp Warmer</h1>
            <p className="text-xs text-muted-foreground">Sistema de Aquecimento</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <MessageSquare className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
