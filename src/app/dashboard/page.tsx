
"use client"

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, LabelList, Cell, ResponsiveContainer } from "recharts"
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { collection, query, orderBy, where, Timestamp, doc } from 'firebase/firestore';
import { useMemoFirebase } from "@/firebase/provider";
import { format, subDays, startOfDay } from 'date-fns';
import { moods } from "@/components/loggers/mood-logger";
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { UserProfile } from "@/models/user-profile";
import { Medication } from "@/models/medication";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


const chartConfig = (key: string, color: string) => ({
    [key]: { label: key.charAt(0).toUpperCase() + key.slice(1), color },
});

const MoodIcon = ({ moodName, ...props }: { moodName: string, [key: string]: any }) => {
    const mood = moods.find(m => m.name === moodName);
    if (!mood) return null;
    const Icon = mood.icon;
    return <Icon {...props} />;
}

const MoodChartCustomBar = (props: any) => {
    const { x, y, width, height, payload } = props;
    const moodName = payload.mood;
    return (
        <g>
            <rect x={x} y={y} width={width} height={height} fill="hsl(var(--primary))" opacity={0.2} rx={4} />
            <foreignObject x={x} y={y - 30} width={width} height={30}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <MoodIcon moodName={moodName} className="w-6 h-6" />
                </div>
            </foreignObject>
        </g>
    );
};


