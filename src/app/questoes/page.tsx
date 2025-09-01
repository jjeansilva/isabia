
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useData } from "@/hooks/use-data";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import { Disciplina, Questao, Topico } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { QuestionForm } from "@/components/forms/question-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

function QuestoesTable() {
  const dataSource = useData();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedQuestao, setSelectedQuestao] = useState<Questao | undefined>(undefined);

  const { data: questoes, isLoading: isLoadingQuestoes } = useQuery({
    queryKey: ["questoes"],
    queryFn: () => dataSource.list<Questao>("questoes"),
  });
  
  // Fetching disciplinas and topicos to display their names
  const { data: disciplinas, isLoading: isLoadingDisciplinas } = useQuery({
    queryKey: ['disciplinas'],
    queryFn: () => dataSource.list<Disciplina>('disciplinas')
  });

  const { data: topicos, isLoading: isLoadingTopicos } = useQuery({
    queryKey: ['topicos'],
    queryFn: () => dataSource.list<Topico>('topicos')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => dataSource.delete('questoes', id),
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Questão excluída com sucesso." });
      queryClient.invalidateQueries({ queryKey: ["questoes"] });
    },
    onError: (error) => {
       toast({ variant: "destructive", title: "Erro!", description: error.message || "Não foi possível excluir a questão." });
    }
  });


  const getDisciplinaName = (id: string) => disciplinas?.find(d => d.id === id)?.nome || '...';
  const getTopicoName = (id: string) => topicos?.find(t => t.id === id)?.nome || '...';

  const handleEdit = (q: Questao) => {
    setSelectedQuestao(q);
    setIsFormOpen(true);
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  }

  const getDifficultyColor = (dificuldade: Questao['dificuldade']) => {
    switch (dificuldade) {
      case 'facil': return 'bg-approval/20 text-approval-foreground border-approval/30';
      case 'medio': return 'bg-yellow-400/20 text-yellow-600 border-yellow-400/30';
      case 'dificil': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-secondary';
    }
  };
  
  const isLoading = isLoadingQuestoes || isLoadingDisciplinas || isLoadingTopicos;

  return (
    <>
      {isFormOpen && <QuestionForm open={isFormOpen} onOpenChange={setIsFormOpen} questao={selectedQuestao} />}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50%]">Enunciado</TableHead>
                <TableHead>Disciplina</TableHead>
                <TableHead>Tópico</TableHead>
                <TableHead>Dificuldade</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-24" /></TableCell>
                </TableRow>
              ))}
              {questoes?.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="font-medium max-w-sm truncate">{q.enunciado}</TableCell>
                  <TableCell>{getDisciplinaName(q.disciplinaId)}</TableCell>
                  <TableCell>{getTopicoName(q.topicoId)}</TableCell>
                  <TableCell><Badge variant="outline" className={getDifficultyColor(q.dificuldade)}>{q.dificuldade}</Badge></TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(q)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                              <AlertDialogTitle>Excluir Questão?</AlertDialogTitle>
                              <AlertDialogDescription>
                                  Tem certeza que deseja excluir esta questão? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(q.id)}>Sim, Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {!isLoading && questoes?.length === 0 && (
          <Card className="col-span-full mt-6">
              <CardHeader>
                  <CardTitle>Nenhuma questão encontrada</CardTitle>
                  <CardDescription>Comece adicionando sua primeira questão para construir seu banco de estudos.</CardDescription>
              </CardHeader>
              <CardContent>
                  <Button onClick={() => { setSelectedQuestao(undefined); setIsFormOpen(true); }}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Criar primeira questão
                  </Button>
              </CardContent>
          </Card>
      )}
    </>
  )
}

export default function QuestoesPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <>
      <PageHeader title="Banco de Questões" description="Gerencie seu acervo de questões para simulados e revisões.">
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nova Questão
        </Button>
      </PageHeader>
      
      {showCreateModal && <QuestionForm open={showCreateModal} onOpenChange={setShowCreateModal} />}
      
      <QuestoesTable />
    </>
  );
}
