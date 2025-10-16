
"use client"

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useUser, useFirestore, useDoc, useAuth } from "@/firebase"
import { useRouter } from "next/navigation"
import { signOut, updateProfile, EmailAuthProvider, reauthenticateWithCredential, updatePassword, sendPasswordResetEmail } from "firebase/auth"
import { useMemoFirebase } from "@/firebase/provider";
import { UserProfile } from "@/models/user-profile";
import { doc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import Select from "react-select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


const customSelectStyles = {
  control: (provided: any, state: any) => ({
    ...provided,
    backgroundColor: 'hsl(var(--background))',
    borderColor: state.isFocused ? 'hsl(var(--ring))' : 'hsl(var(--input))',
    boxShadow: state.isFocused ? '0 0 0 1px hsl(var(--ring))' : 'none',
    '&:hover': {
      borderColor: 'hsl(var(--ring))',
    },
    color: 'hsl(var(--foreground))',
    height: '2.5rem',
    minHeight: '2.5rem',
  }),
  menu: (provided: any) => ({
    ...provided,
    backgroundColor: 'hsl(var(--popover))',
    color: 'hsl(var(--popover-foreground))',
  }),
  option: (provided: any, state: any) => ({
    ...provided,
    backgroundColor: state.isSelected ? 'hsl(var(--primary))' : state.isFocused ? 'hsl(var(--accent))' : 'transparent',
    color: state.isSelected ? 'hsl(var(--primary-foreground))' : 'inherit',
    '&:active': {
      backgroundColor: 'hsl(var(--accent))',
    },
  }),
  singleValue: (provided: any) => ({
    ...provided,
    color: 'hsl(var(--foreground))',
  }),
  placeholder: (provided: any) => ({
      ...provided,
      color: 'hsl(var(--muted-foreground))',
  }),
  input: (provided: any) => ({
      ...provided,
      color: 'hsl(var(--foreground))',
      margin: '0px',
      padding: '0px'
  }),
};

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, { message: "A senha atual é obrigatória." }),
  newPassword: z.string().min(6, { message: "A nova senha deve ter pelo menos 6 caracteres." }),
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
});


