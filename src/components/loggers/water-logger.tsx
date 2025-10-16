
"use client";

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Plus, Minus } from "lucide-react";
import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import { collection, doc, addDoc, serverTimestamp, Timestamp, writeBatch, query, where, getDocs, orderBy, limit, deleteDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { UserProfile } from '@/models/user-profile';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface WaterLoggerProps {
  isOpen: boolean;
  onClose: () => void;
  logDate: Date;
  embedded?: boolean;
}

function WaterLoggerContent({ logDate, onSave }: { logDate: Date, onSave?: () => void }) {
  const { user } = useUser();
  const { toast } = useToast();
  const firestore = useFirestore();
  const [waterIntake, setWaterIntake] = useState(0);

  const dayStartTimestamp = useMemo(() => {
    const date = new Date(logDate);
    date.setHours(0, 0, 0, 0);
    return Timestamp.fromDate(date);
  }, [logDate]);

  const dayEndTimestamp = useMemo(() => {
    const date = new Date(logDate);
    date.setHours(23, 59, 59, 999);
    return Timestamp.fromDate(date);
  }, [logDate]);

  const userProfileQuery = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileQuery);
  const waterGoal = userProfile?.waterGoal || 2000;

  const waterIntakeLogsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, 'users', user.uid, 'waterIntakeLogs'),
      where('loggedAt', '>=', dayStartTimestamp),
      where('loggedAt', '<=', dayEndTimestamp),
      orderBy('loggedAt', 'desc')
    );
  }, [firestore, user, dayStartTimestamp, dayEndTimestamp]);
  const { data: waterLogsToday } = useCollection(waterIntakeLogsQuery);

  useEffect(() => {
    if (waterLogsToday) {
      const total = waterLogsToday.reduce((sum: number, log: any) => sum + log.amount, 0);
      setWaterIntake(total);
    } else {
      setWaterIntake(0);
    }
  }, [waterLogsToday]);

  const waterProgress = (waterIntake / waterGoal) * 100;

  const handleAddWater = (amount: number) => {
    if (!user) return;
    const waterCollection = collection(firestore, 'users', user.uid, 'waterIntakeLogs');
    // Use current time for new logs to ensure correct ordering for deletion
    const logTimestamp = Timestamp.now(); 
    const waterData = {
      amount,
      userProfileId: user.uid,
      loggedAt: logTimestamp
    };
    addDoc(waterCollection, waterData).catch(error => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: waterCollection.path, operation: 'create', requestResourceData: waterData }));
    });
    if (onSave) onSave();
  }

  const handleRemoveLast = async () => {
    if (!user || !waterLogsToday || waterLogsToday.length === 0) return;
    
    // The query is already ordered by descending timestamp, so the first item is the last one added.
    const lastLog = waterLogsToday[0];
    
    const logDocRef = doc(firestore, 'users', user.uid, 'waterIntakeLogs', lastLog.id);

    try {
        await deleteDoc(logDocRef);
    } catch (error) {
        console.error('Error removing last water intake:', error);
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: logDocRef.path, operation: 'delete' }));
        toast({ variant: 'destructive', title: 'Erro ao remover registro.' });
    }
    if (onSave) onSave();
  };

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <div className="relative w-40 h-40">
        <svg className="w-full h-full" viewBox="0 0 36 36">
          <path
            className="text-gray-200 stroke-current dark:text-gray-700"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            strokeWidth="3"
          />
          <path
            className="text-primary stroke-current"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            strokeWidth="3"
            strokeDasharray={`${waterProgress}, 100`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-primary">{waterIntake}</span>
          <span className="text-sm text-muted-foreground">/ {waterGoal}ml</span>
        </div>
      </div>
      <p className="text-center text-sm text-muted-foreground">Você atingiu {Math.round(waterProgress)}% da sua meta.</p>
      <div className="flex gap-2 w-full">
        <Button variant="outline" className="flex-1" onClick={() => handleAddWater(250)}>
          <Plus className="w-4 h-4 mr-2" /> 250ml
        </Button>
        <Button variant="outline" className="flex-1" onClick={() => handleAddWater(500)}>
          <Plus className="w-4 h-4 mr-2" /> 500ml
        </Button>
      </div>
      {waterIntake > 0 && (
        <Button variant="link" size="sm" className="text-destructive" onClick={handleRemoveLast}>
          <Minus className="w-4 h-4 mr-2" /> Remover último
        </Button>
      )}
    </div>
  );
}


export default function WaterLogger({ isOpen, onClose, logDate, embedded = false }: WaterLoggerProps) {
  if (embedded) {
    return <WaterLoggerContent logDate={logDate} />;
  }

  const description = `Registrando para ${format(logDate, "d 'de' MMMM", { locale: ptBR })}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Consumo de Água</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <WaterLoggerContent logDate={logDate} onSave={onClose} />
        <DialogFooter>
          <Button onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
