

"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Questao, QuestionDificuldade, QuestionOrigem, QuestionTipo, Topico } from "@/types";
import { useData } from "@/hooks/use-data";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Trash2 } from "lucide-react";
import { suggestSimilarQuestions } from "@/ai/flows/suggest-similar-questions";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Skeleton } from "../ui/skeleton";

const formSchema = z.object({
  disciplinaId: z.string().min(1, "Disciplina é obrigatória"),
  topicoId: z.string().min(1, "Tópico é obrigatório"),
  tipo: z.enum(["Múltipla Escolha", "Certo ou Errado", "Completar Lacuna", "Flashcard"]),
  dificuldade: z.enum(["Fácil", "Médio", "Difícil"]),
  origem: z.enum(["Autoral", "Conteúdo", "Legislação", "Jurisprudência", "Já caiu"]),
  enunciado: z.string().min(10, "Enunciado é muito curto").max(2000, "Enunciado muito longo"),
  alternativas: z.array(z.string()).optional(),
  respostaCorreta: z.any(),
  explicacao: z.string().optional(),
}).refine(data => {
    if (data.tipo === 'Múltipla Escolha') {
        return data.alternativas && data.alternativas.length >= 2 && data.respostaCorreta !== undefined;
    }
    return true;
}, { message: "Questões de múltipla escolha devem ter pelo menos 2 alternativas e uma resposta correta.", path: ["respostaCorreta"] });


