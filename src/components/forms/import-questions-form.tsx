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
import { Questao } from "@/types";
import { useData } from "@/hooks/use-data";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

const questaoSchemaForImport = z.object({
  disciplinaId: z.string(),
  topicoId: z.string(),
  tipo: z.enum(["multipla", "vf", "lacuna", "flashcard"]),
  dificuldade: z.enum(["facil", "medio", "dificil"]),
  origem: z.enum(["autoral", "banca", "importacao"]),
  enunciado: z.string(),
  alternativas: z.array(z.string()).optional(),
  respostaCorreta: z.any(),
  explicacao: z.string().optional(),
});

const formSchema = z.object({
  json: z.string().refine((val) => {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) && parsed.every(item => questaoSchemaForImport.safeParse(item).success);
    } catch (e) {
      return false;
    }
  }, {
    message: "JSON inválido ou não corresponde ao schema de questões.",
  }),
});


export function ImportQuestionsForm({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void; }) {
  const dataSource = useData();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      json: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (newQuestoes: Partial<Questao>[]) => {
      // It's not on the interface, but it's implemented for PocketBase.
      // A better approach would be to add it to the interface.
      if (!('bulkCreate' in dataSource && typeof dataSource.bulkCreate === 'function')) {
          toast({ variant: "destructive", title: "Erro!", description: "A importação em lote não é suportada pelo provedor de dados atual." });
          return Promise.reject("Bulk create not supported");
      }
      return dataSource.bulkCreate('isabia_questoes', newQuestoes);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['questoes'] });
      toast({ title: "Sucesso!", description: `${result.length} questões importadas com sucesso.` });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Erro!", description: error.message || "Não foi possível importar as questões." });
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const questoesToImport = JSON.parse(values.json).map((q: any) => ({
      ...q,
      version: 1,
      isActive: true,
      hashConteudo: 'import-' + new Date().getTime() + Math.random(),
    }));
    mutation.mutate(questoesToImport);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] md:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Importar Questões</DialogTitle>
          <DialogDescription>Cole o array JSON de questões abaixo para importar em lote.</DialogDescription>
        </DialogHeader>
        <Alert>
            <AlertTitle>Formato do JSON</AlertTitle>
            <AlertDescription>
                <pre className="mt-2 text-xs overflow-auto bg-muted p-2 rounded-md">
{`[
  {
    "disciplinaId": "...",
    "topicoId": "...",
    "tipo": "multipla",
    "dificuldade": "facil",
    "origem": "importacao",
    "enunciado": "...",
    "alternativas": ["A", "B"],
    "respostaCorreta": "A",
    "explicacao": "..."
  }
]`}
                </pre>
            </AlertDescription>
        </Alert>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
            <FormField
              control={form.control}
              name="json"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>JSON das Questões</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Cole o seu array de JSON aqui..."
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
