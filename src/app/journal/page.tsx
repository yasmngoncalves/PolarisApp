
"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format, addDays, subDays, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, query, where, Timestamp, doc, setDoc, serverTimestamp, deleteDoc, addDoc, writeBatch, getDocs } from 'firebase/firestore';
import { Smile, Bed, Pill, Droplet, AlertCircle, Loader2, ChevronLeft, ChevronRight, Edit, Trash2, Plus, CheckSquare, Square } from 'lucide-react';
import { useMemoFirebase } from '@/firebase/provider';
import { moods } from '@/components/loggers/mood-logger';
import { Button } from '@/components/ui/button';
import MoodLogger from '@/components/loggers/mood-logger';
import SleepLogger from '@/components/loggers/sleep-logger';
import WaterLogger from '@/components/loggers/water-logger';
import { MoodLog } from '@/models/mood-log';
import { SleepLog } from '@/models/sleep-log';
import { Medication } from '@/models/medication';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const MoodIcon = ({ moodName, ...props }: { moodName: string, [key: string]: any }) => {
    const mood = moods.find(m => m.name === moodName);
    if (!mood) return <Smile {...props} />;
    const Icon = mood.icon;
    return <Icon {...props} />;
}

type LoggerType = 'mood' | 'sleep' | 'water' | null;

const startOfDay = (date: Date) => { const d = new Date(date); d.setHours(0, 0, 0, 0); return d; };
const endOfDay = (date: Date) => { const d = new Date(date); d.setHours(23, 59, 59, 999); return d; };

