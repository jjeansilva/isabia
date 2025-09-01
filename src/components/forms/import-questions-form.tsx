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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useData } from "@/hooks/use-data";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { QuestionTipo } from "@/types";

const formSchema = z.object({
  tipo: z.enum(["multipla", "vf", "lacuna", "flashcard"]),
  csv: z.string().min(1, "O conteúdo CSV não pode estar vazio."),
});


export function ImportQuestionsForm({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void; }) {
  const dataSource = useData();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tipo: "vf",
      csv: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: {csvData: string, tipo: QuestionTipo}) => {
      if (!('bulkCreateFromCsv' in dataSource && typeof dataSource.bulkCreateFromCsv === 'function')) {
          toast({ variant: "destructive", title: "Erro!", description: "A importação de CSV não é suportada pelo provedor de dados atual." });
          return Promise.reject("Bulk create from CSV not supported");
      }
      return dataSource.bulkCreateFromCsv(data.csvData, data.tipo);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['questoes'] });
      queryClient.invalidateQueries({ queryKey: ['disciplinas'] });
      queryClient.invalidateQueries({ queryKey: ['topicos'] });
      toast({ title: "Sucesso!", description: `${result} questões importadas com sucesso.` });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Erro na Importação!", description: error.message || "Não foi possível importar as questões." });
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutation.mutate({csvData: values.csv, tipo: values.tipo});
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] md:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Questões via CSV</DialogTitle>
          <DialogDescription>Selecione o tipo, cole o conteúdo do seu CSV e importe em lote.</DialogDescription>
        </DialogHeader>
        <Alert>
            <AlertTitle>Formato do CSV</AlertTitle>
            <AlertDescription>
                <p>O CSV deve conter o seguinte cabeçalho na primeira linha:</p>
                <pre className="mt-2 text-xs overflow-auto bg-muted p-2 rounded-md">
{`"dificuldade","disciplina","tópico da disciplina","subtópico","questão","resposta","alternativa_2","alternativa_3","...","explicação"`}
                </pre>
                 <p className="mt-2 text-sm text-muted-foreground">
                   Para questões de <span className="font-bold">Múltipla Escolha</span>, a resposta correta vai na coluna "resposta", e as demais nas colunas "alternativa_x". <br/>
                   Para <span className="font-bold">Verdadeiro/Falso</span>, a resposta é "Verdadeiro" ou "Falso". <br/>
                   Disciplinas e tópicos que não existirem serão criados.
                 </p>
            </AlertDescription>
        </Alert>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Questão</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                        <SelectContent>
                            {(['vf', 'multipla', 'lacuna', 'flashcard'] as QuestionTipo[]).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                    </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="csv"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conteúdo CSV</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Cole o seu conteúdo CSV aqui..."
                      {...field}
                      rows={10}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Importando...' : 'Importar'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
