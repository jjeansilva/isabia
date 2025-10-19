

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
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { SparklineChart } from "@/components/charts/sparkline-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts";

export default function DashboardPage() {
  const dataSource = useData();
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboardStatsRange', startDate, endDate],
    queryFn: () => dataSource.getDashboardStatsRange({ startDate: startDate || undefined, endDate: endDate || undefined }),
  });

  const desempenhoDisc = stats?.desempenhoPorDisciplina ?? [];
  const desempenhoPontos = stats?.desempenhoPorPontos ?? [];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Estatísticas e desempenho de suas resoluções."
      />

      {/* Filtros de Data */}
      <Card className="mb-4">
        <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium">Início</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Fim</label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1" />
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total de Questões"
          value={stats?.totalQuestoes ?? '...'}
          icon={<BarChart3 className="h-5 w-5 text-muted-foreground" />}
          loading={isLoading}
        />
        <KpiCard
          title="Total de Resoluções"
          value={stats?.totalResolucoes ?? '...'}
          icon={<CheckCircle2 className="h-5 w-5 text-muted-foreground" />}
          loading={isLoading}
        />
        <KpiCard
          title="Aproveitamento (período)"
          value={`${stats?.aproveitamento?.toFixed(1) ?? '...'}%`}
          icon={<Target className="h-5 w-5 text-muted-foreground" />}
          loading={isLoading}
        />
      </div>

      {/* Desempenho por Disciplina */}
      <div className="mt-6 grid gap-6 md:grid-cols-12">
        <div className="md:col-span-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Desempenho por Disciplina (período)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Disciplina</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Acertos</TableHead>
                    <TableHead className="text-center">Erros</TableHead>
                    <TableHead className="text-right">Aproveitamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow><TableCell colSpan={5}>Carregando...</TableCell></TableRow>
                  )}
                  {!isLoading && desempenhoDisc.length === 0 && (
                    <TableRow><TableCell colSpan={5}>Sem dados no período</TableCell></TableRow>
                  )}
                  {!isLoading && desempenhoDisc.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.nome}</TableCell>
                      <TableCell className="text-center">{d.total}</TableCell>
                      <TableCell className="text-center text-green-600">{d.acertos}</TableCell>
                      <TableCell className="text-center text-red-600">{d.erros}</TableCell>
                      <TableCell className="text-right">{d.percentualAcerto.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Desempenho por Pontos/Subpontos */}
        <div className="md:col-span-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Desempenho por Pontos/Subpontos (período)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ponto</TableHead>
                    <TableHead>Subponto</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Acertos</TableHead>
                    <TableHead className="text-center">Erros</TableHead>
                    <TableHead className="text-right">Aproveitamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow><TableCell colSpan={6}>Carregando...</TableCell></TableRow>
                  )}
                  {!isLoading && desempenhoPontos.length === 0 && (
                    <TableRow><TableCell colSpan={6}>Sem dados no período</TableCell></TableRow>
                  )}
                  {!isLoading && desempenhoPontos.map((p: any, idx: number) => (
                    <TableRow key={`${p.topicoId}-${p.subTopicoId}-${idx}`}>
                      <TableCell className="font-medium">{p.topicoNome || '-'}</TableCell>
                      <TableCell>{p.subTopicoNome || '-'}</TableCell>
                      <TableCell className="text-center">{p.total}</TableCell>
                      <TableCell className="text-center text-green-600">{p.acertos}</TableCell>
                      <TableCell className="text-center text-red-600">{p.erros}</TableCell>
                      <TableCell className="text-right">{p.percentualAcerto.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Gráficos com abas */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Gráficos</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="resolvidas" className="w-full">
            <TabsList>
              <TabsTrigger value="resolvidas">Resolvidas</TabsTrigger>
              <TabsTrigger value="desempenho">Desempenho</TabsTrigger>
            </TabsList>

            <TabsContent value="resolvidas" className="pt-4">
              <ChartContainer config={{ resolvidas: { label: 'Resolvidas', color: 'hsl(var(--primary))' } }} className="h-[250px] w-full">
                <AreaChart data={stats?.resolvidasDiarias ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="resolvidas" stroke="var(--color-resolvidas)" fill="var(--color-resolvidas)" />
                </AreaChart>
              </ChartContainer>
            </TabsContent>

            <TabsContent value="desempenho" className="pt-4">
              <ChartContainer config={{ acertos: { label: 'Acertos', color: 'hsl(var(--chart-1))' }, erros: { label: 'Erros', color: 'hsl(var(--chart-2))' } }} className="h-[250px] w-full">
                <AreaChart data={stats?.desempenhoDiario ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Area type="monotone" dataKey="acertos" stroke="var(--color-acertos)" fill="var(--color-acertos)" />
                  <Area type="monotone" dataKey="erros" stroke="var(--color-erros)" fill="var(--color-erros)" />
                </AreaChart>
              </ChartContainer>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
}
