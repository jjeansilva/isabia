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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useData } from "@/hooks/use-data";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

const formSchema = z.object({
  csv: z.string().min(1, "O conteúdo CSV não pode estar vazio."),
});


export function ImportQuestionsForm({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void; }) {
  const dataSource = useData();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      csv: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (csvData: string) => {
      if (!('bulkCreateFromCsv' in dataSource && typeof dataSource.bulkCreateFromCsv === 'function')) {
          toast({ variant: "destructive", title: "Erro!", description: "A importação de CSV não é suportada pelo provedor de dados atual." });
          return Promise.reject("Bulk create from CSV not supported");
      }
      return dataSource.bulkCreateFromCsv(csvData);
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
    mutation.mutate(values.csv);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] md:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Importar Questões via CSV</DialogTitle>
          <DialogDescription>Cole o conteúdo do seu arquivo CSV abaixo para importar em lote.</DialogDescription>
        </DialogHeader>
        <Alert>
            <AlertTitle>Formato do CSV</AlertTitle>
            <AlertDescription>
                <p>O CSV deve conter o seguinte cabeçalho na primeira linha:</p>
                <pre className="mt-2 text-xs overflow-auto bg-muted p-2 rounded-md">
{`"tipo","dificuldade","disciplina","tópico da disciplina","subtópico da disciplina","questão","resposta","breve explicação"`}
                </pre>
                 <p className="mt-2 text-sm text-muted-foreground">Disciplinas e tópicos que não existirem serão criados automaticamente.</p>
            </AlertDescription>
        </Alert>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
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
