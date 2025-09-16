
"use client"

import { Questao } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { AlertTriangle, Edit } from "lucide-react";
import { Separator } from "../ui/separator";

interface ReportedQuestionsListProps {
  questoes: Questao[];
  onCorrect: (questao: Questao) => void;
}

export function ReportedQuestionsList({ questoes, onCorrect }: ReportedQuestionsListProps) {
  if (questoes.length === 0) {
    return null;
  }

  return (
    <Card className="border-destructive">
      <CardHeader>
        <div className="flex items-start gap-4">
            <div className="mt-1">
                <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
                <CardTitle>Questões Reportadas para Correção</CardTitle>
                <CardDescription>As seguintes questões foram sinalizadas com problemas e precisam de sua atenção.</CardDescription>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {questoes.map((q, index) => (
            <div key={q.id}>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <p className="font-semibold text-sm line-clamp-2">{q.enunciado}</p>
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    <span className="font-medium">Motivo:</span> {q.motivoRevisao || "Não especificado."}
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => onCorrect(q)} className="flex-shrink-0">
                  <Edit className="mr-2 h-3 w-3" />
                  Corrigir
                </Button>
              </div>
              {index < questoes.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
