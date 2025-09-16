
"use client"

import { Questao } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { AlertTriangle, Check, Edit, Trash2 } from "lucide-react";
import { Separator } from "../ui/separator";

interface ReportedQuestionsListProps {
  questoes: Questao[];
  onEdit: (questao: Questao) => void;
  onDelete: (questao: Questao) => void;
  onMarkAsCorrected: (questao: Questao) => void;
}

export function ReportedQuestionsList({ questoes, onEdit, onDelete, onMarkAsCorrected }: ReportedQuestionsListProps) {
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
                <div className="flex-shrink-0 flex items-center gap-1">
                   <Button variant="outline" size="sm" onClick={() => onMarkAsCorrected(q)} title="Marcar como corrigida">
                    <Check className="h-4 w-4 mr-1 text-approval" />
                    Corrigida
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onEdit(q)}>
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                   <Button variant="destructive-outline" size="sm" onClick={() => onDelete(q)}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Excluir
                  </Button>
                </div>
              </div>
              {index < questoes.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
