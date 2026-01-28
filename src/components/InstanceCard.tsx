import { useState } from "react";
import { Instance } from "@/types/warming";
import { Wifi, WifiOff, Flame, MoreVertical, Trash2, Edit, RefreshCw, Star, Globe } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface InstanceCardProps {
  instance: Instance;
  onEdit: (instance: Instance) => void;
  onDelete: (id: string) => void;
  onStatusUpdate?: (id: string, status: Instance['status']) => void;
  onSetPrimary?: (instance: Instance) => void;
}

export function InstanceCard({ instance, onEdit, onDelete, onStatusUpdate, onSetPrimary }: InstanceCardProps) {
  const { user } = useAuth();
  const [checking, setChecking] = useState(false);
  
  const isAdmin = user?.roles?.includes('admin') || user?.roles?.includes('superadmin');
  const canEdit = instance.isOwner || isAdmin;
  const canDelete = instance.isOwner || isAdmin;

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

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      const { data, error } = await api.checkInstanceStatus(instance.id);
      if (error) {
        toast.error(error);
      } else if (data) {
        toast.success(data.message);
        onStatusUpdate?.(instance.id, data.status);
      }
    } catch {
      toast.error('Erro ao verificar status');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className={`glass-card p-3 md:p-4 animate-fade-in transition-all duration-300 ${instance.isPrimary ? 'border-primary/50 ring-1 ring-primary/20' : 'hover:border-primary/30'}`}>
      <div className="flex items-center justify-between mb-2 md:mb-3">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg ${instance.isPrimary ? 'bg-primary/20' : config.bg} flex items-center justify-center shrink-0 relative`}>
            {instance.isPrimary ? (
              <Star className="w-4 h-4 md:w-5 md:h-5 text-primary fill-primary" />
            ) : (
              <StatusIcon className={`w-4 h-4 md:w-5 md:h-5 ${config.color}`} />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground text-sm md:text-base truncate">{instance.name}</h3>
              {instance.isPrimary && (
                <span className="px-1.5 py-0.5 rounded text-[9px] md:text-[10px] font-medium bg-primary/20 text-primary">
                  PRINCIPAL
                </span>
              )}
              {instance.isGlobal && (
                <span className="px-1.5 py-0.5 rounded text-[9px] md:text-[10px] font-medium bg-blue-500/20 text-blue-500 flex items-center gap-1">
                  <Globe className="w-2.5 h-2.5" />
                  GLOBAL
                </span>
              )}
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground truncate">{instance.phoneNumber || 'Sem número'}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-muted-foreground h-8 w-8"
            onClick={handleCheckStatus}
            disabled={checking}
            title="Verificar status"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-card">
              {!instance.isPrimary && (
                <DropdownMenuItem onClick={() => onSetPrimary?.(instance)} className="cursor-pointer">
                  <Star className="w-4 h-4 mr-2" />
                  Definir como Principal
                </DropdownMenuItem>
              )}
              {instance.isPrimary && (
                <DropdownMenuItem disabled className="cursor-default text-primary">
                  <Star className="w-4 h-4 mr-2 fill-current" />
                  Instância Principal
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {canEdit && (
                <DropdownMenuItem onClick={() => onEdit(instance)} className="cursor-pointer">
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </DropdownMenuItem>
              )}
              {!canEdit && (
                <DropdownMenuItem onClick={() => onEdit(instance)} className="cursor-pointer">
                  <Edit className="w-4 h-4 mr-2" />
                  Visualizar
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem 
                  onClick={() => onDelete(instance.id)} 
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remover
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 md:gap-1.5 px-2 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium ${config.bg} ${config.color}`}>
          <span className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-current animate-pulse" />
          {config.label}
        </span>
      </div>

      {/* Stats for primary instance */}
      {instance.isPrimary && (
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border/50">
          <div className="bg-secondary/50 rounded-lg p-2">
            <p className="text-[10px] text-muted-foreground">Recebidas</p>
            <p className="text-lg font-bold text-foreground">{instance.messagesReceived || 0}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-2">
            <p className="text-[10px] text-muted-foreground">Enviadas</p>
            <p className="text-lg font-bold text-foreground">{instance.messagesSent || 0}</p>
          </div>
        </div>
      )}

      <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-border/50">
        <p className="text-[10px] md:text-xs text-muted-foreground truncate">
          {instance.apiUrl}
        </p>
      </div>
    </div>
  );
}
