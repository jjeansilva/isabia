
"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useData } from "@/hooks/use-data";
import { Simulado, Questao } from "@/types";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Percent } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function ResultadoPage() {
    const params = useParams();
    const id = params.id as string;
    const dataSource = useData();

    const { data: simulado, isLoading: isLoadingSimulado } = useQuery({
        queryKey: ['simuladoResultado', id],
        queryFn: () => dataSource.get<Simulado>('simulados', id),
    });

    const { data: questoes, isLoading: isLoadingQuestoes } = useQuery({
        queryKey: ['questoes', 'all'], // Use a distinct key
        queryFn: () => dataSource.list<Questao>('questoes'),
    });
    
    const getQuestaoById = (qid: string) => {
        if (!questoes) return null;
        return questoes.find(q => q.id === qid);
    }

    const isLoading = isLoadingSimulado || isLoadingQuestoes;

    if (isLoading) {
        return <div><Skeleton className="h-8 w-64 mb-4" /><Skeleton className="h-48 w-full" /></div>;
    }

    if (!simulado) {
        return <p>Resultados não encontrados.</p>;
    }

    const totalQuestoes = simulado.questoes.length;
    const acertos = simulado.questoes.filter(q => q.correta).length;
    const percentualAcerto = totalQuestoes > 0 ? (acertos / totalQuestoes) * 100 : 0;

    return (
        <>
            <PageHeader
                title={`Resultados: ${simulado.nome}`}
                description={`Concluído em: ${simulado.finalizadoEm ? new Date(simulado.finalizadoEm).toLocaleDateString() : 'N/A'}`}
            />
            <div className="grid gap-4 md:grid-cols-3 mb-6">
                <KpiCard title="Acerto" value={`${percentualAcerto.toFixed(1)}%`} icon={<Percent className="h-5 w-5 text-muted-foreground"/>} />
                <KpiCard title="Corretas" value={`${acertos}`} icon={<CheckCircle2 className="h-5 w-5 text-approval"/>} />
                <KpiCard title="Incorretas" value={`${totalQuestoes - acertos}`} icon={<XCircle className="h-5 w-5 text-destructive"/>} />
            </div>

            <Card>
                <CardHeader><CardTitle>Detalhes das Questões</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>#</TableHead>
                                <TableHead>Enunciado</TableHead>
                                <TableHead>Resultado</TableHead>
                                <TableHead>Confiança</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {simulado.questoes.map(sq => {
                                const questao = getQuestaoById(sq.questaoId);
                                return (
                                    <TableRow key={sq.id}>
                                        <TableCell>{sq.ordem}</TableCell>
                                        <TableCell className="max-w-sm truncate">{questao?.enunciado ?? 'Carregando...'}</TableCell>
                                        <TableCell>
                                            {sq.correta === undefined ? (
                                                <Badge variant="secondary">Não respondida</Badge>
                                            ) : sq.correta ? (
                                                <Badge className="bg-approval/20 text-approval-foreground">Correta</Badge>
                                            ) : (
                                                <Badge variant="destructive">Incorreta</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {sq.confianca && <Badge variant="outline">{sq.confianca}</Badge>}
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </>
    )
}