export function QuestionForm({ open, onOpenChange, questao }: { open: boolean; onOpenChange: (open: boolean) => void; questao?: Questao }) {
  const dataSource = useData();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tipo: "Múltipla Escolha",
      dificuldade: "Médio",
      origem: "Autoral",
      enunciado: "",
      alternativas: ["", "", "", ""],
    },
  });

  useEffect(() => {
    if(open && questao) {
       let alternativas = questao.alternativas;
        if (typeof alternativas === 'string') {
          try {
            alternativas = JSON.parse(alternativas);
          } catch(e) {
            console.error("Failed to parse alternativas", e);
            alternativas = [];
          }
        }
        
        let respostaCorreta = questao.respostaCorreta;
        try {
            respostaCorreta = JSON.parse(questao.respostaCorreta);
        } catch(e) {
            // not a json, use as is
        }


        if (questao.tipo === 'Múltipla Escolha' && Array.isArray(alternativas)) {
            respostaCorreta = alternativas.indexOf(respostaCorreta).toString();
        }

        form.reset({
            ...questao,
            alternativas: Array.isArray(alternativas) ? alternativas : [],
            respostaCorreta: respostaCorreta,
        });
    } else if (open && !questao) {
        form.reset({
            tipo: "Múltipla Escolha",
            dificuldade: "Médio",
            origem: "Autoral",
            enunciado: "",
            alternativas: ["", "", "", ""],
            respostaCorreta: undefined,
            disciplinaId: undefined,
            topicoId: undefined,
            explicacao: "",
        });
    }
  }, [open, questao, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "alternativas",
  });
  
  const { data: disciplinas } = useQuery({ queryKey: ['disciplinas'], queryFn: () => dataSource.list('disciplinas') });
  
  const selectedDisciplinaId = form.watch("disciplinaId");
  const { data: topicos } = useQuery({ 
      queryKey: ['topicos', selectedDisciplinaId], 
      queryFn: () => dataSource.list<Topico>('topicos', { filter: `disciplinaId = "${selectedDisciplinaId}"` }),
      enabled: !!selectedDisciplinaId,
  });


  const mutation = useMutation({
    mutationFn: (newQuestao: z.infer<typeof formSchema>) => {
      let finalData: Partial<Questao> = {
        ...newQuestao,
        version: questao?.version ?? 1,
        isActive: true,
        hashConteudo: 'temp-hash'
      };

      let finalRespostaCorreta = newQuestao.respostaCorreta;

      if (newQuestao.tipo === 'Múltipla Escolha' && Array.isArray(newQuestao.alternativas)) {
        finalRespostaCorreta = newQuestao.alternativas[parseInt(newQuestao.respostaCorreta)];
        finalData.alternativas = JSON.stringify(newQuestao.alternativas);
      } else {
        finalData.alternativas = "[]"; 
      }
      
      finalData.respostaCorreta = JSON.stringify(finalRespostaCorreta);
      
      return questao
        ? dataSource.update('questoes', questao.id, finalData as Partial<Questao>)
        : dataSource.create('questoes', finalData as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questoes'] });
      toast({ title: "Sucesso!", description: `Questão ${questao ? 'atualizada' : 'criada'} com sucesso.` });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error(error);
      toast({ variant: "destructive", title: "Erro!", description: "Não foi possível salvar a questão." });
    },
  });
  
  const [similarQuestions, setSimilarQuestions] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  async function handleSuggestSimilar() {
    const enunciado = form.getValues("enunciado");
    if(!enunciado) {
      toast({ variant: "destructive", title: "Oops!", description: "Escreva o enunciado antes de pedir sugestões." });
      return;
    }
    setIsAiLoading(true);
    setSimilarQuestions([]);
    try {
      const result = await suggestSimilarQuestions({ enunciado });
      setSimilarQuestions(result.similarQuestions);
    } catch(e) {
      toast({ variant: "destructive", title: "Erro de IA", description: "Não foi possível gerar sugestões." });
    } finally {
      setIsAiLoading(false);
    }
  }

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutation.mutate(values);
  }

  const tipo = form.watch("tipo");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] md:max-w-[700px] lg:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{questao ? "Editar" : "Nova"} Questão</DialogTitle>
          <DialogDescription>Preencha os detalhes da sua questão.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
            <div className="grid md:grid-cols-2 gap-4">
               <FormField control={form.control} name="disciplinaId" render={({ field }) => (
                  <FormItem>
                      <FormLabel>Disciplina</FormLabel>
                      <Select onValueChange={(value) => {
                          field.onChange(value)
                          form.setValue('topicoId', '');
                      }} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Selecione a disciplina"/></SelectTrigger></FormControl>
                          <SelectContent>
                              {disciplinas?.map(d => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
                          </SelectContent>
                      </Select>
                      <FormMessage />
                  </FormItem>
               )}/>
               <FormField control={form.control} name="topicoId" render={({ field }) => (
                  <FormItem>
                      <FormLabel>Tópico</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!selectedDisciplinaId || !topicos}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Selecione o tópico"/></SelectTrigger></FormControl>
                          <SelectContent>
                                {topicos?.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                          </SelectContent>
                      </Select>
                      <FormMessage />
                  </FormItem>
               )}/>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
                <FormField control={form.control} name="tipo" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Tipo</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                            <SelectContent>
                                {(['Múltipla Escolha', 'Certo ou Errado', 'Completar Lacuna', 'Flashcard'] as QuestionTipo[]).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </FormItem>
                )}/>
                <FormField control={form.control} name="dificuldade" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Dificuldade</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                            <SelectContent>
                                {(['Fácil', 'Médio', 'Difícil'] as QuestionDificuldade[]).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </FormItem>
                )}/>
                <FormField control={form.control} name="origem" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Origem</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                            <SelectContent>
                                {(['Autoral', 'Conteúdo', 'Legislação', 'Jurisprudência', 'Já caiu'] as QuestionOrigem[]).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </FormItem>
                )}/>
            </div>

            <FormField control={form.control} name="enunciado" render={({ field }) => (
                <FormItem>
                    <FormLabel>Enunciado</FormLabel>
                    <FormControl><Textarea placeholder="Digite o enunciado aqui..." {...field} rows={5} /></FormControl>
                    <FormMessage/>
                </FormItem>
            )}/>
            
            {tipo === 'Múltipla Escolha' && (
              <div className="space-y-4 rounded-md border p-4">
                <FormLabel>Alternativas</FormLabel>
                <FormField control={form.control} name="respostaCorreta" render={({ field: radioField }) => (
                  <RadioGroup onValueChange={val => radioField.onChange(val)} value={radioField.value?.toString()} className="space-y-2">
                    {fields.map((field, index) => (
                      <FormField key={field.id} control={form.control} name={`alternativas.${index}`}
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2">
                            <FormControl>
                                <div className="flex items-center gap-2 w-full">
                                    <RadioGroupItem value={index.toString()} id={`alt-radio-${index}`} />
                                    <Input {...field} placeholder={`Alternativa ${index + 1}`}/>
                                    {fields.length > 2 && <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4"/></Button>}
                                </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    ))}
                  </RadioGroup>
                )}/>
                 <Button type="button" variant="outline" size="sm" onClick={() => append("")}>Adicionar Alternativa</Button>
              </div>
            )}
            
            {tipo === 'Certo ou Errado' && (
                <FormField control={form.control} name="respostaCorreta" render={({ field }) => (
                    <FormItem className="space-y-3 rounded-md border p-4">
                        <FormLabel>Resposta Correta</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={(val) => field.onChange(val === 'true')} value={field.value?.toString()} className="flex gap-4">
                                <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="true"/></FormControl><FormLabel className="font-normal">Certo</FormLabel></FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="false"/></FormControl><FormLabel className="font-normal">Errado</FormLabel></FormItem>
                            </RadioGroup>
                        </FormControl>
                    </FormItem>
                )}/>
            )}

            {tipo === 'Completar Lacuna' && (
                 <FormField control={form.control} name="respostaCorreta" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Texto da Lacuna</FormLabel>
                        <FormControl><Input placeholder="Resposta da lacuna" {...field} value={field.value || ''}/></FormControl>
                        <FormMessage/>
                    </FormItem>
                )}/>
            )}

            {tipo === 'Flashcard' && (
                 <FormField control={form.control} name="respostaCorreta" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Verso do Cartão (Resposta)</FormLabel>
                        <FormControl><Textarea placeholder="Resposta do flashcard" {...field} value={field.value || ''}/></FormControl>
                        <FormMessage/>
                    </FormItem>
                )}/>
            )}

             <FormField control={form.control} name="explicacao" render={({ field }) => (
                <FormItem>
                    <FormLabel>Explicação</FormLabel>
                    <FormControl><Textarea placeholder="Explicação detalhada da resposta correta..." {...field} value={field.value || ''}/></FormControl>
                </FormItem>
            )}/>
            
            <div className="space-y-4 rounded-md border p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Sugestões de IA</h3>
                <Button type="button" variant="outline" size="sm" onClick={handleSuggestSimilar} disabled={isAiLoading}>
                  {isAiLoading ? "Gerando..." : "Sugerir similares"}
                </Button>
              </div>
              {isAiLoading && <div className="space-y-2"><Skeleton className="h-4 w-full"/><Skeleton className="h-4 w-[90%]"/><Skeleton className="h-4 w-[95%]"/></div>}
              {similarQuestions.length > 0 && (
                <Alert>
                  <AlertTitle>Questões Similares Sugeridas</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-5 space-y-1 mt-2">
                      {similarQuestions.map((q, i) => <li key={i}>{q}</li>)}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Salvando...' : 'Salvar'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
