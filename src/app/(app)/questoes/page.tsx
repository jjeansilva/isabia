

"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Questao } from "@/types";
import { QuestionForm } from "@/components/forms/question-form";
import { ImportQuestionsForm } from "@/components/forms/import-questions-form";
import { QuestoesDataTable } from "@/components/tables/questoes-data-table";
import { PageHeader } from "@/components/page-header";


export default function QuestoesPage() {
  const searchParams = useSearchParams();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedQuestao, setSelectedQuestao] = useState<Questao | undefined>(undefined);
  
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
      
      <QuestoesDataTable onEdit={handleEdit} />
    </>
  );
}
