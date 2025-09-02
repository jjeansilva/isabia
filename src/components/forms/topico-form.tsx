
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  disciplinaId: z.string(),
  topicoPaiId: z.string().optional(),
});

export function TopicoForm({ open, onOpenChange, disciplina, topico, topicoPai }: { 
    open: boolean; 
    onOpenChange: (open: boolean) => void; 
    disciplina: Disciplina; 
    topico?: Topico,
    topicoPai?: Topico,
}) {
  const dataSource = useData();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: topico || {
      nome: "",
      disciplinaId: disciplina.id,
      topicoPaiId: topicoPai?.id,
    },
  });

  const { data: topicosDaDisciplina } = useQuery({
      queryKey: ['topicos', disciplina.id],
      queryFn: () => dataSource.list<Topico>('topicos', { filter: `disciplinaId = "${disciplina.id}" && topicoPaiId = ""` }),
      enabled: open, // only fetch when dialog is open
  });

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) => {
      const dataToSave = { ...topico, ...values };
      if (!dataToSave.topicoPaiId) {
          dataToSave.topicoPaiId = "";
      }
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
  
  const dialogTitle = topicoPai ? "Novo Subtópico" : (topico ? "Editar Tópico" : "Novo Tópico");
  const dialogDescription = topicoPai 
    ? `Adicionando subtópico para "${topicoPai.nome}"`
    : `Adicionando tópico para a disciplina: ${disciplina.nome}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
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
                    <Input placeholder={topicoPai ? "Ex: Cláusulas Pétreas" : "Ex: Direitos Fundamentais"} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!topicoPai && !topico?.topicoPaiId && (
                 <FormField
                    control={form.control}
                    name="topicoPaiId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Tópico Pai (Opcional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value || ""}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Nenhum (Tópico Principal)"/></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="">Nenhum (Tópico Principal)</SelectItem>
                                {topicosDaDisciplina?.filter(t => t.id !== topico?.id).map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}/>
            )}
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
