
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useData } from "@/hooks/use-data";
import { Disciplina, Topico } from "@/types";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit2, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { DisciplinaForm } from "@/components/forms/disciplina-form";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { TopicoForm } from "@/components/forms/topico-form";
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
import { useToast } from "@/hooks/use-toast";


function TopicoItem({ topico, subtopicos, onEdit, onDelete, onAddSubtopic }: { 
    topico: Topico, 
    subtopicos: Topico[],
    onEdit: () => void, 
    onDelete: () => void,
    onAddSubtopic: () => void,
}) {
    return (
        <div className="flex flex-col pl-4 border-l border-border ml-2">
            <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted -ml-2 -mr-2 pl-4 pr-2">
                <span>{topico.nome}</span>
                <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onAddSubtopic} title="Adicionar Subtópico">
                        <PlusCircle className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}><Edit2 className="h-4 w-4" /></Button>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4"/></Button>
                    </AlertDialogTrigger>
                </div>
            </div>
             {subtopicos.length > 0 && (
                <div className="ml-4 mt-2 space-y-1 border-l border-border pl-4">
                    {subtopicos.map(sub => (
                         <div key={sub.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted -ml-2 -mr-2 pl-4 pr-2 text-sm">
                            <span>{sub.nome}</span>
                         </div>
                    ))}
                </div>
            )}
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Excluir Tópico?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tem certeza que deseja excluir o tópico "{topico.nome}"? Esta ação não pode ser desfeita e removerá os dados associados, incluindo subtópicos.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete}>Sim, Excluir</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </div>
    )
}

function DisciplinaAccordionItem({ 
    disciplina, 
    onEdit, 
    onDelete,
    onAddTopico,
    onEditTopico,
    onDeleteTopico,
    onAddSubtopic,
}: { 
    disciplina: Disciplina, 
    onEdit: (d: Disciplina) => void,
    onDelete: (d: Disciplina) => void, 
    onAddTopico: (d: Disciplina) => void,
    onEditTopico: (t: Topico, d: Disciplina) => void,
    onDeleteTopico: (t: Topico) => void,
    onAddSubtopic: (t: Topico, d: Disciplina) => void,
}) {
  const dataSource = useData();
  const { data: allTopicos, isLoading } = useQuery({
      queryKey: ['topicos', disciplina.id],
      queryFn: () => dataSource.list<Topico>('topicos', { filter: `disciplinaId = "${disciplina.id}"`, sort: 'ordem' }),
  });

  const topicosPrincipais = allTopicos?.filter(t => !t.topicoPaiId) || [];
  const subtópicos = allTopicos?.filter(t => t.topicoPaiId) || [];

  const getSubtopicos = (topicoId: string) => {
      return subtópicos.filter(st => st.topicoPaiId === topicoId);
  }

  return (
    <AccordionItem value={disciplina.id} className="border-b-0">
        <div className="flex items-center justify-between w-full p-4 rounded-lg bg-card border" style={{ borderLeftColor: disciplina.cor, borderLeftWidth: 4 }}>
            <AccordionTrigger className="p-0 hover:no-underline flex-1 text-left font-semibold text-lg">
                {disciplina.nome}
            </AccordionTrigger>
            <div className="flex items-center gap-2 pl-4">
                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(disciplina)}}>Editar</Button>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" onClick={(e) => e.stopPropagation()}>Excluir</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Disciplina?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Tem certeza que deseja excluir a disciplina "{disciplina.nome}"? Todos os seus tópicos e questões associadas serão permanentemente removidos. Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(disciplina)}>Sim, Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
      <AccordionContent className="p-4 space-y-4 pt-2">
        {isLoading && <p>Carregando tópicos...</p>}
        {topicosPrincipais && topicosPrincipais.length > 0 && (
            <div className="space-y-1">
                <AlertDialog>
                 {topicosPrincipais.map(t => (
                     <TopicoItem 
                        key={t.id} 
                        topico={t}
                        subtopicos={getSubtopicos(t.id)}
                        onEdit={() => onEditTopico(t, disciplina)} 
                        onDelete={() => onDeleteTopico(t)}
                        onAddSubtopic={() => onAddSubtopic(t, disciplina)}
                     />
                ))}
                </AlertDialog>
            </div>
        )}
         {allTopicos && allTopicos.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum tópico encontrado.</p>
        )}
        <Button variant="outline" size="sm" className="mt-4" onClick={() => onAddTopico(disciplina)}>
            <PlusCircle className="mr-2 h-4 w-4"/>
            Adicionar Tópico
        </Button>
      </AccordionContent>
    </AccordionItem>
  )
}


