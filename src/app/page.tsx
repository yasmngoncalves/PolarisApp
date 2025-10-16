
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Check, Droplet, Pill, Bed, Smile, Plus, CheckSquare, Square, Edit } from "lucide-react";
import MoodLogger from '@/components/loggers/mood-logger';
import SleepLogger from '@/components/loggers/sleep-logger';
import WaterLogger from '@/components/loggers/water-logger';
import MedicationLogger from '@/components/loggers/medication-logger';
import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import { collection, doc, setDoc, serverTimestamp, query, where, addDoc, Timestamp, deleteDoc, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import { useMemoFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { UserProfile } from '@/models/user-profile';
import { Medication } from '@/models/medication';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { MoodLog } from '@/models/mood-log';
import { SleepLog } from '@/models/sleep-log';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogoIcon } from '@/components/logo-icon';


type LoggerType = 'mood' | 'sleep' | 'medication' | 'water' | null;

const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name[0];
}

export default function Home() {
  const { user } = useUser();
  const { toast } = useToast();
  const firestore = useFirestore();
  const [openLogger, setOpenLogger] = useState<LoggerType>(null);
  
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => format(today, 'yyyy-MM-dd'), [today]);

  // --- Firestore Queries ---
  const userProfileQuery = useMemoFirebase(() => {
      if (!user) return null;
      return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileQuery);

  // Registered Medications (from the dedicated collection)
  const medicationsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'medications');
  }, [firestore, user]);
  const { data: registeredMedications, isLoading: isLoadingMeds } = useCollection<Medication>(medicationsQuery);


  // Medications taken today
  const takenMedicationsQuery = useMemoFirebase(() => {
      if (!user) return null;
      const start = new Date(); start.setHours(0,0,0,0);
      const end = new Date(); end.setHours(23,59,59,999);
      return query(
          collection(firestore, 'users', user.uid, 'medicationLogs'),
          where('takenAt', '>=', Timestamp.fromDate(start)),
          where('takenAt', '<=', Timestamp.fromDate(end))
      );
  }, [firestore, user]);
  const { data: takenMedicationsTodayData } = useCollection<{medicationId: string, id: string}>(takenMedicationsQuery);
  const takenMedicationsIds = useMemo(() => takenMedicationsTodayData?.map(log => log.medicationId) || [], [takenMedicationsTodayData]);

  const moodLogsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'moodLogs'), where('date', '==', todayStr));
  }, [firestore, user, todayStr]);
  const { data: moodLogsToday } = useCollection<MoodLog>(moodLogsQuery);
  const moodLogForToday = useMemo(() => moodLogsToday?.[0], [moodLogsToday]);

  const sleepLogsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'sleepLogs'), where('date', '==', todayStr));
  }, [firestore, user, todayStr]);
  const { data: sleepLogsToday } = useCollection<SleepLog>(sleepLogsQuery);
  const sleepLogForToday = useMemo(() => sleepLogsToday?.[0], [sleepLogsToday]);
  
  // --- Save Handlers ---

  const handleMoodSave = (data: {mood: string, intensity: number, notes: string}) => {
    if (!user) return;
    const logDocRef = doc(firestore, 'users', user.uid, 'moodLogs', todayStr);
    const moodData = { 
        ...data,
        id: todayStr,
        date: todayStr,
        loggedAt: serverTimestamp(),
        userProfileId: user.uid,
     };
    setDoc(logDocRef, moodData, { merge: true }).catch(error => {
        errorEmitter.emit(
          'permission-error',
          new FirestorePermissionError({
            path: logDocRef.path,
            operation: 'write',
            requestResourceData: moodData,
          })
        )
    });
    setOpenLogger(null);
  }

  const handleSleepSave = (data: {duration: number, quality: string}) => {
    if(!user) return;
    const logDocRef = doc(firestore, 'users', user.uid, 'sleepLogs', todayStr);
    const sleepData = {
        ...data,
        id: todayStr,
        date: todayStr,
        loggedAt: serverTimestamp(),
        userProfileId: user.uid,
    };
    setDoc(logDocRef, sleepData, { merge: true }).catch(error => {
       errorEmitter.emit(
          'permission-error',
          new FirestorePermissionError({
            path: logDocRef.path,
            operation: 'write',
            requestResourceData: sleepData,
          })
        )
    });
    setOpenLogger(null);
  }

  const handleMedicationSave = (meds: { name: string, dosage: string }[]) => {
    if (!user) return;
    const medsCollection = collection(firestore, 'users', user.uid, 'medications');
    const promises = meds.map(med => {
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
      .then(() => toast({ title: 'Medicação salva!' }))
      .catch(e => console.error(e));
    setOpenLogger(null);
  }
  
  const toggleMedicationTaken = (med: Medication) => {
    if (!user) return;
    const isTaken = takenMedicationsIds.includes(med.id);
    
    if (isTaken) {
        const logToDelete = takenMedicationsTodayData?.find(log => log.medicationId === med.id);
        if (logToDelete) {
            const logDocRef = doc(firestore, 'users', user.uid, 'medicationLogs', logToDelete.id);
            deleteDoc(logDocRef).catch(error => {
                 errorEmitter.emit(
                  'permission-error',
                  new FirestorePermissionError({
                    path: logDocRef.path,
                    operation: 'delete',
                  })
                )
            });
        }
    } else {
       const logsCollection = collection(firestore, 'users', user.uid, 'medicationLogs');
       const medLogData = {
           medicationId: med.id,
           medicationName: med.medicationName,
           dosage: med.dosage,
           userProfileId: user.uid,
           takenAt: serverTimestamp(),
       };
       addDoc(logsCollection, medLogData).catch(error => {
           errorEmitter.emit(
              'permission-error',
              new FirestorePermissionError({
                path: logsCollection.path,
                operation: 'create',
                requestResourceData: medLogData,
              })
            )
       });
    }
  }

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <header>
        <div className="flex md:hidden items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                <LogoIcon className="w-8 h-8" />
                <h1 className="text-xl font-bold text-foreground">PolarisApp</h1>
            </div>
            <Avatar>
                <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
            </Avatar>
        </div>
        <h1 className="text-3xl font-bold text-foreground">Oi, {user?.displayName?.split(' ')[0] || 'Usuário'}!</h1>
        <p className="text-muted-foreground">Aqui está o seu resumo de hoje.</p>
      </header>
      
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Checklist de Hoje</CardTitle>
            <CardDescription>Registre suas atividades para ver seu progresso.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {/* Mood Logger */}
              <li className="flex items-center justify-between p-3 bg-card rounded-lg shadow-sm">
                <div className="flex items-center gap-4">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full ${moodLogForToday ? 'bg-green-500/20' : 'bg-accent'}`}>
                    <Smile className={`w-5 h-5 ${moodLogForToday ? 'text-green-600' : 'text-primary'}`} />
                  </div>
                  <div>
                    <p className="font-semibold">Registre seu humor</p>
                    <p className="text-sm text-muted-foreground">Como você está se sentindo hoje?</p>
                  </div>
                </div>
                {moodLogForToday ? (
                  <div className='flex items-center gap-2'>
                    <span className='flex items-center gap-1 text-sm font-semibold text-green-600'>
                        <Check className="w-4 h-4"/>
                        Concluído
                    </span>
                    <Button size="icon" variant="ghost" className='h-8 w-8' onClick={() => setOpenLogger('mood')}>
                        <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" onClick={() => setOpenLogger('mood')}>Registrar</Button>
                )}
              </li>

              {/* Sleep Logger */}
              <li className="flex items-center justify-between p-3 bg-card rounded-lg shadow-sm">
                <div className="flex items-center gap-4">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full ${sleepLogForToday ? 'bg-green-500/20' : 'bg-accent'}`}>
                    <Bed className={`w-5 h-5 ${sleepLogForToday ? 'text-green-600' : 'text-primary'}`} />
                  </div>
                  <div>
                    <p className="font-semibold">Registre seu sono</p>
                    <p className="text-sm text-muted-foreground">Acompanhe a qualidade e duração do seu sono.</p>
                  </div>
                </div>
                 {sleepLogForToday ? (
                  <div className='flex items-center gap-2'>
                    <span className='flex items-center gap-1 text-sm font-semibold text-green-600'>
                        <Check className="w-4 h-4"/>
                        Concluído
                    </span>
                    <Button size="icon" variant="ghost" className='h-8 w-8' onClick={() => setOpenLogger('sleep')}>
                        <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" onClick={() => setOpenLogger('sleep')}>Registrar</Button>
                )}
              </li>

              {/* Medication Section */}
              {isLoadingMeds && <p className="p-3 text-sm text-muted-foreground">Carregando medicações...</p>}
              {!isLoadingMeds && registeredMedications?.length === 0 ? (
                 <li className="flex items-center justify-between p-3 bg-card rounded-lg shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-accent">
                          <Pill className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                          <p className="font-semibold">Registre sua medicação</p>
                          <p className="text-sm text-muted-foreground">Cadastre os remédios que você toma.</p>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => setOpenLogger('medication')}>Cadastrar</Button>
                 </li>
              ) : (
                registeredMedications?.map(med => (
                  <li key={med.id} className="flex items-center justify-between p-3 bg-card rounded-lg shadow-sm">
                    <div className="flex items-center gap-4">
                       <div className={`flex items-center justify-center w-10 h-10 rounded-full ${takenMedicationsIds.includes(med.id) ? 'bg-green-500/20' : 'bg-accent'}`}>
                         <Pill className={`w-5 h-5 ${takenMedicationsIds.includes(med.id) ? 'text-green-600' : 'text-primary'}`} />
                       </div>
                       <div>
                         <p className="font-semibold">Tomar {med.medicationName}</p>
                         <p className="text-sm text-muted-foreground">Dosagem: {med.dosage}</p>
                       </div>
                    </div>
                    <button onClick={() => toggleMedicationTaken(med)} className="p-2">
                      {takenMedicationsIds.includes(med.id) ? (
                        <CheckSquare className="w-6 h-6 text-green-600" />
                      ) : (
                        <Square className="w-6 h-6 text-muted-foreground" />
                      )}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div className='space-y-1.5'>
              <CardTitle className="flex items-center gap-2">
                <Droplet className="w-5 h-5 text-primary"/>
                Consumo de Água
              </CardTitle>
              <CardDescription>Sua meta diária de hidratação é {userProfile?.waterGoal || 2000}ml.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
             <WaterLogger logDate={today} embedded />
          </CardContent>
        </Card>
      </div>

      <MoodLogger 
        isOpen={openLogger === 'mood'} 
        onClose={() => setOpenLogger(null)} 
        onSave={handleMoodSave} 
        existingLog={moodLogForToday}
        logDate={today}
      />
      <SleepLogger 
        isOpen={openLogger === 'sleep'} 
        onClose={() => setOpenLogger(null)} 
        onSave={handleSleepSave}
        existingLog={sleepLogForToday}
        logDate={today}
      />
      <MedicationLogger 
        isOpen={openLogger === 'medication'} 
        onClose={() => setOpenLogger(null)} 
        onSave={handleMedicationSave} 
      />
       <WaterLogger
        isOpen={openLogger === 'water'}
        onClose={() => setOpenLogger(null)}
        logDate={today}
      />
    </div>
  );
}
