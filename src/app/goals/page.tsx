
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Droplet, Bed, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, updateDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { UserProfile } from '@/models/user-profile';


export default function GoalsPage() {
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();
    
    const userProfileQuery = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);
    const { data: userProfile, isLoading: isLoadingProfile } = useDoc<UserProfile>(userProfileQuery);

    const [waterGoal, setWaterGoal] = useState(2000);
    const [sleepGoal, setSleepGoal] = useState(8);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (userProfile) {
            setWaterGoal(userProfile.waterGoal || 2000);
            setSleepGoal(userProfile.sleepGoal || 8);
        }
    }, [userProfile]);

    const handleSaveChanges = async () => {
        if (!user || !userProfile) return;
        setIsSaving(true);
        
        const userDocRef = doc(firestore, 'users', user.uid);
        try {
            await updateDoc(userDocRef, {
                waterGoal: Number(waterGoal),
                sleepGoal: Number(sleepGoal),
            });
            toast({
                title: "Metas Salvas!",
                description: "Suas metas de água e sono foram atualizadas.",
            });
        } catch (error) {
            console.error("Error updating goals: ", error);
            toast({
                variant: "destructive",
                title: "Erro ao salvar",
                description: "Não foi possível atualizar suas metas.",
            });
        } finally {
            setIsSaving(false);
        }
    }
    
    if(isLoadingProfile) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

  return (
    <div className="p-4 md:p-8">
        <header className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Definir Metas</h1>
            <p className="text-muted-foreground">Personalize suas metas diárias de saúde.</p>
        </header>

        <div className="grid gap-8 md:max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Droplet className="w-6 h-6 text-primary" />
                        <CardTitle>Meta de Água</CardTitle>
                    </div>
                    <CardDescription>Defina quantos mililitros (ml) de água você pretende beber por dia.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="water-goal">Meta de Consumo de Água (ml)</Label>
                        <Input 
                            id="water-goal" 
                            type="number" 
                            value={waterGoal}
                            onChange={(e) => setWaterGoal(Number(e.target.value))}
                            placeholder="Ex: 2500"
                            step="100"
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                     <div className="flex items-center gap-3">
                        <Bed className="w-6 h-6 text-primary" />
                        <CardTitle>Meta de Sono</CardTitle>
                    </div>
                    <CardDescription>Defina quantas horas de sono você almeja por noite.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="sleep-goal">Meta de Sono (horas)</Label>
                        <Input 
                            id="sleep-goal" 
                            type="number" 
                            value={sleepGoal}
                            onChange={(e) => setSleepGoal(Number(e.target.value))}
                            placeholder="Ex: 8"
                            step="0.5"
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={handleSaveChanges} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Alterações
                </Button>
            </div>
        </div>
    </div>
  );
}
