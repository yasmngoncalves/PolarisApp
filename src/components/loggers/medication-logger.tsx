
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
import { useState, useEffect } from "react"
import { Plus, Trash2, X } from "lucide-react"

interface Medication {
  name: string;
  dosage: string;
}

interface MedicationLoggerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (medications: Medication[]) => void;
}

export default function MedicationLogger({ isOpen, onClose, onSave }: MedicationLoggerProps) {
  const [medications, setMedications] = useState<Medication[]>([{ name: '', dosage: '' }]);
  
  useEffect(() => {
    // Reset form when dialog is opened for a new entry
    if (isOpen) {
      setMedications([{ name: '', dosage: '' }]);
    }
  }, [isOpen]);

  const handleMedicationChange = (index: number, field: keyof Medication, value: string) => {
    const newMeds = [...medications];
    newMeds[index][field] = value;
    setMedications(newMeds);
  }

  const addMedicationField = () => {
    setMedications([...medications, { name: '', dosage: '' }]);
  }
  
  const removeMedicationField = (index: number) => {
    const newMeds = medications.filter((_, i) => i !== index);
    setMedications(newMeds);
  }
  
  const handleSave = () => {
    const validMeds = medications.filter(med => med.name.trim() !== '' && med.dosage.trim() !== '');
    if (validMeds.length > 0) {
      onSave(validMeds);
      onClose();
    }
  }

  const canSave = medications.some(med => med.name.trim() !== '' && med.dosage.trim() !== '');


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastrar Medicação</DialogTitle>
          <DialogDescription>
            Adicione um ou mais medicamentos que você toma regularmente.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
          {medications.map((med, index) => (
             <div key={index} className="space-y-2 border-b pb-4">
                <Label>Medicamento #{index + 1}</Label>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label htmlFor={`med-name-${index}`} className="text-xs text-muted-foreground">Nome</Label>
                    <Input 
                      id={`med-name-${index}`} 
                      value={med.name} 
                      onChange={(e) => handleMedicationChange(index, 'name', e.target.value)} 
                      placeholder="Ex: Vitamina C" 
                    />
                  </div>
                  <div className="w-1/3">
                    <Label htmlFor={`med-dosage-${index}`} className="text-xs text-muted-foreground">Dosagem</Label>
                    <Input 
                      id={`med-dosage-${index}`} 
                      value={med.dosage} 
                      onChange={(e) => handleMedicationChange(index, 'dosage', e.target.value)} 
                      placeholder="Ex: 500mg" 
                    />
                  </div>
                  {medications.length > 1 && (
                    <Button size="icon" variant="destructive" onClick={() => removeMedicationField(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
          ))}
          <Button variant="outline" onClick={addMedicationField} className="mt-2">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar outro medicamento
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!canSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

    