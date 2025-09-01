"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useData } from "@/hooks/use-data";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Questao } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { QuestionForm } from "@/components/forms/question-form";

function QuestionCard({ questao }: { questao: Questao }) {
  const [isEditing, setIsEditing] = useState(false);

  const getDifficultyColor = (dificuldade: Questao['dificuldade']) => {
    switch (dificuldade) {
      case 'facil': return 'bg-approval/20 text-approval-foreground border-approval/30';
      case 'medio': return 'bg-yellow-400/20 text-yellow-600 border-yellow-400/30';
      case 'dificil': return 'bg-destructive/10 text-destructive border-destructive/20';
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg font-normal mb-2 line-clamp-3">{questao.enunciado}</CardTitle>
              <div className="flex gap-2">
                <Badge variant="outline">{questao.tipo}</Badge>
                <Badge variant="outline" className={getDifficultyColor(questao.dificuldade)}>{questao.dificuldade}</Badge>
                <Badge variant="secondary">{questao.origem}</Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="ghost" size="sm">Ver</Button>
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>Editar</Button>
        </CardFooter>
      </Card>
      {isEditing && <QuestionForm open={isEditing} onOpenChange={setIsEditing} questao={questao} />}
    </>
  );
}

export default function QuestoesPage() {
  const dataSource = useData();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: questoes, isLoading } = useQuery({
    queryKey: ["questoes"],
    queryFn: () => dataSource.list<Questao>("questoes"),
  });

  return (
    <>
      <PageHeader title="Questões" description="Gerencie seu banco de questões.">
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nova Questão
        </Button>
      </PageHeader>
      
      {showCreateModal && <QuestionForm open={showCreateModal} onOpenChange={setShowCreateModal} />}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading && Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardHeader><Skeleton className="h-12 w-full" /></CardHeader>
            <CardContent><Skeleton className="h-6 w-3/4" /></CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
            </CardFooter>
          </Card>
        ))}
        {questoes?.map((q) => <QuestionCard key={q.id} questao={q} />)}
      </div>

      {!isLoading && questoes?.length === 0 && (
          <Card className="col-span-full mt-6">
              <CardHeader>
                  <CardTitle>Nenhuma questão encontrada</CardTitle>
                  <CardDescription>Comece adicionando sua primeira questão para construir seu banco de estudos.</CardDescription>
              </CardHeader>
              <CardContent>
                  <Button onClick={() => setShowCreateModal(true)}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Criar primeira questão
                  </Button>
              </CardContent>
          </Card>
      )}
    </>
  );
}
