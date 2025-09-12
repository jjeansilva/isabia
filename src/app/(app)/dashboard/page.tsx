

"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useData } from "@/hooks/use-data";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { 
  CheckCircle2, 
  Clock, 
  Target,
  FileWarning,
  History,
  PlayCircle,
  TrendingUp,
  BarChart3,
  HelpCircle,
  ListChecks
} from "lucide-react";
import { SparklineChart } from "@/components/charts/sparkline-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { PerformancePorCriterio } from "@/types";

function PerformanceTable({ title, data, isLoading }: { title: string, data: PerformancePorCriterio[], isLoading: boolean }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Critério</TableHead>
                            <TableHead className="text-center">Questões</TableHead>
                            <TableHead className="text-right">Acerto</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && Array.from({ length: 3 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell className="h-12 text-center" colSpan={3}>Carregando...</TableCell>
                            </TableRow>
                        ))}
                         {!isLoading && data.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">
                                    Nenhuma questão respondida ainda.
                                </TableCell>
                            </TableRow>
                        )}
                        {!isLoading && data.map(item => (
                            <TableRow key={item.nome}>
                                <TableCell className="font-medium">{item.nome}</TableCell>
                                <TableCell className="text-center">{item.totalQuestoes}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <span>{item.percentualAcerto.toFixed(1)}%</span>
                                        <Progress value={item.percentualAcerto} className="w-24 h-2" />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

export default function DashboardPage() {
  const dataSource = useData();

  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => dataSource.getDashboardStats(),
  });

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Bem-vindo ao seu painel de estudos iSabIA."
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Acerto Geral"
          value={`${stats?.acertoGeral?.toFixed(1) ?? '...'}%`}
          icon={<Target className="h-5 w-5 text-muted-foreground" />}
          loading={isLoading}
        />
        <KpiCard
          title="Questões Respondidas"
          value={stats?.totalRespostas ?? '...'}
          icon={<CheckCircle2 className="h-5 w-5 text-muted-foreground" />}
          loading={isLoading}
        />
        <KpiCard
          title="Tempo Médio / Questão"
          value={`${stats?.tempoMedioGeral?.toFixed(0) ?? '...'}s`}
          icon={<Clock className="h-5 w-5 text-muted-foreground" />}
          loading={isLoading}
        />
         <KpiCard
          title="Acertos (Últimos 30d)"
          value={`${stats?.acertoUltimos30d?.toFixed(1) ?? '...'}%`}
          icon={<TrendingUp className="h-5 w-5 text-muted-foreground" />}
          chart={
             <SparklineChart 
              data={stats?.historicoAcertos ?? []} 
              dataKey="acerto" 
              color="hsl(var(--primary))" 
            />
          }
          loading={isLoading}
        />
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-12">
        <div className="md:col-span-8 space-y-6">
           <PerformanceTable title="Desempenho por Disciplina" data={stats?.desempenhoPorDisciplina ?? []} isLoading={isLoading} />
        </div>
        <div className="md:col-span-4 space-y-6">
            {stats?.simuladoEmAndamento && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PlayCircle className="h-5 w-5 text-primary" />
                            Continue de onde parou
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">Você tem um simulado em andamento.</p>
                        <Button asChild>
                            <Link href={`/simulados/${stats.simuladoEmAndamento.id}`}>
                                Retomar: {stats.simuladoEmAndamento.nome}
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            )}
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History className="h-5 w-5 text-primary" />
                        Revisão do dia
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <p>Carregando...</p>
                    ) : (
                        <>
                            <p className="text-muted-foreground mb-4">
                                Você tem <span className="font-bold text-foreground">{stats?.questoesParaRevisarHoje ?? 0}</span> questões para revisar hoje.
                            </p>
                            <Button asChild variant="outline" disabled={!stats?.questoesParaRevisarHoje || stats.questoesParaRevisarHoje === 0}>
                                <Link href="/revisao">Iniciar Revisão</Link>
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><HelpCircle className="h-5 w-5 text-primary" />Desempenho por Dificuldade</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                    {isLoading && <p>Carregando...</p>}
                    {!isLoading && stats?.desempenhoPorDificuldade.map((item: PerformancePorCriterio) => (
                        <div key={item.nome} className="flex justify-between items-center text-sm">
                            <span className="font-medium">{item.nome}</span>
                            <span className="text-muted-foreground">{item.percentualAcerto.toFixed(1)}%</span>
                        </div>
                    ))}
                </CardContent>
            </Card>
             <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><ListChecks className="h-5 w-5 text-primary" />Desempenho por Tipo</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                    {isLoading && <p>Carregando...</p>}
                    {!isLoading && stats?.desempenhoPorTipo.map((item: PerformancePorCriterio) => (
                        <div key={item.nome} className="flex justify-between items-center text-sm">
                            <span className="font-medium">{item.nome}</span>
                            <span className="text-muted-foreground">{item.percentualAcerto.toFixed(1)}%</span>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
      </div>
    </>
  );
}
