
"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Smile, Frown, Meh, Angry, Leaf } from "lucide-react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export const moods = [
  { name: 'Feliz', icon: Smile, color: 'text-green-500' },
  { name: 'Triste', icon: Frown, color: 'text-blue-500' },
  { name: 'Neutro', icon: Meh, color: 'text-gray-500' },
  { name: 'Raiva', icon: Angry, color: 'text-red-500' },
  { name: 'Calmo', icon: Leaf, color: 'text-teal-500' },
];

interface MoodLoggerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { mood: string, intensity: number, notes: string }) => void;
  existingLog?: { mood: string, intensity: number, notes: string } | null;
  logDate?: Date;
}

export default function MoodLogger({ isOpen, onClose, onSave, existingLog, logDate = new Date() }: MoodLoggerProps) {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [intensity, setIntensity] = useState([5]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen && existingLog) {
      setSelectedMood(existingLog.mood);
      setIntensity([existingLog.intensity]);
      setNotes(existingLog.notes || '');
    } else if (!isOpen) {
      // Reset state when closing if it's not for editing
      setSelectedMood(null);
      setIntensity([5]);
      setNotes('');
    }
  }, [isOpen, existingLog]);
  
  const handleSave = () => {
    if (!selectedMood) return;
    onSave({ mood: selectedMood, intensity: intensity[0], notes });
    onClose();
  }

  const title = existingLog ? 'Editar Registro de Humor' : 'Como você está se sentindo?';
  const description = `Registrando para ${format(logDate, "d 'de' MMMM", { locale: ptBR })}`;


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="flex justify-around">
            {moods.map(mood => (
              <button
                key={mood.name}
                onClick={() => setSelectedMood(mood.name)}
                className={cn(
                  "flex flex-col items-center gap-2 p-2 rounded-lg transition-colors",
                  selectedMood === mood.name ? "bg-accent text-primary" : "text-muted-foreground hover:bg-accent/50"
                )}
              >
                <mood.icon className={cn("w-8 h-8", mood.color)} />
                <span className="text-xs font-medium">{mood.name}</span>
              </button>
            ))}
          </div>
          <div>
            <label htmlFor="intensity" className="text-sm font-medium">Intensidade: <span className="font-semibold w-6 text-center">{intensity[0]}</span></label>
            <Slider
              id="intensity"
              min={1}
              max={10}
              step={1}
              value={intensity}
              onValueChange={setIntensity}
              className="mt-2"
            />
          </div>
           <div>
            <label htmlFor="notes" className="text-sm font-medium">Notas (Opcional)</label>
            <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Algum pensamento para adicionar?" className="mt-2" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!selectedMood}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

    