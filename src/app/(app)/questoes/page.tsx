
"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useData } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Questao, Disciplina, Topico } from "@/types";
import { QuestionForm } from "@/components/forms/question-form";
import { ImportQuestionsForm } from "@/components/forms/import-questions-form";
import { QuestoesDataTable } from "@/components/tables/questoes-data-table";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportedQuestionsList } from "@/components/tables/reported-questions-list";
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

export default function QuestoesPage() {
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
    refetchOnWindowFocus: true,
  });

  // --- Memos ---
  const reportedQuestoes = useMemo(() => {
    return (questoes ?? []).filter(q => q.necessitaRevisao);
  }, [questoes]);
  
  const isLoading = isLoadingDisciplinas || isLoadingTopicos || isLoadingQuestoes;

  // --- Mutations ---
  const deleteMutation = useMutation({
    mutationFn: (id: string) => dataSource.delete('questoes', id),
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Questão excluída." });
      queryClient.invalidateQueries({ queryKey: ["questoes"] });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Erro!", description: error.message || "Não foi possível excluir a questão." });
    },
    onSettled: () => {
      setQuestaoToDelete(null);
    }
  });

  const markAsCorrectedMutation = useMutation({
    mutationFn: (questao: Questao) => dataSource.update('questoes', questao.id, {
        necessitaRevisao: false,
        motivoRevisao: ''
    }),
    onSuccess: (_, questao) => {
        toast({ title: "Questão Corrigida!", description: `A questão foi marcada como corrigida.`});
        queryClient.invalidateQueries({ queryKey: ["questoes"] });
    },
    onError: (error) => {
        toast({ variant: "destructive", title: "Erro!", description: error.message || "Não foi possível marcar a questão como corrigida." });
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

  const handleMarkAsCorrected = useCallback((q: Questao) => {
    markAsCorrectedMutation.mutate(q);
  }, [markAsCorrectedMutation]);

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
      <PageHeader title="Banco de Questões" description="Gerencie seu acervo de questões para simulados e revisões.">
        <Button onClick={handleNewQuestion}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nova Questão
        </Button>
      </PageHeader>
      
      <Card className="mb-6">
        <CardHeader>
            <CardTitle>Card de Teste</CardTitle>
        </CardHeader>
        <CardContent>
            <p>Este é um card de teste estático.</p>
        </CardContent>
      </Card>
      
      <div className="space-y-6">
        {isLoading ? (
           <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
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
      
      {isFormOpen && <QuestionForm open={isFormOpen} onOpenChange={handleCloseForm} questao={selectedQuestao} />}
      {showImportModal && <ImportQuestionsForm open={showImportModal} onOpenChange={setShowImportModal} />}
      
      <AlertDialog open={!!questaoToDelete} onOpenChange={(open) => !open && setQuestaoToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Questão?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a questão "{questaoToDelete?.enunciado.substring(0, 50)}..."? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => questaoToDelete && deleteMutation.mutate(questaoToDelete.id)} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? 'Excluindo...' : 'Sim, Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
