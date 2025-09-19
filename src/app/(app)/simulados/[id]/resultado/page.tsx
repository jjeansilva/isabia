
"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useData } from "@/hooks/use-data";
import { Simulado, Questao, SimuladoQuestao } from "@/types";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Percent } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";

export default function ResultadoPage() {
    const params = useParams();
    const id = params.id as string;
    const dataSource = useData();

    const { data: simuladoResult, isLoading: isLoadingSimulado } = useQuery({
        queryKey: ['simuladoResultado', id],
        queryFn: () => dataSource.get<Simulado>('simulados', id),
    });

    const simulado = useMemo(() => {
        if (!simuladoResult) return null;
        try {
            const questoes = typeof simuladoResult.questoes === 'string' ? JSON.parse(simuladoResult.questoes) : simuladoResult.questoes;
            return { ...simuladoResult, questoes };
        } catch (e) {
            console.error("Failed to parse simulado questoes", e);
            return { ...simuladoResult, questoes: [] };
        }
    }, [simuladoResult]);


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

    const answeredQuestoes = (simulado.questoes as SimuladoQuestao[]).filter(q => q.respostaUsuario !== undefined);
    const totalQuestoes = answeredQuestoes.length;
    const acertos = answeredQuestoes.filter(q => q.acertou).length;
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
                    <Table className="text-xs sm:text-sm">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[40px]">#</TableHead>
                                <TableHead>Enunciado</TableHead>
                                <TableHead className="w-[120px]">Resultado</TableHead>
                                <TableHead className="w-[100px]">Confiança</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(simulado.questoes as SimuladoQuestao[]).map(sq => {
                                const questao = getQuestaoById(sq.questaoId);
                                return (
                                    <TableRow key={sq.id}>
                                        <TableCell>{sq.ordem}</TableCell>
                                        <TableCell className="max-w-[150px] sm:max-w-sm truncate">{questao?.enunciado ?? 'Carregando...'}</TableCell>
                                        <TableCell>
                                            {sq.acertou === undefined ? (
                                                <Badge variant="secondary">Não respondida</Badge>
                                            ) : sq.acertou ? (
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
