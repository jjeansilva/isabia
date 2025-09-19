

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


function QuestionRunner({ questao, onAnswer, isAnswered, initialAnswer }: { questao: Questao, onAnswer: (answer: any, confianca: RespostaConfianca) => void, isAnswered: boolean, initialAnswer: any }) {
    const [selectedAnswer, setSelectedAnswer] = useState<any>(initialAnswer ?? null);
    const [confianca, setConfianca] = useState<RespostaConfianca>('Dúvida');
    const [showReportModal, setShowReportModal] = useState(false);
    
    useEffect(() => {
        setSelectedAnswer(initialAnswer ?? null);
    }, [initialAnswer, questao]);

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
                <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-xl">Enunciado</CardTitle>
                    <div className="flex gap-2 items-center flex-shrink-0">
                        <Badge variant="secondary">{questao.tipo}</Badge>
                        <Badge variant="outline">{questao.dificuldade}</Badge>
                         <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setShowReportModal(true)} title="Reportar Erro">
                            <Flag className="h-4 w-4" />
                         </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-base sm:text-lg mb-6">{questao.enunciado}</p>

                {/* Answer Area */}
                <div className="space-y-4 text-sm sm:text-base">
                    {questao.tipo === 'Múltipla Escolha' && Array.isArray(alternativas) && (
                         <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer} disabled={isAnswered}>
                            {alternativas.map((alt, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                    <RadioGroupItem value={alt} id={`alt-${index}`} />
                                    <Label htmlFor={`alt-${index}`} className="text-sm sm:text-base">{alt}</Label>
                                </div>
                            ))}
                        </RadioGroup>
                    )}
                    {questao.tipo === 'Certo ou Errado' && (
                        <RadioGroup value={String(selectedAnswer)} onValueChange={(v) => setSelectedAnswer(v === 'true')} disabled={isAnswered}>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="true" id="ce-certo" /><Label htmlFor="ce-certo" className="text-sm sm:text-base">Certo</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="false" id="ce-errado" /><Label htmlFor="ce-errado" className="text-sm sm:text-base">Errado</Label></div>
                        </RadioGroup>
                    )}
                    {questao.tipo === 'Completar Lacuna' && (
                        <Input value={selectedAnswer ?? ""} onChange={e => setSelectedAnswer(e.target.value)} disabled={isAnswered} placeholder="Digite sua resposta..."/>
                    )}
                     {questao.tipo === 'Flashcard' && (
                        <div>
                            <p className="text-sm text-muted-foreground mb-4">Lembre-se da resposta e então confirme.</p>
                            <Button onClick={() => setSelectedAnswer(true)} disabled={isAnswered} variant={selectedAnswer === true ? "default" : "outline"} className="mr-2">Lembrei</Button>
                            <Button onClick={() => setSelectedAnswer(false)} disabled={isAnswered} variant={selectedAnswer === false ? "destructive" : "outline"}>Não lembrei</Button>
                        </div>
                    )}
                </div>

                {/* Confidence Area */}
                {!isAnswered && (
                    <div className="mt-8">
                        <Label className="mb-2 block text-sm">Nível de Confiança</Label>
                        <RadioGroup defaultValue="Dúvida" onValueChange={(v: RespostaConfianca) => setConfianca(v)} className="flex flex-col xs:flex-row gap-2 md:gap-4">
                            {[
                                {value: 'Certeza', label: 'Certeza', icon: ThumbsUp},
                                {value: 'Dúvida', label: 'Dúvida', icon: Lightbulb},
                                {value: 'Chute', label: 'Chute', icon: Zap},
                            ].map(c => (
                                <Label key={c.value} htmlFor={`conf-${c.value}`} className={cn("flex-1 flex items-center justify-center gap-2 rounded-lg border p-3 cursor-pointer hover:bg-accent text-xs sm:text-sm", confianca === c.value && "bg-accent border-primary")}>
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
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
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
    const [localAnswers, setLocalAnswers] = useState<Record<string, Partial<SimuladoQuestao>>>({});


    const { data: simuladoResult, isLoading: isLoadingSimulado } = useQuery({
        queryKey: ['simulado', id],
        queryFn: async () => {
            const data = await dataSource.get<Simulado>('simulados', id);
            if (!data) return null;
            try {
                const questoes = typeof data.questoes === 'string' ? JSON.parse(data.questoes) : data.questoes;
                return { ...data, questoes };
            } catch (e) {
                console.error("Failed to parse simulado questoes", e);
                return { ...data, questoes: [] };
            }
        },
    });
    
    const simulado = simuladoResult;

    useEffect(() => {
        if (simulado) {
            const initialAnswers: Record<string, Partial<SimuladoQuestao>> = {};
            let lastAnsweredIndex = -1;
            simulado.questoes.forEach((q: SimuladoQuestao, index: number) => {
                if (q.respostaUsuario !== undefined) {
                    initialAnswers[q.questaoId] = q;
                    lastAnsweredIndex = index;
                }
            });
            setLocalAnswers(initialAnswers);
            setCurrentQuestionIndex(lastAnsweredIndex + 1);
        }
    }, [simulado]);


    useEffect(() => {
      setStartTime(Date.now());
    }, [currentQuestionIndex]);


    const currentSimuladoQuestao = simulado?.questoes[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === (simulado?.questoes.length ?? 0) - 1;


    const { data: questao, isLoading: isLoadingQuestao } = useQuery({
        queryKey: ['questao', currentSimuladoQuestao?.questaoId],
        queryFn: () => dataSource.get<Questao>('questoes', currentSimuladoQuestao!.questaoId),
        enabled: !!currentSimuladoQuestao,
    });
    
    const finishSimuladoMutation = useMutation({
        mutationFn: async () => {
            if (!simulado) throw new Error("Simulado não encontrado.");
            console.log("Iniciando finalização do simulado:", simulado);
            
            const answeredQuestoes = Object.values(localAnswers).filter(q => q.respostaUsuario !== undefined);
            console.log("Questões respondidas para salvar:", answeredQuestoes);
            
            if (answeredQuestoes.length > 0) {
                await dataSource.registrarRespostasSimulado(simulado.id, answeredQuestoes as SimuladoQuestao[]);
            }
    
            await dataSource.update('simulados', simulado.id, {
                status: 'Concluído',
                finalizadoEm: new Date().toISOString(),
                questoes: JSON.stringify(simulado.questoes.map(q => ({...q, ...localAnswers[q.questaoId]})))
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            queryClient.invalidateQueries({ queryKey: ['simulado', id] });
            toast({ title: "Simulado finalizado!", description: "Veja seus resultados." });
            router.push(`/simulados/${id}/resultado`);
        },
        onError: (error: any) => {
            console.error("Erro detalhado ao finalizar simulado:", error);
            toast({ variant: "destructive", title: "Erro ao finalizar simulado", description: error.message });
        },
    });

    const handleAnswer = (answer: any, confianca: RespostaConfianca) => {
        if (!simulado || !questao) return;
        
        const tempoSegundos = Math.max(1, Math.round((Date.now() - startTime) / 1000));

        let parsedRespostaCorreta = questao.respostaCorreta;
        try {
            if (typeof questao.respostaCorreta === 'string') {
                parsedRespostaCorreta = JSON.parse(questao.respostaCorreta)
            }
        } catch(e) {
            // It's not a json, so we use it as is
        }
        
        let isCorrect = parsedRespostaCorreta == answer;

        setLocalAnswers(prev => ({
            ...prev,
            [questao.id]: {
                ...currentSimuladoQuestao,
                questaoId: questao.id,
                respostaUsuario: answer,
                correta: isCorrect,
                confianca,
                tempoSegundos
            }
        }))
    };

    const handleNext = () => {
        if (currentQuestionIndex < (simulado?.questoes.length ?? 0)) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    }
    
    const handleFinish = () => {
        finishSimuladoMutation.mutate();
    }
    
    const answeredLocalOrDB = localAnswers[currentSimuladoQuestao?.questaoId] ?? currentSimuladoQuestao;
    const isCurrentQuestionAnswered = answeredLocalOrDB?.respostaUsuario !== undefined;

    const answeredCount = Object.keys(localAnswers).length;
    const progress = simulado ? (answeredCount / simulado.questoes.length) * 100 : 0;
    
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
                    <Button onClick={handleFinish} disabled={finishSimuladoMutation.isPending}>
                       {finishSimuladoMutation.isPending ? "Finalizando..." : "Ver Resultados"}
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <div>
            <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                    <h1 className="text-lg sm:text-xl font-bold truncate pr-4">{simulado.nome}</h1>
                    <div className="flex items-center gap-2 flex-shrink-0">
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
                                            <AlertDialogAction onClick={handleFinish} disabled={finishSimuladoMutation.isPending}>
                                                {finishSimuladoMutation.isPending ? "Finalizando..." : "Finalizar"}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                <Progress value={progress} />
            </div>

            {questao && <QuestionRunner questao={questao} onAnswer={handleAnswer} isAnswered={isCurrentQuestionAnswered} initialAnswer={answeredLocalOrDB.respostaUsuario} />}

            {isCurrentQuestionAnswered && questao && (
                <div className="mt-4 space-y-4">
                    <AnswerFeedback isCorrect={answeredLocalOrDB.correta!} explanation={questao.explicacao} />
                    {isLastQuestion ? (
                         <Button onClick={handleFinish} className="w-full" disabled={finishSimuladoMutation.isPending}>
                            {finishSimuladoMutation.isPending ? "Finalizando..." : "Finalizar Simulado"}
                        </Button>
                    ) : (
                        <Button onClick={handleNext} className="w-full">Próxima Questão</Button>
                    )}
                </div>
            )}

            <div className="mt-8 flex justify-end">
                 <Button variant="outline" onClick={() => router.push('/simulados')}>Pausar e Sair</Button>
            </div>
        </div>
    )
}
