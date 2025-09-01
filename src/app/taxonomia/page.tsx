"use client";

import { useQuery } from "@tanstack/react-query";
import { useData } from "@/hooks/use-data";
import { Disciplina } from "@/types";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

function DisciplinaCard({ disciplina }: { disciplina: Disciplina }) {
  return (
    <Card style={{ borderLeftColor: disciplina.cor, borderLeftWidth: 4 }}>
      <CardHeader>
        <CardTitle>{disciplina.nome}</CardTitle>
        <CardDescription>{disciplina.descricao || "Nenhuma descrição"}</CardDescription>
      </CardHeader>
      <CardFooter className="flex justify-end">
        <Button variant="outline" size="sm">Editar</Button>
      </CardFooter>
    </Card>
  )
}


export default function TaxonomiaPage() {
  const dataSource = useData();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: disciplinas, isLoading } = useQuery({
    queryKey: ["disciplinas"],
    queryFn: () => dataSource.list<Disciplina>("disciplinas"),
  });

  return (
    <>
      <PageHeader
        title="Taxonomia"
        description="Gerencie suas disciplinas, tópicos e subtópicos."
      >
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nova Disciplina
        </Button>
      </PageHeader>

      {/* {showCreateModal && <DisciplinaForm open={showCreateModal} onOpenChange={setShowCreateModal} />} */}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading && Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
            <CardFooter><Skeleton className="h-10 w-24" /></CardFooter>
          </Card>
        ))}
        {disciplinas?.map((d) => <DisciplinaCard key={d.id} disciplina={d} />)}
      </div>

       {!isLoading && disciplinas?.length === 0 && (
          <Card className="col-span-full mt-6">
              <CardHeader>
                  <CardTitle>Nenhuma disciplina encontrada</CardTitle>
                  <CardDescription>Comece adicionando sua primeira disciplina para organizar seus estudos.</CardDescription>
              </CardHeader>
              <CardContent>
                  <Button onClick={() => setShowCreateModal(true)}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Criar primeira disciplina
                  </Button>
              </CardContent>
          </Card>
      )}
    </>
  );
}
