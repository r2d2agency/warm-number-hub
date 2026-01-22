import { Instance } from "@/types/warming";
import { Wifi, WifiOff, Flame, MoreVertical, Trash2, Edit } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface InstanceCardProps {
  instance: Instance;
  onEdit: (instance: Instance) => void;
  onDelete: (id: string) => void;
}

export function InstanceCard({ instance, onEdit, onDelete }: InstanceCardProps) {
  const statusConfig = {
    connected: {
      icon: Wifi,
      color: "text-success",
      bg: "bg-success/10",
      label: "Conectado",
    },
    disconnected: {
      icon: WifiOff,
      color: "text-destructive",
      bg: "bg-destructive/10",
      label: "Desconectado",
    },
    warming: {
      icon: Flame,
      color: "text-warning",
      bg: "bg-warning/10",
      label: "Aquecendo",
    },
  };

  const config = statusConfig[instance.status];
  const StatusIcon = config.icon;

  return (
    <div className="glass-card p-3 md:p-4 animate-fade-in hover:border-primary/30 transition-all duration-300">
      <div className="flex items-center justify-between mb-2 md:mb-3">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
            <StatusIcon className={`w-4 h-4 md:w-5 md:h-5 ${config.color}`} />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground text-sm md:text-base truncate">{instance.name}</h3>
            <p className="text-[10px] md:text-xs text-muted-foreground truncate">{instance.phoneNumber || 'Sem número'}</p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground h-8 w-8">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-card">
            <DropdownMenuItem onClick={() => onEdit(instance)} className="cursor-pointer">
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDelete(instance.id)} 
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remover
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 md:gap-1.5 px-2 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium ${config.bg} ${config.color}`}>
          <span className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-current animate-pulse" />
          {config.label}
        </span>
      </div>

      <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-border/50">
        <p className="text-[10px] md:text-xs text-muted-foreground truncate">
          {instance.apiUrl}
        </p>
      </div>
    </div>
  );
}
