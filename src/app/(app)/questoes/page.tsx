
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

export default function QuestoesPage() {
  const dataSource = useData();
  const searchParams = useSearchParams();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedQuestao, setSelectedQuestao] = useState<Questao | undefined>(undefined);
  
  const { data: disciplinas, isLoading: isLoadingDisciplinas } = useQuery({
    queryKey: ['disciplinas'],
    queryFn: () => dataSource.list<Disciplina>('disciplinas_abcde1')
  });

  const { data: topicos, isLoading: isLoadingTopicos } = useQuery({
    queryKey: ['topicos'],
    queryFn: () => dataSource.list<Topico>('topicos_abcde1')
  });

  const { data: questoes, isLoading: isLoadingQuestoes } = useQuery({
    queryKey: ['questoes'],
    queryFn: async () => {
        return dataSource.list<Questao>('questoes_abcde1');
    },
  });

  const isLoading = isLoadingDisciplinas || isLoadingTopicos || isLoadingQuestoes;

  const handleEdit = useCallback((q: Questao) => {
    setSelectedQuestao(q);
    setIsFormOpen(true);
  }, []);

  useEffect(() => {
    if (searchParams.get('import') === 'true') {
      setShowImportModal(true);
    }
  }, [searchParams]);

  return (
    <>
      <PageHeader title="Banco de Questões" description="Gerencie seu acervo de questões para simulados e revisões.">
        <Button onClick={() => {
            setShowCreateModal(true);
        }}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nova Questão
        </Button>
      </PageHeader>
      
      {showCreateModal && <QuestionForm open={showCreateModal} onOpenChange={setShowCreateModal} />}
      {isFormOpen && <QuestionForm open={isFormOpen} onOpenChange={setIsFormOpen} questao={selectedQuestao} />}
      {showImportModal && <ImportQuestionsForm open={showImportModal} onOpenChange={setShowImportModal} />}
      
      {isLoading ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-1 items-center space-x-2">
              <Skeleton className="h-8 w-[150px] lg:w-[250px]" />
              <Skeleton className="h-8 w-[120px]" />
              <Skeleton className="h-8 w-[120px]" />
            </div>
            <Skeleton className="h-8 w-[80px]" />
          </div>
          <Card>
            <CardContent className="p-0">
               <div className="p-4 space-y-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <QuestoesDataTable 
          questoes={questoes ?? []} 
          disciplinas={disciplinas ?? []} 
          topicos={topicos ?? []}
          onEdit={handleEdit}
        />
      )}
    </>
  );
}
