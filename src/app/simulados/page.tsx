
"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useData } from "@/hooks/use-data";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Simulado, SimuladoStatus } from "@/types";
import { PlusCircle, Play, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function SimuladoCard({ simulado }: { simulado: Simulado }) {
  const getStatusBadge = (status: SimuladoStatus) => {
    switch (status) {
      case 'rascunho': return <Badge variant="secondary">Rascunho</Badge>;
      case 'andamento': return <Badge className="bg-yellow-500/80 text-white">Em Andamento</Badge>;
      case 'concluido': return <Badge className="bg-approval text-white">Concluído</Badge>;
    }
  };

  const getAction = (simulado: Simulado) => {
    switch (simulado.status) {
      case 'rascunho':
        return <Button asChild><Link href={`/simulados/${simulado.id}`}><Play className="mr-2 h-4 w-4" />Iniciar</Link></Button>;
      case 'andamento':
        return <Button asChild><Link href={`/simulados/${simulado.id}`}><Play className="mr-2 h-4 w-4" />Continuar</Link></Button>;
      case 'concluido':
        return <Button asChild variant="outline"><Link href={`/simulados/${simulado.id}/resultado`}><Eye className="mr-2 h-4 w-4" />Ver Resultados</Link></Button>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <CardTitle>{simulado.nome}</CardTitle>
            {getStatusBadge(simulado.status)}
        </div>
        <CardDescription>{new Date(simulado.criadoEm).toLocaleDateString()}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 text-sm text-muted-foreground">
            <span>{simulado.questoes.length > 0 ? `${simulado.questoes.length} questões` : 'Critérios a definir'}</span>
        </div>
      </CardContent>
      <CardFooter>
        {getAction(simulado)}
      </CardFooter>
    </Card>
  );
}

export default function SimuladosPage() {
  const dataSource = useData();
  const { data: simulados, isLoading } = useQuery({
    queryKey: ["simulados"],
    queryFn: () => dataSource.list<Simulado>("simulados", { filter: 'user = @request.auth.id' }),
  });

  return (
    <>
      <PageHeader title="Simulados" description="Crie e gerencie seus simulados.">
        <Button asChild>
          <Link href="/simulados/novo">
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Simulado
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading && Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
            <CardContent><Skeleton className="h-4 w-1/2" /></CardContent>
            <CardFooter><Skeleton className="h-10 w-24" /></CardFooter>
          </Card>
        ))}
        {simulados?.map((s) => <SimuladoCard key={s.id} simulado={s} />)}
      </div>

       {!isLoading && simulados?.length === 0 && (
          <Card className="col-span-full mt-6">
              <CardHeader>
                  <CardTitle>Nenhum simulado criado</CardTitle>
                  <CardDescription>Crie seu primeiro simulado para começar a praticar.</CardDescription>
              </CardHeader>
              <CardContent>
                  <Button asChild>
                    <Link href="/simulados/novo">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Criar primeiro simulado
                    </Link>
                  </Button>
              </CardContent>
          </Card>
      )}
    </>
  );
}
