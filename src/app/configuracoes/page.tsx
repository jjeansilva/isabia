"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { seedPocketBase, resetLocalStorage } from "@/lib/seed";
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
} from "@/components/ui/alert-dialog"
import { useData } from "@/hooks/use-data";
import { useState } from "react";


export default function ConfiguracoesPage() {
  const { toast } = useToast();
  const dataSource = useData();
  const [isSeeding, setIsSeeding] = useState(false);

  const handleReset = async () => {
    const usePocketBase = !!process.env.NEXT_PUBLIC_PB_URL;
    
    setIsSeeding(true);
    toast({ title: "Resetando o ambiente...", description: "Por favor, aguarde."});

    try {
      if (usePocketBase) {
        await seedPocketBase(dataSource);
        toast({ title: "Sucesso!", description: "O banco de dados foi populado com dados de exemplo."});
      } else {
        resetLocalStorage();
        toast({ title: "Dados Resetados!", description: "Os dados de exemplo foram recarregados."});
      }
       // A simple reload to reflect changes everywhere.
      window.location.reload();
    } catch (error: any) {
      console.error("Failed to seed data:", error);
      toast({ variant: "destructive", title: "Erro ao popular dados!", description: error.message || "Não foi possível completar a operação."});
    } finally {
      setIsSeeding(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Configurações"
        description="Gerencie suas preferências e dados da aplicação."
      />
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Gerenciamento de Dados</CardTitle>
            <CardDescription>
              Exporte seus dados para um backup ou resete o ambiente para os dados de exemplo.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Button variant="outline" disabled>Exportar Dados</Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isSeeding}>
                  {isSeeding ? "Resetando..." : "Resetar Ambiente"}
                  </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação apagará todos os dados atuais e restaurará os dados de exemplo iniciais. Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReset} disabled={isSeeding}>Sim, Resetar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
