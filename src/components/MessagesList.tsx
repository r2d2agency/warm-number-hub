import { useState } from "react";
import { Message } from "@/types/warming";
import { MessageSquare, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";

interface MessagesListProps {
  messages: Message[];
  onAddMessage: (content: string) => void;
  onDeleteMessage: (id: string) => void;
  onImportMessages: (messages: string[]) => void;
}

export function MessagesList({ messages, onAddMessage, onDeleteMessage, onImportMessages }: MessagesListProps) {
  const [newMessage, setNewMessage] = useState("");

  const handleAdd = () => {
    if (newMessage.trim()) {
      onAddMessage(newMessage.trim());
      setNewMessage("");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        onImportMessages(lines);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="glass-card p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Mensagens ({messages.length}/100)</h3>
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
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Digite uma nova mensagem..."
          className="bg-secondary border-border/50 focus:border-primary"
          onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
        />
        <Button onClick={handleAdd} size="icon" className="bg-primary hover:bg-primary/90 shrink-0">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="h-64">
        <div className="space-y-2">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className="group flex items-center justify-between bg-secondary/30 rounded-lg px-3 py-2 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <span className="text-xs text-muted-foreground w-6 shrink-0">#{index + 1}</span>
                <p className="text-sm text-foreground truncate">{message.content}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDeleteMessage(message.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma mensagem cadastrada</p>
              <p className="text-xs mt-1">Adicione mensagens ou importe de um arquivo</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
