

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useData } from "@/hooks/use-data";
import { Questao, Simulado, SimuladoQuestao, RespostaConfianca } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { AlertCircle, Check, ThumbsUp, X, Lightbulb, Zap } from "lucide-react";
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

function QuestionRunner({ questao, onAnswer, isAnswered }: { questao: Questao, onAnswer: (answer: any, confianca: RespostaConfianca) => void, isAnswered: boolean }) {
    const [selectedAnswer, setSelectedAnswer] = useState<any>(null);
    const [confianca, setConfianca] = useState<RespostaConfianca>('Dúvida');
    
    let alternativas = questao.alternativas;
    if (typeof alternativas === 'string') {
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
        <Card className="mt-4">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Enunciado</CardTitle>
                    <div className="flex gap-2">
                        <Badge variant="secondary">{questao.tipo}</Badge>
                        <Badge variant="outline">{questao.dificuldade}</Badge>
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

    const { data: simulado, isLoading: isLoadingSimulado } = useQuery({
        queryKey: ['simulado', id],
        queryFn: () => dataSource.get<Simulado>('simulados', id),
        onSuccess: (data) => {
          if (data && data.status === 'rascunho') {
              // Start the exam
              mutation.mutate({ status: 'andamento' });
          }
          const lastAnsweredIndex = data?.questoes.findLastIndex(q => q.respostaUsuario !== undefined) ?? -1;
          setCurrentQuestionIndex(lastAnsweredIndex + 1);
        }
    });

    const currentSimuladoQuestao = simulado?.questoes[currentQuestionIndex];

    const { data: questao, isLoading: isLoadingQuestao } = useQuery({
        queryKey: ['questao', currentSimuladoQuestao?.questaoId],
        queryFn: () => dataSource.get<Questao>('questoes', currentSimuladoQuestao!.questaoId),
        enabled: !!currentSimuladoQuestao,
    });
    
    const mutation = useMutation({
        mutationFn: (data: Partial<Simulado>) => dataSource.update<Simulado>('simulados', id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['simulado', id] });
        }
    });

    const handleAnswer = (answer: any, confianca: RespostaConfianca) => {
        if (!simulado || !questao) return;

        let parsedRespostaCorreta = questao.respostaCorreta;
        try {
            parsedRespostaCorreta = JSON.parse(questao.respostaCorreta)
        } catch(e) {
            // It's not a JSON, so we use it as is
        }
        
        let isCorrect = parsedRespostaCorreta === answer;

        const updatedQuestoes = simulado.questoes.map((q, index) => 
            index === currentQuestionIndex 
                ? { ...q, respostaUsuario: answer, correta: isCorrect, confianca } 
                : q
        );
        
        mutation.mutate({ questoes: updatedQuestoes });
    };

    const handleNext = () => {
        if (currentQuestionIndex < (simulado?.questoes.length ?? 0) - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    }
    
    const handleFinish = () => {
        mutation.mutate(
            { status: 'concluido', finalizadoEm: new Date().toISOString() },
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
    
    if (isLoadingSimulado || isLoadingQuestao && currentQuestionIndex < (simulado?.questoes.length ?? 0)) {
        return <Skeleton className="h-96 w-full"/>
    }

    if (!simulado) {
        return <p>Simulado não encontrado.</p>
    }
    
    if(currentQuestionIndex >= simulado.questoes.length) {
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
                    <span className="text-sm font-medium">{currentQuestionIndex + 1} / {simulado.questoes.length}</span>
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
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive">Finalizar Simulado</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Finalizar Simulado?</AlertDialogTitle></AlertDialogHeader>
                        <AlertDialogDescription>
                            Você tem certeza que quer finalizar o simulado? Questões não respondidas serão contadas como erradas.
                        </AlertDialogDescription>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleFinish}>Finalizar</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    )
}
