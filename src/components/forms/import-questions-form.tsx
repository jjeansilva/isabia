
"use client";

import { useForm } from "react-hook-form";
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
import { Button } from "@/components/ui/button";
import { useData } from "@/hooks/use-data";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { ImportProgress, QuestionOrigem, QuestionTipo } from "@/types";
import { Input } from "../ui/input";
import { useState } from "react";
import { ScrollArea } from "../ui/scroll-area";

const formSchema = z.object({
  tipo: z.enum(["Múltipla Escolha", "Certo ou Errado", "Completar Lacuna", "Flashcard"]),
  origem: z.enum(["Autoral", "Conteúdo", "Legislação", "Jurisprudência", "Já caiu"]),
  csvFile: z
    .custom<FileList>()
    .refine((files) => files?.length > 0, "O arquivo CSV é obrigatório.")
    .refine((files) => files?.[0]?.type === "text/csv", "O arquivo deve ser do tipo CSV."),
});


export function ImportQuestionsForm({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void; }) {
  const dataSource = useData();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [progress, setProgress] = useState<ImportProgress | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tipo: "Múltipla Escolha",
      origem: "Autoral",
      csvFile: undefined,
    },
  });
  
  const handleClose = () => {
    if (mutation.isPending) return;
    onOpenChange(false);
    setProgress(null);
    form.reset();
  }

  const mutation = useMutation({
    mutationFn: (data: {csvData: string, tipo: QuestionTipo, origem: QuestionOrigem}) => {
      if (!('bulkCreateFromCsv' in dataSource && typeof dataSource.bulkCreateFromCsv === 'function')) {
          toast({ variant: "destructive", title: "Erro!", description: "A importação de CSV não é suportada pelo provedor de dados atual." });
          return Promise.reject("Bulk create from CSV not supported");
      }
      return dataSource.bulkCreateFromCsv(data.csvData, data.tipo, data.origem, (prog) => {
        setProgress(prog);
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['questoes'] });
      queryClient.invalidateQueries({ queryKey: ['disciplinas'] });
      queryClient.invalidateQueries({ queryKey: ['topicos'] });
      toast({ title: "Sucesso!", description: `${result} questões importadas com sucesso.` });
      setProgress({ message: `Concluído! ${result} questões importadas.`, current: result, total: result });
      // Don't close automatically, let user see the final result.
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Erro na Importação!", description: error.message || "Não foi possível importar as questões." });
      setProgress({ message: `Erro: ${error.message}`, current: progress?.current ?? 0, total: progress?.total ?? 0, isError: true });
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const file = values.csvFile[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const csvData = e.target?.result as string;
      if (csvData) {
        mutation.mutate({csvData, tipo: values.tipo, origem: values.origem});
      } else {
        toast({ variant: "destructive", title: "Erro!", description: "Não foi possível ler o arquivo CSV." });
      }
    };
    reader.readAsText(file);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl flex flex-col h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Importar Questões via CSV</DialogTitle>
          <DialogDescription>Selecione o tipo, a origem, escolha o arquivo CSV e importe em lote.</DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-6 pl-1 space-y-4">
            {mutation.isPending || progress ? (
              <div className="space-y-4">
                <h3 className="font-semibold">Progresso da Importação</h3>
                <div className="w-full bg-muted rounded-full h-2.5">
                   <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progress ? (progress.current / progress.total) * 100 : 0}%` }}></div>
                </div>
                <p className={`text-sm ${progress?.isError ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {progress?.message || 'Iniciando importação...'}
                </p>
                <ScrollArea className="h-64 w-full rounded-md border p-4 bg-muted/50">
                    <pre className="text-xs whitespace-pre-wrap break-all">{progress?.log?.join('\n')}</pre>
                </ScrollArea>
              </div>
            ) : (
              <>
                 <Alert>
                    <AlertTitle>Formato do CSV</AlertTitle>
                    <AlertDescription>
                        <p>O CSV deve conter o seguinte cabeçalho na primeira linha:</p>
                        <pre className="mt-2 text-xs bg-muted p-2 rounded-md whitespace-pre-wrap break-all">
        {`"dificuldade","disciplina","tópico da disciplina","subtópico","questão","resposta","alternativa_2","alternativa_3","...","explicação"`}
                        </pre>
                        <p className="mt-2 text-sm text-muted-foreground">
                        Para questões de <span className="font-bold">Múltipla Escolha</span>, a resposta correta vai na coluna "resposta", e as demais nas colunas "alternativa_x". <br/>
                        Para <span className="font-bold">Certo ou Errado</span>, a resposta é "Certo" ou "Errado". <br/>
                        Disciplinas e tópicos que não existirem serão criados.
                        </p>
                    </AlertDescription>
                </Alert>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-2">
                    <div className="grid md:grid-cols-2 gap-4">
                        <FormField
                        control={form.control}
                        name="tipo"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Tipo de Questão</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {((["Certo ou Errado", "Múltipla Escolha", "Completar Lacuna", "Flashcard"] as QuestionTipo[])).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="origem"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Origem das Questões</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {((['Autoral', 'Conteúdo', 'Legislação', 'Jurisprudência', 'Já caiu'] as QuestionOrigem[])).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </div>
                    <FormField
                    control={form.control}
                    name="csvFile"
                    render={({ field: { onChange, value, ...rest } }) => (
                        <FormItem>
                        <FormLabel>Arquivo CSV</FormLabel>
                        <FormControl>
                            <Input
                            type="file"
                            accept=".csv"
                            onChange={(e) => onChange(e.target.files)}
                            {...rest}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </form>
                </Form>
              </>
            )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={handleClose} disabled={mutation.isPending}>
            {progress ? 'Fechar' : 'Cancelar' }
          </Button>
          <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={mutation.isPending || progress !== null}>
            {mutation.isPending ? 'Importando...' : 'Importar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
