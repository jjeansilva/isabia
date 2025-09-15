

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useData } from "@/hooks/use-data";
import { Questao, Simulado, SimuladoQuestao, RespostaConfianca, Resposta } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { AlertCircle, Check, ThumbsUp, X, Lightbulb, Zap, Flag, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
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
} from "@/components/ui/alert-dialog";
import { ReportErrorForm } from "@/components/forms/report-error-form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


function QuestionRunner({ questao, onAnswer, isAnswered }: { questao: Questao, onAnswer: (answer: any, confianca: RespostaConfianca) => void, isAnswered: boolean }) {
    const [selectedAnswer, setSelectedAnswer] = useState<any>(null);
    const [confianca, setConfianca] = useState<RespostaConfianca>('Dúvida');
    const [showReportModal, setShowReportModal] = useState(false);
    
    let alternativas = questao.alternativas;
    if (typeof alternativas === 'string' && alternativas) {
        try {
            alternativas = JSON.parse(alternativas);
        } catch (e) {
            alternativas = [];
        }
    }


    const handleAnswer = () => {
        if (selectedAnswer !== null) {
            onAnswer(selectedAnswer, confianca);
        }
    }
    
    return (
        <>
        {showReportModal && <ReportErrorForm open={showReportModal} onOpenChange={setShowReportModal} questao={questao} />}
        <Card className="mt-4">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle>Enunciado</CardTitle>
                    <div className="flex gap-2 items-center">
                        <Badge variant="secondary">{questao.tipo}</Badge>
                        <Badge variant="outline">{questao.dificuldade}</Badge>
                         <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setShowReportModal(true)} title="Reportar Erro">
                            <Flag className="h-4 w-4" />
                         </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-lg mb-6">{questao.enunciado}</p>

                {/* Answer Area */}
                <div className="space-y-4">
                    {questao.tipo === 'Múltipla Escolha' && Array.isArray(alternativas) && (
                        <RadioGroup onValueChange={setSelectedAnswer} disabled={isAnswered}>
                            {alternativas.map((alt, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                    <RadioGroupItem value={alt} id={`alt-${index}`} />
                                    <Label htmlFor={`alt-${index}`} className="text-base">{alt}</Label>
                                </div>
                            ))}
                        </RadioGroup>
                    )}
                    {questao.tipo === 'Certo ou Errado' && (
                        <RadioGroup onValueChange={(v) => setSelectedAnswer(v === 'true')} disabled={isAnswered}>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="true" id="ce-certo" /><Label htmlFor="ce-certo" className="text-base">Certo</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="false" id="ce-errado" /><Label htmlFor="ce-errado" className="text-base">Errado</Label></div>
                        </RadioGroup>
                    )}
                    {questao.tipo === 'Completar Lacuna' && (
                        <Input onChange={e => setSelectedAnswer(e.target.value)} disabled={isAnswered} placeholder="Digite sua resposta..."/>
                    )}
                     {questao.tipo === 'Flashcard' && (
                        <div>
                            <Button onClick={() => setSelectedAnswer(true)} disabled={isAnswered} variant="outline" className="mr-2">Lembrei</Button>
                            <Button onClick={() => setSelectedAnswer(false)} disabled={isAnswered} variant="outline">Não lembrei</Button>
                        </div>
                    )}
                </div>

                {/* Confidence Area */}
                {!isAnswered && (
                    <div className="mt-8">
                        <Label className="mb-2 block">Nível de Confiança</Label>
                        <RadioGroup defaultValue="Dúvida" onValueChange={(v: RespostaConfianca) => setConfianca(v)} className="flex gap-2 md:gap-4">
                            {[
                                {value: 'Certeza', label: 'Certeza', icon: ThumbsUp},
                                {value: 'Dúvida', label: 'Dúvida', icon: Lightbulb},
                                {value: 'Chute', label: 'Chute', icon: Zap},
                            ].map(c => (
                                <Label key={c.value} htmlFor={`conf-${c.value}`} className={cn("flex-1 flex items-center justify-center gap-2 rounded-lg border p-3 cursor-pointer hover:bg-accent", confianca === c.value && "bg-accent border-primary")}>
                                    <RadioGroupItem value={c.value} id={`conf-${c.value}`} className="sr-only"/>
                                    <c.icon className="h-4 w-4"/>
                                    <span>{c.label}</span>
                                </Label>
                            ))}
                        </RadioGroup>
                    </div>
                )}
                
                {!isAnswered && (
                    <Button onClick={handleAnswer} disabled={selectedAnswer === null} className="mt-8 w-full">Confirmar Resposta</Button>
                )}
            </CardContent>
        </Card>
        </>
    )
}

