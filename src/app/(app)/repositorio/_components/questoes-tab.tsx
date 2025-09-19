
"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useData } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Questao, Disciplina, Topico, Resposta, Revisao } from "@/types";
import { QuestionForm } from "@/components/forms/question-form";
import { ImportQuestionsForm } from "@/components/forms/import-questions-form";
import { QuestoesDataTable } from "@/components/tables/questoes-data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function QuestoesTab() {
  const dataSource = useData();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedQuestao, setSelectedQuestao] = useState<Questao | undefined>(undefined);
  const [questaoToDelete, setQuestaoToDelete] = useState<Questao | null>(null);
  
  // --- Data Fetching ---
  const { data: disciplinas, isLoading: isLoadingDisciplinas } = useQuery({
    queryKey: ['disciplinas'],
    queryFn: () => dataSource.list<Disciplina>('disciplinas')
  });

  const { data: topicos, isLoading: isLoadingTopicos } = useQuery({
    queryKey: ['topicos'],
    queryFn: () => dataSource.list<Topico>('topicos')
  });

  const { data: questoes, isLoading: isLoadingQuestoes } = useQuery({
    queryKey: ['questoes'],
    queryFn: () => dataSource.list<Questao>('questoes', { expand: 'disciplinaId,topicoId' }),
  });

  const isLoading = isLoadingDisciplinas || isLoadingTopicos || isLoadingQuestoes;

  // --- Mutations ---
  const deleteMutation = useMutation({
    mutationFn: async (questaoId: string) => {
        const respostasFilter = `questaoId = "${questaoId}"`;
        const revisoesFilter = `questaoId = "${questaoId}"`;

        const [respostasToDelete, revisoesToDelete] = await Promise.all([
            dataSource.list<Resposta>('respostas', { filter: respostasFilter, fields: 'id' }),
            dataSource.list<Revisao>('revisoes', { filter: revisoesFilter, fields: 'id' })
        ]);

        if (respostasToDelete.length > 0) {
            await dataSource.bulkDelete('respostas', respostasToDelete.map(r => r.id));
        }
        if (revisoesToDelete.length > 0) {
            await dataSource.bulkDelete('revisoes', revisoesToDelete.map(r => r.id));
        }

        return dataSource.delete('questoes', questaoId);
    },
    onSuccess: () => {
      toast({ title: "Questão excluída!", description: "A questão e seus dados associados foram removidos." });
      queryClient.invalidateQueries({ queryKey: ["questoes"] });
      handleCloseForm();
    },
    onError: (error) => {
      console.error("Erro ao excluir questão:", error);
      toast({ variant: "destructive", title: "Erro!", description: (error as Error).message || "Não foi possível excluir a questão." });
    },
    onSettled: () => {
      setQuestaoToDelete(null);
    }
  });

  // --- Handlers ---
  const handleNewQuestion = useCallback(() => {
    setSelectedQuestao(undefined);
    setIsFormOpen(true);
  }, []);

  const handleEdit = useCallback((q: Questao) => {
    setSelectedQuestao(q);
    setIsFormOpen(true);
  }, []);

  const handleDelete = useCallback((q: Questao) => {
    setQuestaoToDelete(q);
  }, []);
  
  const handleDeleteFromForm = useCallback((q: Questao) => {
      handleCloseForm();
      setTimeout(() => {
        setQuestaoToDelete(q);
      }, 150);
  }, []);

  const handleCloseForm = useCallback(() => {
    setIsFormOpen(false);
    setSelectedQuestao(undefined);
  }, []);

  useEffect(() => {
    const newQuestionParam = searchParams.get('new');
    const importParam = searchParams.get('import');

    if (newQuestionParam === 'true') {
      handleNewQuestion();
    }
    if (importParam === 'true') {
      setShowImportModal(true);
    }
  }, [searchParams, handleNewQuestion]);

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={handleNewQuestion}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nova Questão
        </Button>
      </div>
      
      <div className="space-y-6">
        {isLoading ? (
           <div className="space-y-4">
              <Skeleton className="h-96 w-full" />
           </div>
        ) : (
          <Card>
            <CardContent className="p-2 xs:p-4 sm:p-6">
              <QuestoesDataTable 
                questoes={questoes ?? []} 
                disciplinas={disciplinas ?? []} 
                topicos={topicos ?? []}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </CardContent>
          </Card>
        )}
      </div>
      
      {isFormOpen && <QuestionForm open={isFormOpen} onOpenChange={handleCloseForm} questao={selectedQuestao} onDelete={handleDeleteFromForm} />}
      {showImportModal && <ImportQuestionsForm open={showImportModal} onOpenChange={setShowImportModal} />}
      
      <AlertDialog open={!!questaoToDelete} onOpenChange={(open) => !open && setQuestaoToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Questão?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a questão "{questaoToDelete?.enunciado.substring(0, 50)}..."? Todos os dados de respostas e revisões associados a ela também serão perdidos. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => { 
                if (questaoToDelete) {
                  deleteMutation.mutate(questaoToDelete.id);
                }
              }} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? 'Excluindo...' : 'Sim, Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