export default function TaxonomiaPage() {
  const dataSource = useData();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isDisciplinaFormOpen, setIsDisciplinaFormOpen] = useState(false);
  const [selectedDisciplina, setSelectedDisciplina] = useState<Disciplina | undefined>(undefined);
  
  const [isTopicoFormOpen, setIsTopicoFormOpen] = useState(false);
  const [selectedTopico, setSelectedTopico] = useState<Topico | undefined>(undefined);
  const [parentDisciplina, setParentDisciplina] = useState<Disciplina | undefined>(undefined);
  const [parentTopico, setParentTopico] = useState<Topico | undefined>(undefined);


  const { data: disciplinas, isLoading } = useQuery({
    queryKey: ["disciplinas"],
    queryFn: () => dataSource.list<Disciplina>("disciplinas"),
  });
  
  const handleNewDisciplina = () => {
    setSelectedDisciplina(undefined);
    setIsDisciplinaFormOpen(true);
  }

  const handleEditDisciplina = (disciplina: Disciplina) => {
    setSelectedDisciplina(disciplina);
    setIsDisciplinaFormOpen(true);
  }
  
  const handleNewTopico = (disciplina: Disciplina) => {
      setSelectedTopico(undefined);
      setParentTopico(undefined);
      setParentDisciplina(disciplina);
      setIsTopicoFormOpen(true);
  }
  
  const handleEditTopico = (topico: Topico, disciplina: Disciplina) => {
    setSelectedTopico(topico);
    setParentTopico(undefined);
    setParentDisciplina(disciplina);
    setIsTopicoFormOpen(true);
  }

  const handleAddSubtopic = (topicoPai: Topico, disciplina: Disciplina) => {
      setSelectedTopico(undefined);
      setParentTopico(topicoPai);
      setParentDisciplina(disciplina);
      setIsTopicoFormOpen(true);
  }

  const deleteDisciplinaMutation = useMutation({
      mutationFn: (disciplinaId: string) => dataSource.delete('disciplinas', disciplinaId),
      onSuccess: () => {
          toast({ title: "Disciplina Excluída!", description: "A disciplina e todos os seus dados foram removidos." });
          queryClient.invalidateQueries({ queryKey: ["disciplinas"] });
          queryClient.invalidateQueries({ queryKey: ["topicos"] });
      },
      onError: (error) => {
          toast({ variant: "destructive", title: "Erro!", description: error.message || "Não foi possível excluir a disciplina." });
      }
  });

  const deleteTopicoMutation = useMutation({
    mutationFn: (topicoId: string) => dataSource.delete('topicos', topicoId),
    onSuccess: (_, topicoId) => {
      toast({ title: "Tópico Excluído!", description: "O tópico foi removido com sucesso." });
      queryClient.invalidateQueries({ queryKey: ["topicos"] });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Erro!", description: error.message || "Não foi possível excluir o tópico." });
    }
  });

  const handleDeleteDisciplina = (disciplina: Disciplina) => {
      deleteDisciplinaMutation.mutate(disciplina.id);
  }

  const handleDeleteTopico = (topico: Topico) => {
      deleteTopicoMutation.mutate(topico.id);
  }

  const handleFormClose = () => {
    setIsDisciplinaFormOpen(false);
    setSelectedDisciplina(undefined);
    setIsTopicoFormOpen(false);
    setParentDisciplina(undefined);
    setSelectedTopico(undefined);
    setParentTopico(undefined);
  }

  return (
    <>
      <PageHeader
        title="Taxonomia"
        description="Gerencie suas disciplinas, tópicos e subtópicos."
      >
        <Button onClick={handleNewDisciplina}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nova Disciplina
        </Button>
      </PageHeader>

      {isDisciplinaFormOpen && (
        <DisciplinaForm
          open={isDisciplinaFormOpen}
          onOpenChange={handleFormClose}
          disciplina={selectedDisciplina}
        />
      )}
      
      {isTopicoFormOpen && parentDisciplina && (
          <TopicoForm 
            open={isTopicoFormOpen}
            onOpenChange={handleFormClose}
            disciplina={parentDisciplina}
            topico={selectedTopico}
            topicoPai={parentTopico}
          />
      )}


      <div className="space-y-4">
        {isLoading && Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
        ))}
        
        <Accordion type="single" collapsible className="w-full space-y-2">
            {disciplinas?.map((d) => (
              <DisciplinaAccordionItem 
                key={d.id} 
                disciplina={d} 
                onEdit={handleEditDisciplina} 
                onDelete={handleDeleteDisciplina}
                onAddTopico={handleNewTopico}
                onEditTopico={handleEditTopico}
                onDeleteTopico={handleDeleteTopico}
                onAddSubtopic={handleAddSubtopic}
              />)
            )}
        </Accordion>
      </div>

       {!isLoading && disciplinas?.length === 0 && (
          <Card className="col-span-full mt-6">
              <CardHeader>
                  <CardTitle>Nenhuma disciplina encontrada</CardTitle>
                  <CardDescription>Comece adicionando sua primeira disciplina para organizar seus estudos.</CardDescription>
              </CardHeader>
              <CardContent>
                  <Button onClick={handleNewDisciplina}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Criar primeira disciplina
                  </Button>
              </CardContent>
          </Card>
      )}
    </>
  );
}
