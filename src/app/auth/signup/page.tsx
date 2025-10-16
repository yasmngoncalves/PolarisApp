
"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { useAuth, useFirestore } from "@/firebase";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import Select from 'react-select';
import { useMemo } from "react";
import { LogoIcon } from "@/components/logo-icon";

const formSchema = z.object({
  fullName: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  email: z.string().email({ message: "Por favor, insira um e-mail válido." }),
  dateOfBirth: z.object({
      day: z.object({ value: z.number(), label: z.string() }).nullable(),
      month: z.object({ value: z.number(), label: z.string() }).nullable(),
      year: z.object({ value: z.number(), label: z.string() }).nullable(),
  }).refine(data => {
      const { day, month, year } = data;
      if (!day || !month || !year) return false;
      const date = new Date(year.value, month.value, day.value);
      return date.getFullYear() === year.value && date.getMonth() === month.value && date.getDate() === day.value;
  }, {
      message: "Data de nascimento inválida.",
      path: ["day"], // Show error under the day field
  }),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres." }),
});

type FormData = z.infer<typeof formSchema>;

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


export default function SignUpPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      dateOfBirth: { day: null, month: null, year: null },
    },
  });

  async function onSubmit(values: FormData) {
    if (!values.dateOfBirth.day || !values.dateOfBirth.month || !values.dateOfBirth.year) {
        form.setError("dateOfBirth.day", { type: "manual", message: "Data de nascimento é obrigatória." });
        return;
    }
    
    try {
      const { day, month, year } = values.dateOfBirth;
      const dateOfBirth = new Date(year.value, month.value, day.value);

      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;
      
      await updateProfile(user, {
        displayName: values.fullName,
      });

      const userProfile = {
        id: user.uid,
        username: values.email.split('@')[0],
        email: values.email,
        profileName: values.fullName,
        dateOfBirth: dateOfBirth.toISOString(),
        waterGoal: 2000,
        sleepGoal: 8,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const userDocRef = doc(firestore, "users", user.uid);
      setDoc(userDocRef, userProfile).catch((error) => {
          errorEmitter.emit(
            'permission-error',
            new FirestorePermissionError({
              path: userDocRef.path,
              operation: 'create',
              requestResourceData: userProfile,
            })
          )
      });
      
      toast({ title: "Conta criada com sucesso!" });
      router.push("/");
    } catch (error: any) {
      let description = "Ocorreu um erro ao tentar criar a conta. Verifique os dados e tente novamente.";
      if (error.code === 'auth/email-already-in-use') {
        description = "Este e-mail já está em uso. Tente fazer login ou use um e-mail diferente."
      }
      toast({
        variant: "destructive",
        title: "Erro ao criar conta",
        description: description,
      });
      console.error("Signup error:", error.message);
    }
  }

  const { yearOptions, monthOptions, dayOptions } = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearOpts = Array.from({ length: 100 }, (_, i) => ({
      value: currentYear - i,
      label: `${currentYear - i}`,
    }));
    
    const monthOpts = [
      { value: 0, label: 'Janeiro' }, { value: 1, label: 'Fevereiro' },
      { value: 2, label: 'Março' }, { value: 3, label: 'Abril' },
      { value: 4, label: 'Maio' }, { value: 5, label: 'Junho' },
      { value: 6, label: 'Julho' }, { value: 7, label: 'Agosto' },
      { value: 8, label: 'Setembro' }, { value: 9, label: 'Outubro' },
      { value: 10, label: 'Novembro' }, { value: 11, label: 'Dezembro' }
    ];
    
    const selectedYear = form.watch('dateOfBirth.year')?.value;
    const selectedMonth = form.watch('dateOfBirth.month')?.value;
    const daysInMonth = (selectedYear && selectedMonth !== undefined) ? new Date(selectedYear, selectedMonth + 1, 0).getDate() : 31;
    const dayOpts = Array.from({ length: daysInMonth }, (_, i) => ({
      value: i + 1,
      label: `${i + 1}`,
    }));

    return { yearOptions: yearOpts, monthOptions: monthOpts, dayOptions: dayOpts };
  }, [form.watch('dateOfBirth.year'), form.watch('dateOfBirth.month')]);

  return (
    <Card>
      <CardHeader className="items-center text-center">
        <div className="flex items-center gap-2 mb-4">
            <LogoIcon className="w-8 h-8" />
            <h1 className="text-xl font-bold text-foreground">PolarisApp</h1>
        </div>
        <CardTitle>Cadastro</CardTitle>
        <CardDescription>Crie sua conta para começar a monitorar sua saúde.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="seu@email.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormItem>
                <FormLabel>Data de Nascimento</FormLabel>
                <div className="grid grid-cols-3 gap-2">
                     <Controller
                        control={form.control}
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
                        control={form.control}
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
                        control={form.control}
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
                 <FormMessage>{form.formState.errors.dateOfBirth?.day?.message}</FormMessage>
            </FormItem>
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Crie uma senha" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full">Criar Conta</Button>
          </form>
        </Form>
        <div className="mt-4 text-center text-sm">
          Já tem uma conta?{" "}
          <Link href="/auth/login" className="underline">
            Faça login
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
