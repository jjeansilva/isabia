
"use client";

import { useForm, useFieldArray, useFormContext } from "react-hook-form";
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
import { Disciplina, QuestionDificuldade, StatusQuestoesSimulado, Topico } from "@/types";
import { PlusCircle, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

const criterioSchema = z.object({
  disciplinaId: z.string().min(1, "Disciplina é obrigatória."),
  topicoId: z.string().optional(),
  quantidade: z.coerce.number().min(1, "Mínimo 1.").max(100, "Máx 100."),
  dificuldade: z.enum(["Fácil", "Médio", "Difícil", "aleatorio"]),
  statusQuestoes: z.enum(["todas", "nao_resolvidas", "resolvidas", "erradas", "acertadas"]),
});

const formSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres."),
  criterios: z.array(criterioSchema).min(1, "Adicione pelo menos um critério."),
});

export type SimuladoFormValues = z.infer<typeof formSchema>;

const statusQuestoesOptions: { value: StatusQuestoesSimulado, label: string }[] = [
    { value: "todas", label: "Todas" },
    { value: "nao_resolvidas", label: "Não Resolvidas" },
    { value: "resolvidas", label: "Resolvidas" },
    { value: "erradas", label: "Somente Erradas" },
    { value: "acertadas", label: "Somente Acertadas" },
]

function CriterioRow({ index, remove }: { index: number; remove: (index: number) => void; }) {
  const dataSource = useData();
  const form = useFormContext<SimuladoFormValues>();

  const { data: disciplinas } = useQuery({ 
      queryKey: ['disciplinas'], 
      queryFn: () => dataSource.list<Disciplina>('disciplinas_abcde1') 
  });

  const selectedDisciplinaId = form.watch(`criterios.${index}.disciplinaId`);
  const { data: topicos } = useQuery({ 
      queryKey: ['topicos', selectedDisciplinaId], 
      queryFn: () => dataSource.list<Topico>('topicos_abcde1', { filter: `disciplinaId = "${selectedDisciplinaId}"` }),
      enabled: !!selectedDisciplinaId,
  });

  return (
    <div className="flex flex-col md:flex-row items-start md:items-end gap-2 p-2 sm:p-4 border rounded-lg relative">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 sm:gap-4 w-full">
            <FormField
                control={form.control}
                name={`criterios.${index}.disciplinaId`}
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Disciplina</FormLabel>
                    <Select onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue(`criterios.${index}.topicoId`, 'all');
                    }} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                    <SelectContent>
                        {disciplinas?.map(d => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name={`criterios.${index}.topicoId`}
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Tópico</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedDisciplinaId || !topicos}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger></FormControl>
                    <SelectContent>
                        <SelectItem value="all">Todos os tópicos</SelectItem>
                        {topicos?.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name={`criterios.${index}.quantidade`}
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Nº Questões</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name={`criterios.${index}.dificuldade`}
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Dificuldade</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                        {(["aleatorio", "Fácil", "Médio", "Difícil"] as ( "aleatorio" | QuestionDificuldade)[]).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name={`criterios.${index}.statusQuestoes`}
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                        {statusQuestoesOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="md:absolute md:-right-12 md:top-8">
            <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
    </div>
  )
}


export function SimuladoForm() {
    const router = useRouter();
    const dataSource = useData();
    const { toast } = useToast();

    const form = useForm<SimuladoFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            nome: "",
            criterios: [{ disciplinaId: "", topicoId: "all", quantidade: 10, dificuldade: "aleatorio", statusQuestoes: "todas" }]
        },
    });

    const { fields, append, remove } = useFieldArray({
      control: form.control,
      name: "criterios"
    });

    const mutation = useMutation({
        mutationFn: (criteria: SimuladoFormValues) => dataSource.gerarSimulado(criteria),
        onSuccess: (newSimulado) => {
            toast({ title: "Sucesso!", description: "Simulado criado. Começando agora..." });
            router.push(`/simulados/${newSimulado.id}`);
        },
        onError: (error) => {
            toast({ variant: "destructive", title: "Erro!", description: error.message || "Não foi possível gerar o simulado." });
        },
    });

    function onSubmit(values: SimuladoFormValues) {
        mutation.mutate(values);
    }
    
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Informações Gerais</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <FormField control={form.control} name="nome" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nome do Simulado</FormLabel>
                                <FormControl><Input placeholder="Ex: Simulado Misto - Constitucional e Administrativo" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Critérios das Questões</CardTitle>
                    </CardHeader>
                     <CardContent className="space-y-4">
                        {fields.map((field, index) => (
                          <CriterioRow key={field.id} index={index} remove={remove} />
                        ))}

                        <Button type="button" variant="outline" onClick={() => append({ disciplinaId: "", topicoId: "all", quantidade: 10, dificuldade: "aleatorio", statusQuestoes: "todas" })}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Adicionar Critério
                        </Button>
                     </CardContent>
                </Card>

                <div className="flex justify-end">
                    <Button type="submit" disabled={mutation.isPending}>
                        {mutation.isPending ? "Gerando..." : "Gerar e Iniciar Simulado"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
