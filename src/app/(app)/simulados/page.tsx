
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useData } from "@/hooks/use-data";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Simulado, SimuladoStatus } from "@/types";
import { PlusCircle, Play, Eye, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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


function SimuladoCard({ simulado, onDelete }: { simulado: Simulado, onDelete: (id: string) => void }) {
  const getStatusBadge = (status: SimuladoStatus) => {
    switch (status) {
      case 'Rascunho': return <Badge variant="secondary">Rascunho</Badge>;
      case 'Em andamento': return <Badge className="bg-yellow-500/80 text-white">Em Andamento</Badge>;
      case 'Concluído': return <Badge className="bg-approval text-white">Concluído</Badge>;
    }
  };

  const getAction = (simulado: Simulado) => {
    switch (simulado.status) {
      case 'Rascunho':
        return <Button asChild><Link href={`/simulados/${simulado.id}`}><Play className="mr-2 h-4 w-4" />Iniciar</Link></Button>;
      case 'Em andamento':
        return <Button asChild><Link href={`/simulados/${simulado.id}`}><Play className="mr-2 h-4 w-4" />Continuar</Link></Button>;
      case 'Concluído':
        return <Button asChild variant="outline"><Link href={`/simulados/${simulado.id}/resultado`}><Eye className="mr-2 h-4 w-4" />Ver Resultados</Link></Button>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start gap-2">
            <CardTitle className="truncate mr-2 flex-1">{simulado.nome}</CardTitle>
            <div className="flex items-center gap-1">
                {getStatusBadge(simulado.status)}
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                         <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Simulado?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Tem certeza que deseja excluir o simulado "{simulado.nome}"? Esta ação não pode ser desfeita e removerá os dados associados.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(simulado.id)}>Sim, Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
        <CardDescription>{new Date(simulado.criadoEm).toLocaleDateString()}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 text-sm text-muted-foreground">
            <span>{Array.isArray(simulado.questoes) && simulado.questoes.length > 0 ? `${simulado.questoes.length} questões` : 'Critérios a definir'}</span>
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
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: simulados, isLoading } = useQuery({
    queryKey: ["simulados"],
    queryFn: () => dataSource.list<Simulado>("simulados"),
  });
  
  const simuladosParsed = simulados?.map(s => {
    try {
        return {...s, questoes: typeof s.questoes === 'string' ? JSON.parse(s.questoes) : s.questoes ?? [] }
    } catch(e) {
        return {...s, questoes: []}
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => dataSource.delete('simulados', id),
    onSuccess: () => {
        toast({ title: "Sucesso!", description: "Simulado excluído." });
        queryClient.invalidateQueries({ queryKey: ["simulados"] });
    },
    onError: (error) => {
        toast({ variant: "destructive", title: "Erro!", description: error.message || "Não foi possível excluir o simulado." });
    }
  });

  const handleDeleteSimulado = (id: string) => {
    deleteMutation.mutate(id);
  }


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
        {simuladosParsed?.map((s) => <SimuladoCard key={s.id} simulado={s} onDelete={handleDeleteSimulado} />)}
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
