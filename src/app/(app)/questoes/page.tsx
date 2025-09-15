

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useData } from "@/hooks/use-data";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2 } from "lucide-react";
import { Disciplina, Questao, Topico } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QuestionForm } from "@/components/forms/question-form";
import { ImportQuestionsForm } from "@/components/forms/import-questions-form";
import { QuestoesDataTable } from "@/components/tables/questoes-data-table";
import { getColumns } from "@/components/tables/questoes-columns";


export default function QuestoesPage() {
  const dataSource = useData();
  const queryClient = useQueryClient();
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
  
  const handleEdit = useCallback((q: Questao) => {
    setSelectedQuestao(q);
    setIsFormOpen(true);
  }, []);

  const columns = useMemo(() => getColumns({ onEdit: handleEdit }), [handleEdit]);

  useEffect(() => {
    if (searchParams.get('import') === 'true') {
      setShowImportModal(true);
    }
  }, [searchParams]);

  const isLoading = isLoadingDisciplinas || isLoadingTopicos || isLoadingQuestoes;

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
      
      <QuestoesDataTable 
        columns={columns} 
        data={questoes ?? []}
        disciplinas={disciplinas ?? []} 
        topicos={topicos ?? []}
        isLoading={isLoading}
      />
    </>
  );
}
