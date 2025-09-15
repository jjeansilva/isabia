
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useData } from "@/hooks/use-data";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Questao } from "@/types";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Frown, HelpCircle, Smile, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

function ReviewCard({ questao, onAnswer }: { questao: Questao, onAnswer: (performance: 'facil' | 'medio' | 'dificil') => void }) {
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{questao.enunciado}</CardTitle>
      </CardHeader>
      <CardContent className="min-h-[150px]">
        {showAnswer ? (
          <div className="p-4 bg-muted rounded-md space-y-4">
            <p className="font-bold text-lg">{typeof questao.respostaCorreta === 'boolean' ? questao.respostaCorreta.toString() : questao.respostaCorreta}</p>
            {questao.explicacao && <p className="text-sm text-muted-foreground">{questao.explicacao}</p>}
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-[100px]">
             <Button onClick={() => setShowAnswer(true)}>Mostrar Resposta</Button>
          </div>
        )}
      </CardContent>
      {showAnswer && (
        <CardFooter className="flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground">Como foi seu desempenho?</p>
            <div className="flex justify-center gap-2 md:gap-4 w-full">
              <Button variant="outline" className="flex-1 bg-red-100 hover:bg-red-200 text-red-800" onClick={() => onAnswer('dificil')}>
                <Frown className="mr-2 h-4 w-4"/> Difícil
              </Button>
              <Button variant="outline" className="flex-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-800" onClick={() => onAnswer('medio')}>
                <HelpCircle className="mr-2 h-4 w-4"/> Médio
              </Button>
              <Button variant="outline" className="flex-1 bg-green-100 hover:bg-green-200 text-green-800" onClick={() => onAnswer('facil')}>
                <Smile className="mr-2 h-4 w-4"/> Fácil
              </Button>
            </div>
        </CardFooter>
      )}
    </Card>
  )
}

function ReviewRunner() {
    const dataSource = useData();
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

    const { data: questoes, isLoading, isError } = useQuery({
        queryKey: ['questoesRevisao'],
        queryFn: () => dataSource.getQuestoesParaRevisar(),
    });

    const mutation = useMutation({
        mutationFn: ({ questaoId, performance }: { questaoId: string; performance: 'facil' | 'medio' | 'dificil' }) => 
            dataSource.registrarRespostaRevisao(questaoId, performance),
        onSuccess: () => {
             if (currentQuestionIndex < (questoes?.length ?? 0) - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
            } else {
                // Reached the end
                queryClient.invalidateQueries({ queryKey: ['questoesRevisao'] });
                queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            }
        },
        onError: (error) => {
             toast({ variant: "destructive", title: "Erro!", description: error.message || "Não foi possível registrar sua resposta." });
        }
    });

    const handleAnswer = (performance: 'facil' | 'medio' | 'dificil') => {
        if (questoes && questoes[currentQuestionIndex]) {
            const questaoId = questoes[currentQuestionIndex].id;
            mutation.mutate({ questaoId, performance });
        }
    };

    if (isLoading) {
        return <Skeleton className="w-full max-w-2xl h-80 mx-auto" />
    }

    if (isError) {
        return <p className="text-center text-destructive">Não foi possível carregar as questões para revisão.</p>
    }

    const hasFinished = !questoes || questoes.length === 0 || currentQuestionIndex >= questoes.length;

    if (hasFinished) {
        return (
             <Card className="flex flex-col items-center justify-center text-center p-8 min-h-[400px] w-full max-w-2xl mx-auto">
                <CardHeader>
                    <div className="mx-auto bg-approval/20 rounded-full p-4 w-fit">
                        <ThumbsUp className="h-10 w-10 text-approval" />
                    </div>
                    <CardTitle className="mt-4">Revisão Concluída!</CardTitle>
                    <CardDescription>Você revisou todas as questões por hoje. Volte amanhã!</CardDescription>
                </CardHeader>
             </Card>
        )
    }
    
    return (
        <div className="space-y-6">
            <div className="text-center">
                <p className="text-muted-foreground">Questão {currentQuestionIndex + 1} de {questoes.length}</p>
            </div>
            <ReviewCard questao={questoes[currentQuestionIndex]} onAnswer={handleAnswer} />
        </div>
    )
}

export default function RevisaoPage() {
  return (
    <>
      <PageHeader
        title="Revisão do Dia"
        description="Revise as questões usando o sistema de repetição espaçada."
      />
      <ReviewRunner />
    </>
  );
}
