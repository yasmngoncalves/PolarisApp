
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useState, useEffect } from "react"
import { differenceInMinutes, parse, format as formatDate } from "date-fns"
import { ptBR } from "date-fns/locale"

interface SleepLoggerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { duration: number, quality: string }) => void;
  existingLog?: { duration: number, quality: string } | null;
  logDate?: Date;
}

export default function SleepLogger({ isOpen, onClose, onSave, existingLog, logDate = new Date() }: SleepLoggerProps) {
  const [sleepTime, setSleepTime] = useState('');
  const [wakeTime, setWakeTime] = useState('');
  const [quality, setQuality] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && existingLog) {
      // Cannot reverse-engineer start/end times from duration, so we don't set them.
      // User must re-enter if they want to change duration.
      setQuality(existingLog.quality);
      setSleepTime('');
      setWakeTime('');
    } else if (!isOpen) {
      setSleepTime('');
      setWakeTime('');
      setQuality(null);
    }
  }, [isOpen, existingLog]);


  const calculateDurationInHours = () => {
    if (!sleepTime || !wakeTime) return existingLog?.duration ?? null;

    let sleepDateTime = parse(sleepTime, 'HH:mm', new Date());
    let wakeDateTime = parse(wakeTime, 'HH:mm', new Date());

    if (wakeDateTime < sleepDateTime) {
      wakeDateTime.setDate(wakeDateTime.getDate() + 1);
    }
    
    const diffInMinutes = differenceInMinutes(wakeDateTime, sleepDateTime);
    return diffInMinutes / 60;
  }

  const handleSave = () => {
    const duration = calculateDurationInHours();
    if (duration === null || quality === null) return;
    
    onSave({ duration, quality: quality });
    onClose();
  }
  
  const getDurationString = () => {
      const duration = calculateDurationInHours();
      if(duration === null) return null;
      const hours = Math.floor(duration);
      const minutes = Math.round((duration - hours) * 60);
      return `${hours}h ${minutes}m`;
  }

  const title = existingLog ? 'Editar Registro de Sono' : 'Registre seu Sono';
  const description = `Registrando para ${formatDate(logDate, "d 'de' MMMM", { locale: ptBR })}`;


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
          <div>
            <Label>Duração</Label>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1">
                <Label htmlFor="sleep-time" className="text-xs text-muted-foreground">Hora que dormiu</Label>
                <Input
                  id="sleep-time"
                  type="time"
                  value={sleepTime}
                  onChange={(e) => setSleepTime(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="wake-time" className="text-xs text-muted-foreground">Hora que acordou</Label>
                <Input
                  id="wake-time"
                  type="time"
                  value={wakeTime}
                  onChange={(e) => setWakeTime(e.target.value)}
                />
              </div>
            </div>
             {(sleepTime && wakeTime) || existingLog?.duration ? (
                <p className="text-sm text-muted-foreground mt-2">Duração total: {getDurationString()}</p>
            ) : null}
            {existingLog && !sleepTime && (
                 <p className="text-xs text-muted-foreground mt-1">Deixe os horários em branco para manter a duração existente.</p>
            )}
          </div>
          <div>
            <Label>Qualidade</Label>
            <RadioGroup value={quality || ''} onValueChange={setQuality} className="flex gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ruim" id="poor" />
                <Label htmlFor="poor">Ruim</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="razoável" id="fair" />
                <Label htmlFor="fair">Razoável</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bom" id="good" />
                <Label htmlFor="good">Bom</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="excelente" id="excellent" />
                <Label htmlFor="excellent">Excelente</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={(!sleepTime && !wakeTime && !existingLog) || !quality}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

    