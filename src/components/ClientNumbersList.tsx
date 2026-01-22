import { useState } from "react";
import { ClientNumber } from "@/types/warming";
import { Users, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";

interface ClientNumbersListProps {
  numbers: ClientNumber[];
  onAddNumber: (phoneNumber: string, name?: string) => void;
  onDeleteNumber: (id: string) => void;
  onImportNumbers: (numbers: { phoneNumber: string; name?: string }[]) => void;
}

export function ClientNumbersList({ numbers, onAddNumber, onDeleteNumber, onImportNumbers }: ClientNumbersListProps) {
  const [newNumber, setNewNumber] = useState("");
  const [newName, setNewName] = useState("");

  const handleAdd = () => {
    if (newNumber.trim()) {
      onAddNumber(newNumber.trim(), newName.trim() || undefined);
      setNewNumber("");
      setNewName("");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        const parsedNumbers = lines.map(line => {
          const [phoneNumber, name] = line.split(',').map(s => s.trim());
          return { phoneNumber, name };
        });
        onImportNumbers(parsedNumbers);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="glass-card p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Números dos Clientes ({numbers.length})</h3>
        </div>
        <label className="cursor-pointer">
          <input
            type="file"
            accept=".txt,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button variant="outline" size="sm" className="border-border/50" asChild>
            <span>
              <Upload className="w-4 h-4 mr-2" />
              Importar
            </span>
          </Button>
        </label>
      </div>

      <div className="flex gap-2 mb-4">
        <Input
          value={newNumber}
          onChange={(e) => setNewNumber(e.target.value)}
          placeholder="Número (5511999999999)"
          className="bg-secondary border-border/50 focus:border-primary flex-1"
        />
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nome (opcional)"
          className="bg-secondary border-border/50 focus:border-primary w-32"
        />
        <Button onClick={handleAdd} size="icon" className="bg-primary hover:bg-primary/90 shrink-0">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="h-48">
        <div className="space-y-2">
          {numbers.map((client) => (
            <div
              key={client.id}
              className="group flex items-center justify-between bg-secondary/30 rounded-lg px-3 py-2 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs text-primary font-medium">
                    {client.name ? client.name.charAt(0).toUpperCase() : '#'}
                  </span>
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm text-foreground truncate">{client.phoneNumber}</p>
                  {client.name && (
                    <p className="text-xs text-muted-foreground truncate">{client.name}</p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDeleteNumber(client.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {numbers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum número cadastrado</p>
              <p className="text-xs mt-1">Adicione números ou importe de um arquivo</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
