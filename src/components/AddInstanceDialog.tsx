import { useState, useEffect } from "react";
import { Instance } from "@/types/warming";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Plus, Server, Globe } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface AddInstanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (instance: Omit<Instance, 'id' | 'status'>) => void;
  editingInstance?: Instance | null;
}

export function AddInstanceDialog({ open, onOpenChange, onAdd, editingInstance }: AddInstanceDialogProps) {
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes('admin') || user?.roles?.includes('superadmin');
  
  const [name, setName] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [isGlobal, setIsGlobal] = useState(false);

  useEffect(() => {
    if (editingInstance) {
      setName(editingInstance.name);
      setApiUrl(editingInstance.apiUrl);
      setApiKey(editingInstance.apiKey);
      setPhoneNumber(editingInstance.phoneNumber || "");
      setIsPrimary(editingInstance.isPrimary || false);
      setIsGlobal(editingInstance.isGlobal || false);
    } else {
      setName("");
      setApiUrl("");
      setApiKey("");
      setPhoneNumber("");
      setIsPrimary(false);
      setIsGlobal(false);
    }
  }, [editingInstance, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({ name, apiUrl, apiKey, phoneNumber, isPrimary, isGlobal: isAdmin ? isGlobal : false });
    onOpenChange(false);
  };

  // Check if editing a global instance that user doesn't own
  const isReadOnly = editingInstance?.isGlobal && !editingInstance?.isOwner && !isAdmin;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-border/50 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Server className="w-5 h-5 text-primary" />
            {editingInstance ? "Editar Instância" : "Nova Instância Evolution"}
          </DialogTitle>
          <DialogDescription>
            Configure a conexão com sua Evolution API. Defina como principal para usar como número de aquecimento.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm text-muted-foreground">
              Nome da Instância
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Instância A"
              className="bg-secondary border-border/50 focus:border-primary"
              required
              disabled={isReadOnly}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiUrl" className="text-sm text-muted-foreground">
              URL da API Evolution
            </Label>
            <Input
              id="apiUrl"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://api.evolution.com"
              className="bg-secondary border-border/50 focus:border-primary"
              required
              disabled={isReadOnly}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey" className="text-sm text-muted-foreground">
              API Key
            </Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Sua chave de API"
              className="bg-secondary border-border/50 focus:border-primary"
              required
              disabled={isReadOnly}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber" className="text-sm text-muted-foreground">
              Número do WhatsApp
            </Label>
            <Input
              id="phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="5511999999999"
              className="bg-secondary border-border/50 focus:border-primary"
              disabled={isReadOnly}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isPrimary"
              checked={isPrimary}
              onCheckedChange={(checked) => setIsPrimary(checked === true)}
              disabled={isReadOnly}
            />
            <Label htmlFor="isPrimary" className="text-sm text-muted-foreground cursor-pointer">
              Definir como instância principal (número de aquecimento)
            </Label>
          </div>

          {isAdmin && (
            <div className="flex items-center space-x-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Checkbox
                id="isGlobal"
                checked={isGlobal}
                onCheckedChange={(checked) => setIsGlobal(checked === true)}
              />
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                <Label htmlFor="isGlobal" className="text-sm text-foreground cursor-pointer">
                  Instância Global (visível para todos os usuários)
                </Label>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-border/50"
            >
              Cancelar
            </Button>
            {!isReadOnly && (
              <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                {editingInstance ? "Salvar" : "Adicionar"}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