export default function JournalPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [openLogger, setOpenLogger] = useState<LoggerType>(null);
  
  const selectedDay = useMemo(() => format(currentDate, 'yyyy-MM-dd'), [currentDate]);

  // --- Data Queries ---
  const moodLogsQuery = useMemoFirebase(() => {
    if (!user || !selectedDay) return null;
    return query(collection(firestore, 'users', user.uid, 'moodLogs'), where('date', '==', selectedDay));
  }, [firestore, user, selectedDay]);
  const { data: moodLogs } = useCollection<MoodLog>(moodLogsQuery);
  const moodForDay = useMemo(() => moodLogs?.[0], [moodLogs]);

  const sleepLogsQuery = useMemoFirebase(() => {
    if (!user || !selectedDay) return null;
    return query(collection(firestore, 'users', user.uid, 'sleepLogs'), where('date', '==', selectedDay));
  }, [firestore, user, selectedDay]);
  const { data: sleepLogs } = useCollection<SleepLog>(sleepLogsQuery);
  const sleepForDay = useMemo(() => sleepLogs?.[0], [sleepLogs]);
  
  const dayStartTimestamp = useMemo(() => Timestamp.fromDate(startOfDay(currentDate)), [currentDate]);
  const dayEndTimestamp = useMemo(() => Timestamp.fromDate(endOfDay(currentDate)), [currentDate]);
  
  // Registered Medications
  const registeredMedicationsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'medications');
  }, [firestore, user]);
  const { data: registeredMedications, isLoading: isLoadingMeds } = useCollection<Medication>(registeredMedicationsQuery);

  // Medication Logs for the selected day
  const medicationLogsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'medicationLogs'), where('takenAt', '>=', dayStartTimestamp), where('takenAt', '<=', dayEndTimestamp));
  }, [firestore, user, dayStartTimestamp, dayEndTimestamp]);
  const { data: medicationLogs, isLoading: isLoadingMedLogs } = useCollection<{medicationId: string}>(medicationLogsQuery);
  const takenMedicationsIds = useMemo(() => new Set(medicationLogs?.map(log => log.medicationId) || []), [medicationLogs]);


  const waterIntakeLogsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'waterIntakeLogs'), where('loggedAt', '>=', dayStartTimestamp), where('loggedAt', '<=', dayEndTimestamp));
  }, [firestore, user, dayStartTimestamp, dayEndTimestamp]);
  const { data: waterIntakeLogs, isLoading: isLoadingWater } = useCollection(waterIntakeLogsQuery);

  const totalWaterIntake = useMemo(() => {
      if (!waterIntakeLogs) return 0;
      return waterIntakeLogs.reduce((total: number, log: any) => total + log.amount, 0);
  }, [waterIntakeLogs]);

  // --- State & Loading ---
  const isLoading = isUserLoading || isLoadingMeds || isLoadingMedLogs || isLoadingWater || moodLogs === undefined || sleepLogs === undefined;

  // --- Handlers ---
  const handleMoodSave = (data: {mood: string, intensity: number, notes: string}) => {
    if (!user) return;
    const logDocRef = doc(firestore, 'users', user.uid, 'moodLogs', selectedDay);
    const logData = { ...data, id: selectedDay, date: selectedDay, loggedAt: serverTimestamp(), userProfileId: user.uid };
    setDoc(logDocRef, logData, { merge: true }).catch(error => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: logDocRef.path, operation: 'write', requestResourceData: logData }));
    });
    setOpenLogger(null);
  }

  const handleSleepSave = (data: {duration: number, quality: string}) => {
    if(!user) return;
    const logDocRef = doc(firestore, 'users', user.uid, 'sleepLogs', selectedDay);
    const logData = { ...data, id: selectedDay, date: selectedDay, loggedAt: serverTimestamp(), userProfileId: user.uid };
    setDoc(logDocRef, logData, { merge: true }).catch(error => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: logDocRef.path, operation: 'write', requestResourceData: logData }));
    });
    setOpenLogger(null);
  }

  const handleDeleteLog = async (logType: 'mood' | 'sleep') => {
      if(!user) return;
      const collectionName = logType === 'mood' ? 'moodLogs' : 'sleepLogs';
      const logDocRef = doc(firestore, 'users', user.uid, collectionName, selectedDay);
      await deleteDoc(logDocRef);
  }
  
 const toggleMedicationTaken = async (med: Medication) => {
    if (!user) return;
    const isTaken = takenMedicationsIds.has(med.id);
    
    if (isTaken) {
        // Find the specific log to delete
        const logsCollection = collection(firestore, 'users', user.uid, 'medicationLogs');
        const q = query(logsCollection, 
            where('medicationId', '==', med.id),
            where('takenAt', '>=', dayStartTimestamp),
            where('takenAt', '<=', dayEndTimestamp)
        );
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((logDoc) => {
            deleteDoc(logDoc.ref).catch(error => {
                 errorEmitter.emit('permission-error', new FirestorePermissionError({ path: logDoc.ref.path, operation: 'delete' }));
            });
        });
    } else {
       const logsCollection = collection(firestore, 'users', user.uid, 'medicationLogs');
       const takenAtTimestamp = Timestamp.fromDate(currentDate); 
       const medLogData = {
           medicationId: med.id,
           medicationName: med.medicationName,
           dosage: med.dosage,
           userProfileId: user.uid,
           takenAt: takenAtTimestamp,
       };
       addDoc(logsCollection, medLogData).catch(error => {
           errorEmitter.emit('permission-error', new FirestorePermissionError({ path: logsCollection.path, operation: 'create', requestResourceData: medLogData }));
       });
    }
  }


  // --- UI Helpers ---
  const formatSleepDuration = (durationInHours: number) => {
    const hours = Math.floor(durationInHours);
    const minutes = Math.round((durationInHours - hours) * 60);
    return `${hours}h ${minutes}m`;
  }

  const handlePrevDay = () => setCurrentDate(subDays(currentDate, 1));
  const handleNextDay = () => setCurrentDate(addDays(currentDate, 1));
  const isNextDayDisabled = isToday(currentDate);

  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Diário</h1>
        <p className="text-muted-foreground">Revise suas entradas passadas e reflita sobre sua jornada.</p>
      </header>
      
      <div className="flex items-center justify-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={handlePrevDay}>
              <ChevronLeft className="h-6 w-6" />
          </Button>
          <h2 className="text-xl md:text-2xl font-semibold text-center whitespace-nowrap">
              {format(currentDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </h2>
          <Button variant="ghost" size="icon" onClick={handleNextDay} disabled={isNextDayDisabled}>
              <ChevronRight className="h-6 w-6" />
          </Button>
      </div>

      <Card className="min-h-[400px] w-full">
        <CardHeader>
          <CardTitle>Registros do Dia</CardTitle>
          <CardDescription>Isto é o que você registrou neste dia. Você pode adicionar, editar ou remover registros.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="flex flex-col items-center justify-center text-center h-64">
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-2" />
                <p className="text-sm text-muted-foreground">Carregando registros...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Mood Section */}
              <LogEntry
                icon={<Smile className="h-6 w-6 text-primary mt-1" />}
                title="Humor"
                log={moodForDay}
                onAdd={() => setOpenLogger('mood')}
                onEdit={() => setOpenLogger('mood')}
                onDelete={() => handleDeleteLog('mood')}
              >
                {moodForDay && (
                  <div>
                    <p className="text-muted-foreground">
                      Sentiu-se <span className="font-medium text-foreground">{moodForDay.mood}</span> com uma intensidade de {moodForDay.intensity}/10.
                    </p>
                    {moodForDay.notes && <p className="text-sm text-muted-foreground mt-1 italic">"{moodForDay.notes}"</p>}
                  </div>
                )}
              </LogEntry>

              {/* Sleep Section */}
              <LogEntry
                icon={<Bed className="h-6 w-6 text-primary mt-1" />}
                title="Sono"
                log={sleepForDay}
                onAdd={() => setOpenLogger('sleep')}
                onEdit={() => setOpenLogger('sleep')}
                onDelete={() => handleDeleteLog('sleep')}
              >
                {sleepForDay && (
                  <p className="text-muted-foreground">
                    Dormiu por <span className="font-medium text-foreground">{formatSleepDuration(sleepForDay.duration)}</span>. A qualidade foi <span className="font-medium text-foreground capitalize">{sleepForDay.quality}</span>.
                  </p>
                )}
              </LogEntry>

              {/* Water Section */}
              <LogEntry
                icon={<Droplet className="h-6 w-6 text-primary mt-1" />}
                title="Consumo de Água"
                log={totalWaterIntake > 0 ? { amount: totalWaterIntake } : null}
                onAdd={() => setOpenLogger('water')}
                onEdit={() => setOpenLogger('water')}
              >
                 {totalWaterIntake > 0 && (
                    <p className="text-muted-foreground">
                        Bebeu <span className="font-medium text-foreground">{totalWaterIntake}ml</span> de água.
                    </p>
                )}
              </LogEntry>
              
              {/* Medication Section */}
               <div className="flex items-start gap-4">
                <Pill className="h-6 w-6 text-primary mt-1" />
                <div className="w-full">
                  <h3 className="font-semibold">Medicação</h3>
                    {registeredMedications && registeredMedications.length > 0 ? (
                        <ul className="space-y-2 mt-2">
                        {registeredMedications.map(med => (
                            <li key={med.id} className="flex items-center justify-between p-2 bg-background rounded-md">
                                <p className="font-medium">{med.medicationName}</p>
                                <button onClick={() => toggleMedicationTaken(med)} className="p-1">
                                {takenMedicationsIds.has(med.id) ? (
                                    <CheckSquare className="w-6 h-6 text-primary" />
                                ) : (
                                    <Square className="w-6 h-6 text-muted-foreground" />
                                )}
                                </button>
                            </li>
                        ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground">Nenhuma medicação cadastrada. Vá para a página de Medicação para adicionar.</p>
                    )}
                </div>
              </div>


               {!(moodForDay || sleepForDay || (medicationLogs && medicationLogs.length > 0) || totalWaterIntake > 0) && (
                <div className="flex flex-col items-center justify-center text-center h-40 rounded-lg border-2 border-dashed">
                  <AlertCircle className="w-10 h-10 text-muted-foreground mb-2" />
                  <h3 className="font-semibold">Nenhum Dado Registrado</h3>
                  <p className="text-sm text-muted-foreground">Adicione registros para este dia.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      <MoodLogger 
        isOpen={openLogger === 'mood'} 
        onClose={() => setOpenLogger(null)} 
        onSave={handleMoodSave} 
        existingLog={moodForDay}
        logDate={currentDate}
      />
      <SleepLogger 
        isOpen={openLogger === 'sleep'} 
        onClose={() => setOpenLogger(null)} 
        onSave={handleSleepSave}
        existingLog={sleepForDay}
        logDate={currentDate}
      />
       <WaterLogger
        isOpen={openLogger === 'water'}
        onClose={() => setOpenLogger(null)}
        logDate={currentDate}
      />
    </div>
  );
}


// --- Log Entry Component ---
interface LogEntryProps {
    icon: React.ReactNode;
    title: string;
    log: any;
    children: React.ReactNode;
    onAdd?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
}

const LogEntry = ({ icon, title, log, children, onAdd, onEdit, onDelete }: LogEntryProps) => {
    return (
        <div className="flex items-start gap-4">
            {icon}
            <div className="flex-1">
                <div className="flex justify-between items-start">
                    <div>
                         <h3 className="font-semibold">{title}</h3>
                         {log ? children : <p className="text-sm text-muted-foreground">Nenhum registro para este dia.</p>}
                    </div>
                    <div className="flex items-center gap-1">
                       {log && onEdit && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
                                <Edit className="h-4 w-4" />
                            </Button>
                        )}
                        {!log && onAdd && (
                             <Button variant="outline" size="sm" onClick={onAdd}>
                                <Plus className="h-4 w-4 mr-2" />
                                Adicionar
                            </Button>
                        )}
                        {log && onDelete && (
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta ação não pode ser desfeita. Isso excluirá permanentemente o registro de {title.toLowerCase()} deste dia.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={onDelete}>Excluir</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
