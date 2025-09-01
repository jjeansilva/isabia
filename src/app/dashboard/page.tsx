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
  PlayCircle
} from "lucide-react";
import { SparklineChart } from "@/components/charts/sparkline-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DisciplineChart } from "@/components/charts/discipline-chart";

export default function DashboardPage() {
  const dataSource = useData();

  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => dataSource.getDashboardStats(),
  });

  const getAcertoBadge = (acerto: number) => {
    if (acerto > 70) {
      return <Badge className="bg-approval text-white">Alto</Badge>;
    }
    if (acerto > 50) {
      return <Badge variant="secondary">Médio</Badge>;
    }
    return <Badge variant="destructive">Baixo</Badge>;
  };
  
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Bem-vindo ao seu painel de estudos iSabIA."
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Acerto Geral"
          value={`${stats?.acertoGeral.toFixed(1) ?? '...'}%`}
          icon={
            isLoading ? null : getAcertoBadge(stats.acertoGeral)
          }
          loading={isLoading}
        />
        <KpiCard
          title="Questões Respondidas (7d)"
          value={stats?.statsDia.reduce((acc: number, s: any) => acc + s.totalQuestoes, 0) ?? '...'}
          icon={<CheckCircle2 className="h-5 w-5 text-muted-foreground" />}
          chart={
            <SparklineChart 
              data={stats?.statsDia ?? []} 
              dataKey="totalQuestoes" 
              color="hsl(var(--primary))" 
            />
          }
          loading={isLoading}
        />
        <KpiCard
          title="Tempo Médio / Questão"
          value={`${stats?.statsDia.length > 0 ? (stats?.statsDia.reduce((acc: number, s: any) => acc + s.tempoMedio, 0) / stats?.statsDia.length).toFixed(0) : '...'}s`}
          icon={<Clock className="h-5 w-5 text-muted-foreground" />}
          loading={isLoading}
        />
        <KpiCard
          title="Simulados"
          value={stats?.simuladosCount?.criados ?? '...'}
          change={`${stats?.simuladosCount?.emAndamento} em andamento`}
          icon={<Target className="h-5 w-5 text-muted-foreground" />}
          loading={isLoading}
        />
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
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
                                Retomar simulado: {stats.simuladoEmAndamento.nome}
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
        </div>
        <div className="lg:col-span-1">
          {isLoading ? <Card className="h-[322px]"><CardContent><p>Carregando gráfico...</p></CardContent></Card> : <DisciplineChart data={stats?.distribution ?? []} />}
        </div>
      </div>
    </>
  );
}
