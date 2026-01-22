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
    <div className="glass-card p-4 animate-fade-in hover:border-primary/30 transition-all duration-300">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${config.bg} flex items-center justify-center`}>
            <StatusIcon className={`w-5 h-5 ${config.color}`} />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{instance.name}</h3>
            <p className="text-xs text-muted-foreground">{instance.phoneNumber || 'Sem número'}</p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground">
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
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          {config.label}
        </span>
      </div>

      <div className="mt-3 pt-3 border-t border-border/50">
        <p className="text-xs text-muted-foreground truncate">
          {instance.apiUrl}
        </p>
      </div>
    </div>
  );
}
