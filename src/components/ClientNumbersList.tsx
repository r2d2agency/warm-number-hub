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
    <div className="glass-card p-4 md:p-5 animate-fade-in">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <Users className="w-5 h-5 text-primary shrink-0" />
          <h3 className="font-semibold text-foreground text-sm md:text-base truncate">Números dos Clientes ({numbers.length})</h3>
        </div>
        <label className="cursor-pointer shrink-0">
          <input
            type="file"
            accept=".txt,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button variant="outline" size="sm" className="border-border/50 text-xs md:text-sm" asChild>
            <span>
              <Upload className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Importar</span>
            </span>
          </Button>
        </label>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Input
          value={newNumber}
          onChange={(e) => setNewNumber(e.target.value)}
          placeholder="Número (5511999999999)"
          className="bg-secondary border-border/50 focus:border-primary text-sm"
        />
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome (opcional)"
            className="bg-secondary border-border/50 focus:border-primary flex-1 sm:w-28 text-sm"
          />
          <Button onClick={handleAdd} size="icon" className="bg-primary hover:bg-primary/90 shrink-0">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="h-40 md:h-48">
        <div className="space-y-2">
          {numbers.map((client) => (
            <div
              key={client.id}
              className="group flex items-center justify-between bg-secondary/30 rounded-lg px-2 md:px-3 py-2 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
                <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-[10px] md:text-xs text-primary font-medium">
                    {client.name ? client.name.charAt(0).toUpperCase() : '#'}
                  </span>
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs md:text-sm text-foreground truncate">{client.phoneNumber}</p>
                  {client.name && (
                    <p className="text-[10px] md:text-xs text-muted-foreground truncate">{client.name}</p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDeleteNumber(client.id)}
                className="opacity-100 md:opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0 h-8 w-8"
              >
                <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
              </Button>
            </div>
          ))}
          {numbers.length === 0 && (
            <div className="text-center py-6 md:py-8 text-muted-foreground">
              <Users className="w-8 h-8 md:w-10 md:h-10 mx-auto mb-2 opacity-50" />
              <p className="text-xs md:text-sm">Nenhum número cadastrado</p>
              <p className="text-[10px] md:text-xs mt-1">Adicione números ou importe de um arquivo</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
