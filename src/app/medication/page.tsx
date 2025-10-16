
"use client"

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from '@/components/ui/button';
import { Plus, Pill, Trash2, Loader2 } from 'lucide-react';
import MedicationLogger from '@/components/loggers/medication-logger';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { Medication } from '@/models/medication';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


export default function MedicationPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isLoggerOpen, setIsLoggerOpen] = useState(false);

    const medicationsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return collection(firestore, 'users', user.uid, 'medications');
    }, [firestore, user]);

    const { data: medications, isLoading: isLoadingMeds } = useCollection<Medication>(medicationsQuery);

    const handleAddMedication = (newMeds: {name: string, dosage: string}[]) => {
        if (!user) return;
        const medsCollection = collection(firestore, 'users', user.uid, 'medications');
        const promises = newMeds.map(med => {
            const medData = {
                medicationName: med.name,
                dosage: med.dosage,
                userProfileId: user.uid,
            };
            return addDoc(medsCollection, medData).catch(error => {
                errorEmitter.emit(
                  'permission-error',
                  new FirestorePermissionError({
                    path: medsCollection.path,
                    operation: 'create',
                    requestResourceData: medData,
                  })
                )
            });
        });
        Promise.all(promises)
            .then(() => {
                toast({ title: 'Medicação adicionada!' });
            })
            .catch(e => {
                console.error(e);
                toast({ variant: 'destructive', title: 'Erro ao adicionar medicação.' });
            });
    }

    const handleRemoveMedication = (medId: string) => {
        if (!user) return;
        const medDocRef = doc(firestore, 'users', user.uid, 'medications', medId);
        deleteDoc(medDocRef)
            .then(() => {
                toast({ title: 'Medicação removida.' });
            })
            .catch(e => {
                console.error(e);
                 errorEmitter.emit(
                  'permission-error',
                  new FirestorePermissionError({
                    path: medDocRef.path,
                    operation: 'delete',
                  })
                )
                toast({ variant: 'destructive', title: 'Erro ao remover medicação.' });
            });
    }

  return (
    <div className="p-4 md:p-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold text-foreground">Sua Medicação</h1>
            <p className="text-muted-foreground">Gerencie seus medicamentos cadastrados.</p>
        </div>
        <Button onClick={() => setIsLoggerOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar Medicação
        </Button>
      </header>

      <Card>
        <CardContent className="p-6">
            {isLoadingMeds ? (
                 <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : medications && medications.length > 0 ? (
                <ul className="space-y-4">
                    {medications.map(med => (
                        <li key={med.id} className="flex items-center justify-between p-3 bg-background rounded-lg shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-accent">
                                    <Pill className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="font-semibold">{med.medicationName}</p>
                                    <p className="text-sm text-muted-foreground">Dosagem: {med.dosage}</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveMedication(med.id)}>
                                <Trash2 className="h-5 w-5 text-destructive" />
                            </Button>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="text-center py-12">
                    <Pill className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium">Nenhuma medicação cadastrada</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Adicione sua primeira medicação para começar a acompanhar.</p>
                    <Button className="mt-6" onClick={() => setIsLoggerOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Adicionar Medicação
                    </Button>
                </div>
            )}
        </CardContent>
      </Card>
      <MedicationLogger isOpen={isLoggerOpen} onClose={() => setIsLoggerOpen(false)} onSave={handleAddMedication} />
    </div>
  )
}
