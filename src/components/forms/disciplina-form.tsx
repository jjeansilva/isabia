
"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useData } from "@/hooks/use-data";
import { useToast } from "@/hooks/use-toast";
import { Disciplina } from "@/types";

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
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  descricao: z.string().optional(),
  cor: z.string().regex(/^#[0-9A-F]{6}$/i, "Cor inválida. Use o formato hexadecimal (ex: #RRGGBB).").optional(),
});

const colors = ["#00329C", "#32BAD9", "#03A688", "#F2B705", "#F28705", "#D95204", "#A62F03"];


export function DisciplinaForm({ open, onOpenChange, disciplina }: { open: boolean; onOpenChange: (open: boolean) => void; disciplina?: Disciplina }) {
  const dataSource = useData();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: "",
      descricao: "",
      cor: colors[0],
    },
  });

  useEffect(() => {
    if (disciplina) {
      form.reset({
        nome: disciplina.nome || "",
        descricao: disciplina.descricao || "",
        cor: disciplina.cor || colors[0],
      });
    } else {
      form.reset({
        nome: "",
        descricao: "",
        cor: colors[0],
      });
    }
  }, [disciplina, form, open]);

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) => {
      if (disciplina) {
        return dataSource.update("isabia_disciplinas", disciplina.id, values);
      }
      return dataSource.create("isabia_disciplinas", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disciplinas"] });
      toast({ title: "Sucesso!", description: `Disciplina ${disciplina ? 'atualizada' : 'criada'} com sucesso.` });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Erro!", description: error.message || "Não foi possível salvar a disciplina." });
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutation.mutate(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{disciplina ? "Editar" : "Nova"} Disciplina</DialogTitle>
          <DialogDescription>
            Defina as informações da disciplina para organizar seus estudos.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Direito Constitucional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Breve resumo sobre a disciplina" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="cor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                        {colors.map(color => (
                            <Button 
                                key={color}
                                type="button"
                                variant="outline"
                                size="icon"
                                className={`w-8 h-8 rounded-full ${field.value === color ? 'ring-2 ring-ring ring-offset-2' : ''}`}
                                style={{backgroundColor: color}}
                                onClick={() => field.onChange(color)}
                            />
                        ))}
                    </div>
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
