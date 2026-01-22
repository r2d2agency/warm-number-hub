import { useState } from "react";
import { Instance } from "@/types/warming";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Plus, Server } from "lucide-react";

interface AddInstanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (instance: Omit<Instance, 'id' | 'status'>) => void;
  editingInstance?: Instance | null;
}

export function AddInstanceDialog({ open, onOpenChange, onAdd, editingInstance }: AddInstanceDialogProps) {
  const [name, setName] = useState(editingInstance?.name || "");
  const [apiUrl, setApiUrl] = useState(editingInstance?.apiUrl || "");
  const [apiKey, setApiKey] = useState(editingInstance?.apiKey || "");
  const [phoneNumber, setPhoneNumber] = useState(editingInstance?.phoneNumber || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({ name, apiUrl, apiKey, phoneNumber });
    setName("");
    setApiUrl("");
    setApiKey("");
    setPhoneNumber("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-border/50 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Server className="w-5 h-5 text-primary" />
            {editingInstance ? "Editar Instância" : "Nova Instância Evolution"}
          </DialogTitle>
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
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-border/50"
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              {editingInstance ? "Salvar" : "Adicionar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
