
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useData } from "@/hooks/use-data";
import { useToast } from "@/hooks/use-toast";
import { Questao } from "@/types";

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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  motivoRevisao: z.string().min(10, "Por favor, descreva o problema com pelo menos 10 caracteres."),
});

export function ReportErrorForm({ open, onOpenChange, questao }: { open: boolean; onOpenChange: (open: boolean) => void; questao: Questao }) {
  const dataSource = useData();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      motivoRevisao: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) => {
        return dataSource.update("questoes_abcde1", questao.id, { 
            necessitaRevisao: true,
            motivoRevisao: values.motivoRevisao 
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questoes", questao.id] });
      queryClient.invalidateQueries({ queryKey: ["questoes"] }); // Invalidate list view
      toast({ title: "Erro Reportado!", description: "Obrigado pela sua contribuição. A questão será revisada." });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Erro!", description: error.message || "Não foi possível reportar o erro." });
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutation.mutate(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Reportar Erro na Questão</DialogTitle>
          <DialogDescription>
            Ajude-nos a melhorar. Descreva o problema que você encontrou nesta questão.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="p-4 border rounded-md bg-muted/50">
                <p className="text-sm font-medium">Questão:</p>
                <p className="text-sm text-muted-foreground line-clamp-3">{questao.enunciado}</p>
            </div>
            <FormField
              control={form.control}
              name="motivoRevisao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição do Problema</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ex: A resposta correta está errada, o enunciado não está claro, erro de digitação..." {...field} rows={4}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Enviando...' : 'Enviar Reporte'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
