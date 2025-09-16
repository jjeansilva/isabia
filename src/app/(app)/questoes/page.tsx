
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from 'next/navigation';
import { useQuery } from "@tanstack/react-query";
import { useData } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Questao, Disciplina, Topico } from "@/types";
import { QuestionForm } from "@/components/forms/question-form";
import { ImportQuestionsForm } from "@/components/forms/import-questions-form";
import { QuestoesDataTable } from "@/components/tables/questoes-data-table";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { ReportedQuestionsList } from "@/components/tables/reported-questions-list";

export default function QuestoesPage() {
  const dataSource = useData();
  const searchParams = useSearchParams();
  
  const [showImportModal, setShowImportModal] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedQuestao, setSelectedQuestao] = useState<Questao | undefined>(undefined);
  
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
    queryFn: async () => {
        return dataSource.list<Questao>('questoes');
    },
    refetchOnWindowFocus: true,
  });

  const isLoading = isLoadingDisciplinas || isLoadingTopicos || isLoadingQuestoes;
  
  const reportedQuestoes = useMemo(() => {
    return (questoes ?? []).filter(q => q.necessitaRevisao);
  }, [questoes]);


  const handleEdit = useCallback((q: Questao) => {
    setSelectedQuestao(q);
    setIsFormOpen(true);
  }, []);

  const handleNewQuestion = () => {
    setSelectedQuestao(undefined);
    setIsFormOpen(true);
  }

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedQuestao(undefined);
  }

  useEffect(() => {
    const newQuestionParam = searchParams.get('new');
    const importParam = searchParams.get('import');

    if (newQuestionParam === 'true') {
      handleNewQuestion();
    }
    if (importParam === 'true') {
      setShowImportModal(true);
    }
  }, [searchParams]);

  return (
    <>
      <PageHeader title="Banco de Questões" description="Gerencie seu acervo de questões para simulados e revisões.">
        <Button onClick={handleNewQuestion}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nova Questão
        </Button>
      </PageHeader>
      
      {isLoading ? (
         <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-96 w-full" />
         </div>
      ) : (
        <>
            <div className="mb-6">
              <ReportedQuestionsList 
                questoes={reportedQuestoes}
                onCorrect={handleEdit}
              />
            </div>
          
            <Card>
              <CardContent className="p-2 xs:p-4 sm:p-6">
                <QuestoesDataTable 
                  questoes={questoes ?? []} 
                  disciplinas={disciplinas ?? []} 
                  topicos={topicos ?? []}
                  onEdit={handleEdit}
                />
              </CardContent>
            </Card>
        </>
      )}
      
      {isFormOpen && <QuestionForm open={isFormOpen} onOpenChange={handleCloseForm} questao={selectedQuestao} />}
      {showImportModal && <ImportQuestionsForm open={showImportModal} onOpenChange={setShowImportModal} />}
      
    </>
  );
}

    