
"use client";

import { useQuery } from "@tanstack/react-query";
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


function TopicoItem({ topico }: { topico: Topico }) {
    return (
        <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
            <span>{topico.nome}</span>
            <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8"><Edit2 className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4"/></Button>
            </div>
        </div>
    )
}

function DisciplinaAccordionItem({ disciplina, onEdit, onAddTopico }: { disciplina: Disciplina, onEdit: (d: Disciplina) => void, onAddTopico: (d: Disciplina) => void }) {
  const dataSource = useData();
  const { data: topicos, isLoading } = useQuery({
      queryKey: ['topicos', disciplina.id],
      queryFn: () => dataSource.list<Topico>('topicos', { disciplinaId: disciplina.id }),
  });

  return (
    <AccordionItem value={disciplina.id}>
      <AccordionTrigger className="p-4 hover:no-underline rounded-lg" style={{ borderLeftColor: disciplina.cor, borderLeftWidth: 4 }}>
          <div className="flex items-center justify-between w-full">
            <div className="text-left">
                <h3 className="font-semibold text-lg">{disciplina.nome}</h3>
                <p className="text-sm text-muted-foreground">{disciplina.descricao || "Nenhuma descrição"}</p>
            </div>
            <div className="flex items-center gap-2 pr-4">
                 <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(disciplina)}}>Editar Disciplina</Button>
            </div>
          </div>
      </AccordionTrigger>
      <AccordionContent className="p-4">
        {isLoading && <p>Carregando tópicos...</p>}
        {topicos && topicos.length > 0 && (
            <div className="space-y-2">
                {topicos.map(t => <TopicoItem key={t.id} topico={t} />)}
            </div>
        )}
         {topicos && topicos.length === 0 && (
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
  const [isDisciplinaFormOpen, setIsDisciplinaFormOpen] = useState(false);
  const [isTopicoFormOpen, setIsTopicoFormOpen] = useState(false);

  const [selectedDisciplina, setSelectedDisciplina] = useState<Disciplina | undefined>(undefined);
  const [parentDisciplina, setParentDisciplina] = useState<Disciplina | undefined>(undefined);


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
      setParentDisciplina(disciplina);
      setIsTopicoFormOpen(true);
  }

  const handleFormClose = () => {
    setIsDisciplinaFormOpen(false);
    setSelectedDisciplina(undefined);
    setIsTopicoFormOpen(false);
    setParentDisciplina(undefined);
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
          />
      )}


      <div className="space-y-4">
        {isLoading && Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
        ))}
        
        <Accordion type="single" collapsible className="w-full space-y-2">
            {disciplinas?.map((d) => <DisciplinaAccordionItem key={d.id} disciplina={d} onEdit={handleEditDisciplina} onAddTopico={handleNewTopico} />)}
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
