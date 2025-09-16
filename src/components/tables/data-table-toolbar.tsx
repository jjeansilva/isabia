
"use client"

import { Cross2Icon } from "@radix-ui/react-icons"
import { Table } from "@tanstack/react-table"
import React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTableViewOptions } from "./data-table-view-options"
import { DataTableFacetedFilter } from "./data-table-faceted-filter"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import { Disciplina, QuestionDificuldade, Questao, Topico, Resposta, Revisao } from "@/types"
import { useData } from "@/hooks/use-data"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  disciplinas: Disciplina[];
  topicos: Topico[];
  onDeleteSelected: (ids: string[]) => void; // This will now be handled internally
}

const dificuldades: { label: string, value: QuestionDificuldade }[] = [
    { label: "Fácil", value: "Fácil" },
    { label: "Médio", value: "Médio" },
    { label: "Difícil", value: "Difícil" },
]

export function DataTableToolbar<TData>({
  table,
  disciplinas,
  topicos,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  
  const dataSource = useData();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      // Find and delete dependent records for all selected questions
      const filter = ids.map(id => `questaoId = "${id}"`).join(' || ');
      
      const [respostasToDelete, revisoesToDelete] = await Promise.all([
        dataSource.list<Resposta>('respostas', { filter, fields: 'id' }),
        dataSource.list<Revisao>('revisoes', { filter, fields: 'id' })
      ]);

      if (respostasToDelete.length > 0) {
        await dataSource.bulkDelete('respostas', respostasToDelete.map(r => r.id));
      }
      if (revisoesToDelete.length > 0) {
        await dataSource.bulkDelete('revisoes', revisoesToDelete.map(r => r.id));
      }

      // Now delete the questions themselves
      return dataSource.bulkDelete('questoes', ids);
    },
    onSuccess: (_, variables) => {
      toast({ title: "Sucesso!", description: `${variables.length} questões e seus dados associados foram excluídas.` });
      queryClient.invalidateQueries({ queryKey: ["questoes"] });
    },
    onError: (error) => {
      console.error("Erro ao excluir questões em massa:", error);
      toast({ variant: "destructive", title: "Erro!", description: (error as Error).message || "Não foi possível excluir as questões selecionadas." });
    },
    onSettled: () => {
      table.resetRowSelection();
      setIsAlertOpen(false);
    }
  });


  const handleDeleteSelected = () => {
    const selectedIds = table.getFilteredSelectedRowModel().rows.map(row => (row.original as Questao).id);
    if (selectedIds.length > 0) {
      bulkDeleteMutation.mutate(selectedIds);
    } else {
      setIsAlertOpen(false);
    }
  };

  const disciplinaOptions = React.useMemo(() => 
    disciplinas.map(d => ({ label: d.nome, value: d.id })),
    [disciplinas]
  )
  
  const disciplinaFilterValue = table.getColumn("disciplinaId")?.getFilterValue() as string[] | undefined;
  
  const topicoOptions = React.useMemo(() => {
    if (!disciplinaFilterValue || disciplinaFilterValue.length === 0) {
        return topicos.map(t => ({ label: t.nome, value: t.id }));
    }
    return topicos
        .filter(t => disciplinaFilterValue.includes(t.disciplinaId))
        .map(t => ({ label: t.nome, value: t.id }));

  }, [topicos, disciplinaFilterValue]);


  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <Input
          placeholder="Filtrar por enunciado..."
          value={(table.getColumn("enunciado")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("enunciado")?.setFilterValue(event.target.value)
          }
          className="h-8 w-full"
        />
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {table.getFilteredSelectedRowModel().rows.length > 0 && (
            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" >Excluir ({table.getFilteredSelectedRowModel().rows.length})</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir Questões?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir as {table.getFilteredSelectedRowModel().rows.length} questões selecionadas? Todos os dados de respostas e revisões associados a elas também serão perdidos. Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteSelected} disabled={bulkDeleteMutation.isPending}>
                    {bulkDeleteMutation.isPending ? 'Excluindo...' : 'Sim, Excluir'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <DataTableViewOptions table={table} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {table.getColumn("disciplinaId") && (
          <DataTableFacetedFilter
            column={table.getColumn("disciplinaId")}
            title="Disciplina"
            options={disciplinaOptions}
          />
        )}
        {table.getColumn("topicoId") && (
          <DataTableFacetedFilter
            column={table.getColumn("topicoId")}
            title="Tópico"
            options={topicoOptions}
          />
        )}
        {table.getColumn("dificuldade") && (
          <DataTableFacetedFilter
            column={table.getColumn("dificuldade")}
            title="Dificuldade"
            options={dificuldades}
          />
        )}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Resetar
            <Cross2Icon className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