export default function ProfilePage() {
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const userProfileQuery = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userProfile, isLoading: isLoadingProfile } = useDoc<UserProfile>(userProfileQuery);

  const profileForm = useForm({
    resolver: zodResolver(z.object({
      fullName: z.string().min(2, { message: "O nome completo é obrigatório." }),
      dateOfBirth: z.object({
        day: z.object({ value: z.number(), label: z.string() }).nullable(),
        month: z.object({ value: z.number(), label: z.string() }).nullable(),
        year: z.object({ value: z.number(), label: z.string() }).nullable(),
      }).refine(data => data.day && data.month && data.year, { message: "Data de nascimento inválida." }),
    })),
    defaultValues: {
      fullName: '',
      dateOfBirth: { day: null, month: null, year: null },
    }
  });

  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }
  });

  useEffect(() => {
    if (userProfile) {
      profileForm.setValue('fullName', userProfile.profileName || user?.displayName || '');
      if (userProfile.dateOfBirth) {
        const dob = new Date(userProfile.dateOfBirth);
        profileForm.setValue('dateOfBirth.day', { value: dob.getUTCDate(), label: `${dob.getUTCDate()}` });
        profileForm.setValue('dateOfBirth.month', { value: dob.getUTCMonth(), label: ptBR.localize?.month(dob.getUTCMonth()) || '' });
        profileForm.setValue('dateOfBirth.year', { value: dob.getUTCFullYear(), label: `${dob.getUTCFullYear()}` });
      }
    }
  }, [userProfile, user, profileForm.setValue]);

  const { yearOptions, monthOptions, dayOptions } = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearOpts = Array.from({ length: 100 }, (_, i) => ({
      value: currentYear - i,
      label: `${currentYear - i}`,
    }));
    
    const monthOpts = Array.from({ length: 12 }, (_, i) => ({
      value: i,
      label: ptBR.localize?.month(i) || '',
    }));
    
    const selectedYear = profileForm.watch('dateOfBirth.year')?.value;
    const selectedMonth = profileForm.watch('dateOfBirth.month')?.value;
    const daysInMonth = (selectedYear && selectedMonth !== undefined) ? new Date(selectedYear, selectedMonth + 1, 0).getDate() : 31;
    const dayOpts = Array.from({ length: daysInMonth }, (_, i) => ({
      value: i + 1,
      label: `${i + 1}`,
    }));

    return { yearOptions: yearOpts, monthOptions: monthOpts, dayOptions: dayOpts };
  }, [profileForm.watch('dateOfBirth.year'), profileForm.watch('dateOfBirth.month')]);


  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/auth/login');
    } catch (error) {
      console.error('Failed to log out', error);
      toast({ variant: 'destructive', title: 'Erro ao sair', description: 'Não foi possível fazer o logout.' });
    }
  };

  const handleProfileSave = async (data: any) => {
    if (!user || !userProfile) return;
    
    const { day, month, year } = data.dateOfBirth;
    if (!day || !month || !year) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Por favor, forneça uma data de nascimento completa.' });
        return;
    }

    setIsSaving(true);
    const dateOfBirth = new Date(Date.UTC(year.value, month.value, day.value));

    try {
        if(user && user.displayName !== data.fullName) {
            await updateProfile(user, { displayName: data.fullName });
        }

        const userDocRef = doc(firestore, 'users', user.uid);
        await updateDoc(userDocRef, {
            profileName: data.fullName,
            dateOfBirth: dateOfBirth.toISOString(),
        });

        toast({ title: 'Perfil atualizado com sucesso!' });
    } catch (error) {
        console.error("Error updating profile:", error);
        toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível atualizar o perfil.' });
    } finally {
        setIsSaving(false);
    }
  };
  
  const handlePasswordSave = async (data: z.infer<typeof passwordFormSchema>) => {
      if(!user || !user.email) return;
      setIsSavingPassword(true);

      try {
          const credential = EmailAuthProvider.credential(user.email, data.currentPassword);
          await reauthenticateWithCredential(user, credential);
          
          await updatePassword(user, data.newPassword);
          
          toast({ title: 'Senha alterada com sucesso!' });
          passwordForm.reset();
          setShowPasswordForm(false);
      } catch (error: any) {
          console.error("Error updating password:", error);
          let description = "Não foi possível alterar a senha. Tente novamente.";
          if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
              description = "A senha atual está incorreta."
          }
          toast({ variant: 'destructive', title: 'Erro', description });
      } finally {
          setIsSavingPassword(false);
      }
  }

  const handlePasswordReset = async () => {
      if(!user?.email) return;
      try {
          await sendPasswordResetEmail(auth, user.email);
          toast({ title: "E-mail enviado", description: "Verifique sua caixa de entrada para redefinir sua senha."})
      } catch (error) {
           console.error("Error sending password reset email:", error);
           toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível enviar o e-mail de redefinição.' });
      }
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name[0];
  }
  
  const formattedDob = useMemo(() => {
    if (userProfile?.dateOfBirth) {
        const dob = new Date(userProfile.dateOfBirth);
        const utcDob = new Date(dob.valueOf() + dob.getTimezoneOffset() * 60000);
        return format(utcDob, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
    }
    return "Data não informada";
  }, [userProfile?.dateOfBirth]);


  return (
    <div className="p-4 md:p-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Perfil & Configurações</h1>
          <p className="text-muted-foreground">Gerencie sua conta e preferências.</p>
        </div>
        <Button onClick={handleLogout} variant="outline">Sair</Button>
      </header>
      
      <div className="w-full">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="security">Segurança</TabsTrigger>
            <TabsTrigger value="privacy">Privacidade</TabsTrigger>
            <TabsTrigger value="notifications">Notificações</TabsTrigger>
          </TabsList>
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16 text-2xl">
                      <AvatarFallback>{getInitials(userProfile?.profileName || user?.displayName)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle>{userProfile?.profileName || user?.displayName}</CardTitle>
                      <CardDescription>{formattedDob}</CardDescription>
                    </div>
                </div>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(handleProfileSave)} className="space-y-6">
                      <div className="space-y-2">
                          <Label htmlFor="name">Nome Completo</Label>
                          <Controller
                              name="fullName"
                              control={profileForm.control}
                              render={({ field }) => <Input id="name" {...field} />}
                          />
                          {profileForm.formState.errors.fullName && <p className="text-sm font-medium text-destructive">{profileForm.formState.errors.fullName.message}</p>}
                      </div>
                      <div className="space-y-2">
                          <Label>Data de Nascimento</Label>
                          <div className="grid grid-cols-3 gap-2">
                              <Controller
                                  control={profileForm.control}
                                  name="dateOfBirth.day"
                                  render={({ field }) => (
                                      <Select
                                          {...field}
                                          options={dayOptions}
                                          placeholder="Dia"
                                          styles={customSelectStyles}
                                          aria-label="Dia de Nascimento"
                                          noOptionsMessage={() => 'Selecione Mês/Ano'}
                                      />
                                  )}
                              />
                              <Controller
                                  control={profileForm.control}
                                  name="dateOfBirth.month"
                                  render={({ field }) => (
                                  <Select
                                          {...field}
                                          options={monthOptions}
                                          placeholder="Mês"
                                          styles={customSelectStyles}
                                          aria-label="Mês de Nascimento"
                                      />
                                  )}
                              />
                              <Controller
                                  control={profileForm.control}
                                  name="dateOfBirth.year"
                                  render={({ field }) => (
                                      <Select
                                          {...field}
                                          options={yearOptions}
                                          placeholder="Ano"
                                          styles={customSelectStyles}
                                          aria-label="Ano de Nascimento"
                                      />
                                  )}
                              />
                          </div>
                           {profileForm.formState.errors.dateOfBirth && <p className="text-sm font-medium text-destructive">{profileForm.formState.errors.dateOfBirth.message}</p>}
                      </div>
                      <Button type="submit" disabled={isSaving}>
                          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Salvar Alterações
                      </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
           <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Segurança</CardTitle>
                <CardDescription>Gerencie suas informações de segurança.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                 <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={user?.email || ''} readOnly />
                     <p className="text-sm text-muted-foreground">O e-mail não pode ser alterado.</p>
                </div>
                 <div className="border-t pt-6 space-y-2">
                  <h3 className="text-base font-medium">Senha</h3>
                  {!showPasswordForm ? (
                     <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button>Alterar Senha</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Você está prestes a iniciar o processo para alterar sua senha.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => setShowPasswordForm(true)}>Continuar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <Form {...passwordForm}>
                        <form onSubmit={passwordForm.handleSubmit(handlePasswordSave)} className="space-y-4">
                            <h3 className="text-lg font-medium">Alterar Senha</h3>
                             <FormField
                                control={passwordForm.control}
                                name="currentPassword"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Senha Atual</FormLabel>
                                    <FormControl>
                                        <Input type="password" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={passwordForm.control}
                                name="newPassword"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Nova Senha</FormLabel>
                                    <FormControl>
                                        <Input type="password" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={passwordForm.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Confirmar Nova Senha</FormLabel>
                                    <FormControl>
                                        <Input type="password" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="flex items-center justify-between">
                                <Button type="submit" disabled={isSavingPassword}>
                                    {isSavingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Salvar Nova Senha
                                </Button>
                                <Button type="button" variant="link" onClick={handlePasswordReset}>
                                    Esqueceu sua senha?
                                </Button>
                            </div>
                              <Button type="button" variant="outline" onClick={() => setShowPasswordForm(false)} className="mt-4">
                                Cancelar
                            </Button>
                        </form>
                    </Form>
                  )}
                 </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="privacy">
            <Card>
              <CardHeader>
                <CardTitle>Privacidade</CardTitle>
                <CardDescription>Controle como suas informações são compartilhadas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label htmlFor="public-profile">Perfil Público</Label>
                    <p className="text-sm text-muted-foreground">Permitir que outros vejam seu perfil.</p>
                  </div>
                  <Switch id="public-profile" />
                </div>
                 <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label htmlFor="data-sharing">Compartilhamento de Dados</Label>
                    <p className="text-sm text-muted-foreground">Compartilhar dados anônimos para pesquisa.</p>
                  </div>
                  <Switch id="data-sharing" defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notificações</CardTitle>
                <CardDescription>Escolha sobre o que você quer ser notificado.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label htmlFor="reminders">Lembretes Diários</Label>
                  <Switch id="reminders" defaultChecked />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label htmlFor="weekly-summary">Resumo Semanal</Label>
                  <Switch id="weekly-summary" defaultChecked />
                </div>
                 <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label htmlFor="product-updates">Atualizações do Produto</Label>
                  <Switch id="product-updates" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
