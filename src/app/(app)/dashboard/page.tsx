

"use client";

import { useQuery } from "@tanstack/react-query";
import { useData } from "@/hooks/use-data";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { CheckCircle2, Target, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMemo, useState } from "react";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { useAuth } from "@/providers/auth-provider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function DashboardPage() {
  const dataSource = useData();
  const { user, isLoading: authLoading } = useAuth();

  // Filtro de período pré-definido (lista e gráficos usam o mesmo filtro)
  const [periodPreset, setPeriodPreset] = useState<string>("inicio");
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const endStr = now.toISOString().split("T")[0];
    const mkStart = (days: number) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (days - 1));
      return d.toISOString().split("T")[0];
    };
    switch (periodPreset) {
      case "hoje":
        return { startDate: endStr, endDate: endStr };
      case "7dias":
        return { startDate: mkStart(7), endDate: endStr };
      case "15dias":
        return { startDate: mkStart(15), endDate: endStr };
      case "1mes":
        return { startDate: mkStart(30), endDate: endStr };
      case "3meses":
        return { startDate: mkStart(90), endDate: endStr };
      case "6meses":
        return { startDate: mkStart(180), endDate: endStr };
      case "inicio":
      default:
        return { startDate: undefined, endDate: endStr };
    }
  }, [periodPreset]);

  // Estatísticas por período (lista e gráficos)
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboardStatsRange", periodPreset, startDate ?? null, endDate ?? null],
    queryFn: () => dataSource.getDashboardStatsRange({ startDate, endDate }),
    enabled: !!user && !authLoading,
  });

  // Estatísticas globais para KPIs (não se sujeitam ao período)
  const { data: global, isLoading: globalLoading } = useQuery({
    queryKey: ["dashboardStatsGlobal"],
    queryFn: () => dataSource.getDashboardStats(),
    enabled: !!user && !authLoading,
  });

  const desempenhoPontos = stats?.desempenhoPorPontos ?? [];

  // Agrupar pontos/subpontos em estrutura por disciplina -> tópicos -> subtópicos
  const desempenhoPorDisciplinaAcordeon = useMemo(() => {
    const map = new Map<string, any>();
    for (const item of desempenhoPontos) {
      const discKey = item.disciplinaId;
      const discEntry = map.get(discKey) || {
        id: discKey,
        nome: item.disciplinaNome,
        total: 0,
        acertos: 0,
        erros: 0,
        topicos: new Map<string, any>(),
      };
      const topKey = item.topicoId || "semTopico";
      const topEntry =
        discEntry.topicos.get(topKey) || {
          id: topKey,
          nome: item.topicoNome || "-",
          total: 0,
          acertos: 0,
          erros: 0,
          subtopicos: [],
        };

      // Acumular totais por tópico
      topEntry.total += item.total;
      topEntry.acertos += item.acertos;
      topEntry.erros += item.erros;

      // Adicionar subtópico quando existir
      if (item.subTopicoId) {
        topEntry.subtopicos.push({
          id: item.subTopicoId,
          nome: item.subTopicoNome || "-",
          total: item.total,
          acertos: item.acertos,
          erros: item.erros,
          percentualAcerto: item.total > 0 ? (item.acertos / item.total) * 100 : 0,
        });
      }

      discEntry.topicos.set(topKey, topEntry);

      // Acumular totais por disciplina
      discEntry.total += item.total;
      discEntry.acertos += item.acertos;
      discEntry.erros += item.erros;
      map.set(discKey, discEntry);
    }

    const result = Array.from(map.values()).map((disc) => ({
      ...disc,
      percentualAcerto: disc.total > 0 ? (disc.acertos / disc.total) * 100 : 0,
      topicos: Array.from(disc.topicos.values()).map((t: any) => ({
        ...t,
        percentualAcerto: t.total > 0 ? (t.acertos / t.total) * 100 : 0,
      })),
    }));

    // Ordenações
    result.sort((a, b) => b.total - a.total);
    for (const disc of result) {
      disc.topicos.sort((a: any, b: any) => b.total - a.total);
      for (const t of disc.topicos) {
        t.subtopicos.sort((a: any, b: any) => b.total - a.total);
      }
    }
    return result;
  }, [desempenhoPontos]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Estatísticas e desempenho de suas resoluções."
      />

      {/* KPIs (globais, não se sujeitam ao período) */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total de Questões"
          value={stats?.totalQuestoes ?? "..."}
          icon={<BarChart3 className="h-5 w-5 text-muted-foreground" />}
          loading={statsLoading}
        />
        <KpiCard
          title="Total de Resoluções"
          value={global?.totalRespostas ?? "..."}
          icon={<CheckCircle2 className="h-5 w-5 text-muted-foreground" />}
          loading={globalLoading}
        />
        <KpiCard
          title="Aproveitamento Total"
          value={`${global?.acertoGeral !== undefined ? global.acertoGeral.toFixed(1) : "..."}%`}
          icon={<Target className="h-5 w-5 text-muted-foreground" />}
          loading={globalLoading}
        />
      </div>

      {/* Lista única: desempenho por disciplina com acordeon (tópicos e subtópicos) */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Desempenho por Disciplina</CardTitle>
            <Tabs value={periodPreset} onValueChange={setPeriodPreset} className="w-auto">
              <TabsList>
                <TabsTrigger value="hoje">Hoje</TabsTrigger>
                <TabsTrigger value="7dias">7 dias</TabsTrigger>
                <TabsTrigger value="15dias">15 dias</TabsTrigger>
                <TabsTrigger value="1mes">1 mês</TabsTrigger>
                <TabsTrigger value="3meses">3 meses</TabsTrigger>
                <TabsTrigger value="6meses">6 meses</TabsTrigger>
                <TabsTrigger value="inicio">Desde o começo</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="text-sm text-muted-foreground">Carregando...</div>
          ) : desempenhoPorDisciplinaAcordeon.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhum dado no período selecionado</div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {desempenhoPorDisciplinaAcordeon.map((disc: any) => (
                <AccordionItem key={disc.id} value={disc.id}>
                  <AccordionTrigger>
                    <div className="flex w-full items-center justify-between">
                      <span className="font-medium">{disc.nome}</span>
                      <div className="flex gap-4 text-sm">
                        <span>Total: {disc.total}</span>
                        <span className="text-green-600">Acertos: {disc.acertos}</span>
                        <span className="text-red-600">Erros: {disc.erros}</span>
                        <span className="font-medium">{disc.percentualAcerto.toFixed(1)}%</span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tópico</TableHead>
                          <TableHead className="text-center">Total</TableHead>
                          <TableHead className="text-center">Acertos</TableHead>
                          <TableHead className="text-center">Erros</TableHead>
                          <TableHead className="text-right">Aproveitamento</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {disc.topicos.map((t: any) => (
                          <>
                            <TableRow key={`${disc.id}-${t.id}`}>
                              <TableCell className="font-medium">{t.nome}</TableCell>
                              <TableCell className="text-center">{t.total}</TableCell>
                              <TableCell className="text-center text-green-600">{t.acertos}</TableCell>
                              <TableCell className="text-center text-red-600">{t.erros}</TableCell>
                              <TableCell className="text-right">{t.percentualAcerto.toFixed(1)}%</TableCell>
                            </TableRow>
                            {t.subtopicos.map((s: any) => (
                              <TableRow key={`${disc.id}-${t.id}-${s.id}`} className="text-muted-foreground">
                                <TableCell className="pl-8">{s.nome}</TableCell>
                                <TableCell className="text-center">{s.total}</TableCell>
                                <TableCell className="text-center text-green-600">{s.acertos}</TableCell>
                                <TableCell className="text-center text-red-600">{s.erros}</TableCell>
                                <TableCell className="text-right">{s.percentualAcerto.toFixed(1)}%</TableCell>
                              </TableRow>
                            ))}
                          </>
                        ))}
                      </TableBody>
                    </Table>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Gráficos (usam o mesmo filtro de período) */}
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
              <ChartContainer
                config={{ resolvidas: { label: "Resolvidas", color: "hsl(var(--primary))" } }}
                className="h-[250px] w-full"
              >
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
              <ChartContainer
                config={{
                  acertos: { label: "Acertos", color: "hsl(var(--chart-1))" },
                  erros: { label: "Erros", color: "hsl(var(--chart-2))" },
                }}
                className="h-[250px] w-full"
              >
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
