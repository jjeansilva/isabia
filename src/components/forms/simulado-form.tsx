"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useData } from "@/hooks/use-data";
import { useToast } from "@/hooks/use-toast";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SimuladoDificuldade } from "@/types";

const formSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres."),
  disciplinaId: z.string().min(1, "Disciplina é obrigatória."),
  quantidade: z.coerce.number().min(1, "Pelo menos 1 questão.").max(100, "Máximo de 100 questões."),
  dificuldade: z.enum(["facil", "dificil", "aleatorio"]),
});

export function SimuladoForm() {
    const router = useRouter();
    const dataSource = useData();
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            nome: "",
            quantidade: 10,
            dificuldade: "aleatorio",
        },
    });

    const { data: disciplinas } = useQuery({ 
        queryKey: ['disciplinas'], 
        queryFn: () => dataSource.list('disciplinas') 
    });

    const mutation = useMutation({
        mutationFn: (criteria: z.infer<typeof formSchema>) => dataSource.gerarSimulado(criteria),
        onSuccess: (newSimulado) => {
            toast({ title: "Sucesso!", description: "Simulado criado. Começando agora..." });
            router.push(`/simulados/${newSimulado.id}`);
        },
        onError: (error) => {
            toast({ variant: "destructive", title: "Erro!", description: error.message || "Não foi possível gerar o simulado." });
        },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        mutation.mutate(values);
    }
    
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField control={form.control} name="nome" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nome do Simulado</FormLabel>
                        <FormControl><Input placeholder="Ex: Simulado de Direito Constitucional" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                <div className="grid md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="disciplinaId" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Disciplina</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {disciplinas?.map(d => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="quantidade" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nº de Questões</FormLabel>
                            <FormControl><Input type="number" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="dificuldade" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Dificuldade</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {(["aleatorio", "facil", "dificil"] as SimuladoDificuldade[]).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}/>
                </div>
                <div className="flex justify-end">
                    <Button type="submit" disabled={mutation.isPending}>
                        {mutation.isPending ? "Gerando..." : "Gerar e Iniciar Simulado"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
