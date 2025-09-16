
"use client"

import { Cross2Icon } from "@radix-ui/react-icons"
import { Table } from "@tanstack/react-table"
import React from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"

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

import { Disciplina, QuestionDificuldade, Questao, Topico } from "@/types"
import { useData } from "@/hooks/use-data"
import { useToast } from "@/hooks/use-toast"


interface DataTableToolbarProps<TData> {
  table: Table<TData>
  disciplinas: Disciplina[];
  topicos: Topico[];
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
  const queryClient = useQueryClient()
  const dataSource = useData()
  const { toast } = useToast()

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => dataSource.bulkDelete('questoes', ids),
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Questões selecionadas excluídas." });
      queryClient.invalidateQueries({ queryKey: ["questoes"] });
      table.resetRowSelection();
    },
    onError: (error) => {
       toast({ variant: "destructive", title: "Erro!", description: error.message || "Não foi possível excluir as questões." });
    }
  });

  const handleDeleteSelected = () => {
    const selectedIds = table.getFilteredSelectedRowModel().rows.map(row => (row.original as Questao).id);
    if (selectedIds.length > 0) {
      deleteMutation.mutate(selectedIds);
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
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" >Excluir ({table.getFilteredSelectedRowModel().rows.length})</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir Questões?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir as {table.getFilteredSelectedRowModel().rows.length} questões selecionadas? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteSelected} disabled={deleteMutation.isPending}>
                    {deleteMutation.isPending ? 'Excluindo...' : 'Sim, Excluir'}
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

    