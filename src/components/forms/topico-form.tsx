
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useData } from "@/hooks/use-data";
import { useToast } from "@/hooks/use-toast";
import { Disciplina, Topico } from "@/types";

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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const formSchema = z.object({
  nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  disciplinaId: z.string(),
});

export function TopicoForm({ open, onOpenChange, disciplina, topico }: { open: boolean; onOpenChange: (open: boolean) => void; disciplina: Disciplina, topico?: Topico }) {
  const dataSource = useData();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: topico || {
      nome: "",
      disciplinaId: disciplina.id,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) => {
      const dataToSave = { ...topico, ...values };
      return topico
        ? dataSource.update("topicos", topico.id, dataToSave)
        : dataSource.create("topicos", dataToSave);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topicos", disciplina.id] });
      toast({ title: "Sucesso!", description: `Tópico ${topico ? 'atualizado' : 'criado'} com sucesso.` });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Erro!", description: error.message || "Não foi possível salvar o tópico." });
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutation.mutate(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{topico ? "Editar" : "Novo"} Tópico</DialogTitle>
          <DialogDescription>
            Adicionando tópico para a disciplina: <span className="font-semibold">{disciplina.nome}</span>
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Tópico</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Direitos Fundamentais" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