export default function DashboardPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const [selectedPeriod, setSelectedPeriod] = useState<number>(7);

    const dateRange = useMemo(() => {
        return Array.from({ length: selectedPeriod }).map((_, i) => format(subDays(new Date(), i), 'yyyy-MM-dd')).reverse();
    }, [selectedPeriod]);

    const startDate = useMemo(() => startOfDay(subDays(new Date(), selectedPeriod - 1)), [selectedPeriod]);
    const startTimestamp = useMemo(() => Timestamp.fromDate(startDate), [startDate]);

    const userProfileQuery = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileQuery);
    const waterGoal = userProfile?.waterGoal || 2000;
    
    const allMedsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return collection(firestore, 'users', user.uid, 'medications');
    }, [firestore, user]);
    const { data: allMeds, isLoading: isLoadingAllMeds } = useCollection<Medication>(allMedsQuery);


    const moodLogsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'users', user.uid, 'moodLogs'), where("date", ">=", dateRange[0]), orderBy('date', 'asc'));
    }, [firestore, user, dateRange]);
    const { data: moodLogs, isLoading: isLoadingMood } = useCollection(moodLogsQuery);
    
    const sleepLogsQuery = useMemoFirebase(() => {
        if (!user) return null;
         return query(collection(firestore, 'users', user.uid, 'sleepLogs'), where("date", ">=", dateRange[0]), orderBy('date', 'asc'));
    }, [firestore, user, dateRange]);
    const { data: sleepLogs, isLoading: isLoadingSleep } = useCollection(sleepLogsQuery);
    
    const waterLogsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'users', user.uid, 'waterIntakeLogs'), where('loggedAt', '>=', startTimestamp));
    }, [firestore, user, startTimestamp]);
    const { data: waterIntakeLogs, isLoading: isLoadingWater } = useCollection(waterLogsQuery);
    
    const medicationLogsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'users', user.uid, 'medicationLogs'), where('takenAt', '>=', startTimestamp));
    }, [firestore, user, startTimestamp]);
    const { data: medicationLogs, isLoading: isLoadingMeds } = useCollection(medicationLogsQuery);


    const chartData = useMemo(() => {
        const dailyWater = (waterIntakeLogs || []).reduce((acc: {[key:string]: number}, log: any) => {
            const date = format(log.loggedAt.toDate(), 'yyyy-MM-dd');
            if(!acc[date]) acc[date] = 0;
            acc[date] += log.amount;
            return acc;
        }, {});
        
        return dateRange.map(date => {
            const moodLog = moodLogs?.find(log => log.date === date);
            const sleepLog = sleepLogs?.find(log => log.date === date);
            const tickFormat = selectedPeriod === 30 ? "d" : "MMM d";

            return {
                date: format(new Date(date), tickFormat),
                fullDate: date,
                mood: moodLog?.mood,
                intensity: moodLog?.intensity || 0,
                duration: sleepLog?.duration || 0,
                water: dailyWater[date] || 0,
            }
        })
    }, [dateRange, moodLogs, sleepLogs, waterIntakeLogs, selectedPeriod])

    const medicationAdherenceData = useMemo(() => {
        const dailyMeds = (medicationLogs || []).reduce((acc: {[key: string]: Set<string>}, log: any) => {
            const date = format(log.takenAt.toDate(), 'yyyy-MM-dd');
            if(!acc[date]) acc[date] = new Set();
            acc[date].add(log.medicationId);
            return acc;
        }, {});
        return dateRange.map(date => ({
            date: format(new Date(date), "MMM d"),
            taken: (dailyMeds[date] || new Set()).size,
        }));
    }, [dateRange, medicationLogs]);


    const isLoading = isUserLoading || isLoadingMood || isLoadingSleep || isLoadingWater || isLoadingMeds || isLoadingAllMeds;

  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Visualize seu progresso e identifique tendências.</p>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
            <div className="mb-4 flex justify-end">
                <Tabs defaultValue="7" onValueChange={(value) => setSelectedPeriod(Number(value))} className="w-fit">
                    <TabsList>
                        <TabsTrigger value="7">7 dias</TabsTrigger>
                        <TabsTrigger value="15">15 dias</TabsTrigger>
                        <TabsTrigger value="30">1 mês</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
            <Tabs defaultValue="mood" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="mood">Humor</TabsTrigger>
                <TabsTrigger value="sleep">Sono</TabsTrigger>
                <TabsTrigger value="water">Água</TabsTrigger>
                <TabsTrigger value="medication">Medicação</TabsTrigger>
                </TabsList>
                <TabsContent value="mood">
                <Card>
                    <CardHeader>
                    <CardTitle>Tendências de Humor</CardTitle>
                    <CardDescription>Suas avaliações de humor nos últimos {selectedPeriod} dias.</CardDescription>
                    </CardHeader>
                    <CardContent>
                    <ChartContainer config={chartConfig("intensity", "hsl(var(--primary))")} className="h-[250px] w-full">
                        <BarChart data={chartData} margin={{ left: -20, right: 10, top: 40 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                            <YAxis type="number" domain={[0, 10]} dataKey="intensity" />
                            <ChartTooltip 
                                cursor={false}
                                content={<ChartTooltipContent 
                                    formatter={(value, name) => `${value}/10`} 
                                    labelFormatter={(label, payload) => {
                                        const mood = payload[0]?.payload.mood;
                                        return mood ? `${label} - ${mood}` : label;
                                    }}
                                />} 
                            />
                            <Bar dataKey="intensity" shape={<MoodChartCustomBar />}>
                            <LabelList dataKey="intensity" position="top" offset={-35} formatter={(value: number) => value > 0 ? `${value}/10` : ''}/>
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                    </CardContent>
                </Card>
                </TabsContent>
                <TabsContent value="sleep">
                <Card>
                    <CardHeader>
                    <CardTitle>Duração do Sono</CardTitle>
                    <CardDescription>Sua duração de sono em horas nos últimos {selectedPeriod} dias.</CardDescription>
                    </CardHeader>
                    <CardContent>
                    <ChartContainer config={chartConfig("duração", "hsl(var(--primary))")} className="h-[250px] w-full">
                        <BarChart data={chartData} margin={{ left: -20, right: 10 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis type="number" domain={[0, 12]} unit="h" dataKey="duration"/>
                        <ChartTooltip content={<ChartTooltipContent formatter={(value) => `${Number(value).toFixed(1)}h`} />} />
                        <Bar dataKey="duration" fill="hsl(var(--primary))" radius={4} />
                        </BarChart>
                    </ChartContainer>
                    </CardContent>
                </Card>
                </TabsContent>
                <TabsContent value="water">
                    <Card>
                        <CardHeader>
                            <CardTitle>Consumo de Água</CardTitle>
                            <CardDescription>Seu consumo de água (ml) nos últimos {selectedPeriod} dias em relação à sua meta de {waterGoal}ml.</CardDescription>
                        </CardHeader>
                        <CardContent>
                        <ChartContainer config={chartConfig("água", "hsl(var(--primary))")} className="h-[250px] w-full">
                                <BarChart data={chartData} margin={{ left: -20, right: 10 }}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                                    <YAxis type="number" dataKey="water" unit="ml" />
                                    <ChartTooltip content={<ChartTooltipContent formatter={(value) => `${value}ml`} />} />
                                    <Bar dataKey="water" radius={4}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.water >= waterGoal ? 'hsl(var(--chart-2))' : 'hsl(var(--primary))'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="medication">
                    <Card>
                        <CardHeader>
                            <CardTitle>Adesão à Medicação</CardTitle>
                            <CardDescription>Seus registros de medicação nos últimos {selectedPeriod} dias.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <TooltipProvider>
                            <div className={`grid gap-2 md:gap-4 text-center grid-cols-7 ${selectedPeriod > 7 ? 'grid-cols-10' : ''} ${selectedPeriod > 15 ? 'grid-cols-15' : ''}`}>
                                {chartData.map((day, index) => {
                                    const totalMeds = allMeds || [];
                                    const logsForDay = (medicationLogs || []).filter((log: any) => format(log.takenAt.toDate(), 'yyyy-MM-dd') === day.fullDate);
                                    const takenMedIds = new Set(logsForDay.map((log: any) => log.medicationId));
                                    const takenCount = takenMedIds.size;
                                    const totalCount = totalMeds.length;

                                    let status: 'complete' | 'partial' | 'missed' | 'no-data' = 'no-data';
                                    if (totalCount > 0) {
                                        if (takenCount === totalCount) status = 'complete';
                                        else if (takenCount > 0) status = 'partial';
                                        else status = 'missed';
                                    }

                                    const takenMeds = totalMeds.filter(med => takenMedIds.has(med.id));
                                    const missedMeds = totalMeds.filter(med => !takenMedIds.has(med.id));

                                    return (
                                        <Tooltip key={index}>
                                            <TooltipTrigger asChild>
                                                <div className="flex flex-col items-center gap-2 p-2 rounded-lg bg-card border cursor-default">
                                                    <p className="text-sm font-medium">{day.date}</p>
                                                    {status === 'complete' && <CheckCircle2 className="w-8 h-8 text-green-500" />}
                                                    {status === 'partial' && <AlertCircle className="w-8 h-8 text-yellow-500" />}
                                                    {status === 'missed' && <XCircle className="w-8 h-8 text-red-500" />}
                                                    {status === 'no-data' && <div className="w-8 h-8 rounded-full bg-muted" />}
                                                    <p className="text-xs text-muted-foreground">{totalCount > 0 ? `${takenCount}/${totalCount}` : 'N/A'}</p>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                {totalCount === 0 ? (
                                                    <p>Nenhuma medicação cadastrada.</p>
                                                ) : (
                                                    <div className="text-left">
                                                        {takenMeds.length > 0 && (
                                                            <div>
                                                                <h4 className="font-semibold text-green-600">Tomados:</h4>
                                                                <ul className="list-disc list-inside text-sm">
                                                                    {takenMeds.map(m => <li key={m.id}>{m.medicationName}</li>)}
                                                                </ul>
                                                            </div>
                                                        )}
                                                        {missedMeds.length > 0 && (
                                                            <div className="mt-2">
                                                                <h4 className="font-semibold text-red-600">Não Tomados:</h4>
                                                                <ul className="list-disc list-inside text-sm">
                                                                    {missedMeds.map(m => <li key={m.id}>{m.medicationName}</li>)}
                                                                </ul>
                                                            </div>
                                                        )}
                                                        {takenMeds.length === 0 && missedMeds.length === 0 && <p>Nenhum registro para este dia.</p>}
                                                    </div>
                                                )}
                                            </TooltipContent>
                                        </Tooltip>
                                    )
                                })}
                            </div>
                        </TooltipProvider>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </>
      )}
    </div>
  )
}

    