function AnswerFeedback({ isCorrect, explanation }: { isCorrect: boolean, explanation?: string}) {
    return (
        <Card className={cn("mt-4", isCorrect ? "border-approval" : "border-destructive")}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    {isCorrect ? <Check className="text-approval" /> : <X className="text-destructive" />}
                    {isCorrect ? "Resposta Correta!" : "Resposta Incorreta"}
                </CardTitle>
            </CardHeader>
            {explanation && (
                <CardContent>
                    <p className="text-sm text-muted-foreground">{explanation}</p>
                </CardContent>
            )}
        </Card>
    )
}


export default function SimuladoExecutionPage() {
    const params = useParams();
    const router = useRouter();
    const dataSource = useData();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const id = params.id as string;

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [startTime, setStartTime] = useState(Date.now());


    const { data: simuladoResult, isLoading: isLoadingSimulado } = useQuery({
        queryKey: ['simulado', id],
        queryFn: () => dataSource.get<Simulado>('simulados_abcde1', id),
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

    useEffect(() => {
        if (simulado) {
            // This was causing the error. The status update should be handled before navigating to this page.
            // if (simulado.status === 'Rascunho') {
            //     updateSimuladoMutation.mutate({ status: 'Em andamento' });
            // }
            const lastAnsweredIndex = simulado.questoes.findLastIndex((q: any) => q.respostaUsuario !== undefined) ?? -1;
            setCurrentQuestionIndex(lastAnsweredIndex + 1);
            setStartTime(Date.now());
        }
    }, [simulado?.id]); // Rerun only when simulado id changes to set initial state


    const currentSimuladoQuestao = simulado?.questoes[currentQuestionIndex];

    const { data: questao, isLoading: isLoadingQuestao } = useQuery({
        queryKey: ['questao', currentSimuladoQuestao?.questaoId],
        queryFn: () => dataSource.get<Questao>('questoes_abcde1', currentSimuladoQuestao!.questaoId),
        enabled: !!currentSimuladoQuestao,
    });
    
    const updateSimuladoMutation = useMutation({
        mutationFn: (data: Partial<Simulado>) => {
            const dataToUpdate: any = { ...data };
            if (data.questoes) {
                dataToUpdate.questoes = JSON.stringify(data.questoes);
            }
            return dataSource.update<Simulado>('simulados_abcde1', id, dataToUpdate);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['simulado', id] });
        }
    });

     const createRespostasMutation = useMutation({
        mutationFn: (respostas: Omit<Resposta, 'id' | 'user' | 'createdAt' | 'updatedAt'>[]) => 
            dataSource.bulkCreate<Omit<Resposta, 'id' | 'user' | 'createdAt' | 'updatedAt'>>('respostas_abcde1', respostas),
        onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: ['dashboardStats']});
        },
        onError: (error) => {
            toast({ variant: "destructive", title: "Erro ao salvar respostas", description: error.message });
        }
    });

    const handleAnswer = (answer: any, confianca: RespostaConfianca) => {
        if (!simulado || !questao) return;
        
        const tempoSegundos = Math.round((Date.now() - startTime) / 1000);

        let parsedRespostaCorreta = questao.respostaCorreta;
        try {
            if (typeof questao.respostaCorreta === 'string') {
                parsedRespostaCorreta = JSON.parse(questao.respostaCorreta)
            }
        } catch(e) {
            // It's not a JSON, so we use it as is
        }
        
        let isCorrect = parsedRespostaCorreta === answer;

        const updatedQuestoes = simulado.questoes.map((q, index) => 
            index === currentQuestionIndex 
                ? { ...q, respostaUsuario: answer, correta: isCorrect, confianca, tempoSegundos } 
                : q
        );
        
        updateSimuladoMutation.mutate({ questoes: updatedQuestoes });
    };

    const handleNext = () => {
        if (currentQuestionIndex < (simulado?.questoes.length ?? 0) - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setStartTime(Date.now());
        }
    }
    
    const handleFinish = () => {
        if (!simulado) return;

        const questoesRespondidas = simulado.questoes.filter(q => q.respostaUsuario !== undefined);

        if (questoesRespondidas.length > 0) {
            const respostasToCreate = questoesRespondidas.map(q => ({
                acertou: !!q.correta,
                confianca: q.confianca || 'Dúvida',
                questaoId: q.questaoId,
                respostaUsuario: q.respostaUsuario,
                simuladoId: simulado.id,
                respondedAt: new Date().toISOString(),
                tempoSegundos: q.tempoSegundos || 0,
            }));
            createRespostasMutation.mutate(respostasToCreate);
        }

        updateSimuladoMutation.mutate(
            { status: 'Concluído', finalizadoEm: new Date().toISOString() },
            {
                onSuccess: () => {
                    toast({title: "Simulado finalizado!", description: "Veja seus resultados."});
                    router.push(`/simulados/${id}/resultado`);
                }
            }
        );
    }
    
    const isCurrentQuestionAnswered = currentSimuladoQuestao?.respostaUsuario !== undefined;
    const progress = simulado ? ((currentQuestionIndex + (isCurrentQuestionAnswered ? 1 : 0)) / simulado.questoes.length) * 100 : 0;
    
    if (isLoadingSimulado || (isLoadingQuestao && simulado && currentQuestionIndex < simulado.questoes.length)) {
        return <Skeleton className="h-96 w-full"/>
    }

    if (!simulado) {
        return <p>Simulado não encontrado.</p>
    }
    
    if(currentQuestionIndex >= simulado.questoes.length && simulado.status !== 'Concluído') {
        return (
            <Card className="text-center p-8">
                <CardTitle className="mb-4">Parabéns!</CardTitle>
                <CardContent>
                    <p className="mb-6">Você concluiu todas as questões deste simulado.</p>
                    <Button onClick={handleFinish}>Ver Resultados</Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <div>
            <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                    <h1 className="text-xl font-bold">{simulado.nome}</h1>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{Math.min(currentQuestionIndex + 1, simulado.questoes.length)} / {simulado.questoes.length}</span>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4"/></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">Finalizar Simulado</DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Finalizar Simulado?</AlertDialogTitle></AlertDialogHeader>
                                        <AlertDialogDescription>
                                            Você tem certeza que quer finalizar o simulado? Questões não respondidas serão ignoradas.
                                        </AlertDialogDescription>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleFinish}>Finalizar</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                <Progress value={progress} />
            </div>

            {questao && <QuestionRunner questao={questao} onAnswer={handleAnswer} isAnswered={isCurrentQuestionAnswered} />}

            {isCurrentQuestionAnswered && questao && (
                <>
                    <AnswerFeedback isCorrect={currentSimuladoQuestao.correta!} explanation={questao.explicacao} />
                     <Button onClick={handleNext} className="mt-4 w-full">Próxima Questão</Button>
                </>
            )}

            <div className="mt-8 flex justify-end">
                 <Button variant="outline" onClick={() => router.push('/simulados')}>Pausar e Sair</Button>
            </div>
        </div>
    )
}
