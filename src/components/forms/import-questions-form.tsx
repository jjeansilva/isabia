
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
import { QuestionTipo } from "@/types";
import { Input } from "../ui/input";

const formSchema = z.object({
  tipo: z.enum(["Múltipla Escolha", "Certo ou Errado", "Completar Lacuna", "Flashcard"]),
  csvFile: z
    .custom<FileList>()
    .refine((files) => files?.length > 0, "O arquivo CSV é obrigatório.")
    .refine((files) => files?.[0]?.type === "text/csv", "O arquivo deve ser do tipo CSV."),
});


export function ImportQuestionsForm({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void; }) {
  const dataSource = useData();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tipo: "Certo ou Errado",
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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const file = values.csvFile[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const csvData = e.target?.result as string;
      if (csvData) {
        mutation.mutate({csvData, tipo: values.tipo});
      } else {
        toast({ variant: "destructive", title: "Erro!", description: "Não foi possível ler o arquivo CSV." });
      }
    };
    reader.readAsText(file);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Importar Questões via CSV</DialogTitle>
          <DialogDescription>Selecione o tipo, escolha o arquivo CSV e importe em lote.</DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-6 pl-1 space-y-4">
            <Alert>
                <AlertTitle>Formato do CSV</AlertTitle>
                <AlertDescription>
                    <p>O CSV deve conter o seguinte cabeçalho na primeira linha:</p>
                    <pre className="mt-2 text-xs bg-muted p-2 rounded-md whitespace-pre-wrap break-all">
    {`"dificuldade","disciplina","tópico da disciplina","subtópico","origem","questão","resposta","alternativa_2","alternativa_3","...","explicação"`}
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
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={mutation.isPending}>{mutation.isPending ? 'Importando...' : 'Importar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
