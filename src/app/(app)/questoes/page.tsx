
"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useData } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2, Search, Loader2 } from "lucide-react";
import { Questao, Disciplina, Topico, Resposta, Revisao } from "@/types";
import { QuestionForm } from "@/components/forms/question-form";
import { ImportQuestionsForm } from "@/components/forms/import-questions-form";
import { QuestoesDataTable } from "@/components/tables/questoes-data-table";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportedQuestionsList } from "@/components/tables/reported-questions-list";
import { useToast } from "@/hooks/use-toast";
import { findDuplicateQuestions } from "@/ai/flows/find-duplicate-questions";
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
import { AlertTriangle } from "lucide-react";

type DuplicateGroup = {
  questionIds: string[];
  reason: string;
};

export default function QuestoesPage() {
  const dataSource = useData();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedQuestao, setSelectedQuestao] = useState<Questao | undefined>(undefined);
  const [questaoToDelete, setQuestaoToDelete] = useState<Questao | null>(null);
  
  // States for duplicate checker
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [questionsToKeep, setQuestionsToKeep] = useState<Record<string, string>>({});


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

  // --- Memos ---
  const reportedQuestoes = useMemo(() => {
    return (questoes ?? []).filter(q => q.necessitaRevisao);
  }, [questoes]);

  const questaoMap = useMemo(() => {
    return new Map((questoes ?? []).map(q => [q.id, q]));
  }, [questoes]);
  
  const isLoading = isLoadingDisciplinas || isLoadingTopicos || isLoadingQuestoes;

  // --- Mutations ---
  const deleteMutation = useMutation({
    mutationFn: async (questaoId: string) => {
        // Find and delete dependent records first
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

        // Now delete the question itself
        return dataSource.delete('questoes', questaoId);
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Questão e seus dados associados foram excluídos." });
      queryClient.invalidateQueries({ queryKey: ["questoes"] });
    },
    onError: (error) => {
      console.error("Erro ao excluir questão:", error);
      toast({ variant: "destructive", title: "Erro!", description: (error as Error).message || "Não foi possível excluir a questão." });
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
        toast({ variant: "destructive", title: "Erro!", description: (error as Error).message || "Não foi possível marcar a questão como corrigida." });
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

  const handleCheckDuplicates = useCallback(async () => {
    if (!questoes || questoes.length < 2) {
      toast({ title: "Poucas questões", description: "É necessário ter pelo menos duas questões para verificar duplicatas."});
      return;
    }
    setIsCheckingDuplicates(true);
    setDuplicateGroups([]);
    setQuestionsToKeep({});
    try {
      const questionData = questoes.map(q => ({ id: q.id, enunciado: q.enunciado }));
      const result = await findDuplicateQuestions({ questions: questionData });
      if (result.duplicateGroups.length === 0) {
        toast({ title: "Nenhuma duplicata encontrada!", description: "Seu banco de questões está livre de duplicatas." });
      } else {
        setDuplicateGroups(result.duplicateGroups);
        const initialKeep: Record<string, string> = {};
        result.duplicateGroups.forEach((group, index) => {
          initialKeep[`group-${index}`] = group.questionIds[0];
        });
        setQuestionsToKeep(initialKeep);
      }
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erro de IA", description: (e as Error).message || "Não foi possível verificar as duplicatas." });
    } finally {
      setIsCheckingDuplicates(false);
    }
  }, [questoes, toast]);

  const handleDeleteDuplicates = useCallback(async () => {
      const idsToDelete = duplicateGroups.flatMap((group, index) => 
        group.questionIds.filter(id => id !== questionsToKeep[`group-${index}`])
      );
      
      if (idsToDelete.length === 0) {
          toast({ title: "Nenhuma ação necessária", description: "Nenhuma questão foi marcada para exclusão." });
          return;
      }
      
      toast({ title: "Excluindo duplicatas...", description: `Excluindo ${idsToDelete.length} questões.`});
      try {
          // Re-using the single delete mutation. For bulk, a new mutation would be better.
          for (const id of idsToDelete) {
              await deleteMutation.mutateAsync(id);
          }
          toast({ title: "Sucesso!", description: "As questões duplicadas foram excluídas." });
          setDuplicateGroups([]); // Clear the list after deletion
          setQuestionsToKeep({});
      } catch (error) {
          // Error toast is handled by the mutation's onError
      }
  }, [duplicateGroups, questionsToKeep, deleteMutation, toast]);

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
      
      <Card className="mb-6 border-destructive">
        <CardHeader>
          <div className="flex items-start gap-4">
              <div className="mt-1">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                  <CardTitle>Questões Reportadas para Correção</CardTitle>
                  <CardDescription>As seguintes questões foram sinalizadas com problemas e precisam de sua atenção.</CardDescription>
              </div>
          </div>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <p>Carregando questões reportadas...</p>
            ) : reportedQuestoes.length > 0 ? (
                <ReportedQuestionsList 
                    questoes={reportedQuestoes}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onMarkAsCorrected={handleMarkAsCorrected}
                />
            ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma questão reportada no momento. Bom trabalho!
                </p>
            )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                    <CardTitle>Verificador de Duplicatas com IA</CardTitle>
                    <CardDescription>Encontre questões semanticamente duplicadas em seu banco de dados.</CardDescription>
                </div>
                <Button onClick={handleCheckDuplicates} disabled={isCheckingDuplicates || isLoading}>
                    {isCheckingDuplicates ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Search className="mr-2 h-4 w-4"/>}
                    {isCheckingDuplicates ? 'Verificando...' : 'Verificar Duplicatas'}
                </Button>
            </div>
        </CardHeader>
        <CardContent>
            {isCheckingDuplicates && <div className="text-center p-8"><p>Analisando questões... Isso pode levar um momento.</p></div>}
            
            {duplicateGroups.length > 0 && (
                <div className="space-y-6">
                    <p className="text-sm text-muted-foreground">Encontramos {duplicateGroups.length} grupo(s) de questões duplicadas. Selecione qual versão de cada questão você deseja manter.</p>
                    {duplicateGroups.map((group, groupIndex) => {
                        const groupId = `group-${groupIndex}`;
                        return (
                            <div key={groupId} className="p-4 border rounded-lg space-y-4">
                                <p className="text-sm font-semibold italic">Motivo: {group.reason}</p>
                                <div className="grid gap-4 md:grid-cols-2">
                                    {group.questionIds.map((id) => {
                                        const questao = questaoMap.get(id);
                                        if (!questao) return null;
                                        const isKept = questionsToKeep[groupId] === id;
                                        return (
                                            <div key={id} className={`p-3 rounded-md border ${isKept ? 'bg-muted/50 border-primary' : 'bg-card'}`}>
                                                <p className="text-sm font-medium line-clamp-3">{questao.enunciado}</p>
                                                <p className="text-xs text-muted-foreground mt-2">ID: {questao.id.substring(0, 5)}... | Criada em: {new Date(questao.createdAt).toLocaleDateString()}</p>
                                                <div className="mt-3">
                                                    {isKept ? (
                                                        <Button size="sm" disabled className="w-full">Manter esta</Button>
                                                    ) : (
                                                        <Button size="sm" variant="outline" className="w-full" onClick={() => setQuestionsToKeep(prev => ({...prev, [groupId]: id}))}>Manter esta</Button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setDuplicateGroups([])}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleDeleteDuplicates}>Excluir Selecionadas</Button>
                    </div>
                </div>
            )}

             {!isCheckingDuplicates && duplicateGroups.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                    Clique em "Verificar Duplicatas" para começar.
                </div>
            )}
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
                Tem certeza que deseja excluir a questão "{questaoToDelete?.enunciado.substring(0, 50)}..."? Todos os dados de respostas e revisões associados a ela também serão perdidos. Esta ação não pode ser desfeita.
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

