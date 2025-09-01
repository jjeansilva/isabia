"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resetLocalStorage } from "@/lib/seed";
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

export default function ConfiguracoesPage() {
  const { toast } = useToast();

  const handleReset = () => {
    resetLocalStorage();
    toast({ title: "Dados Resetados!", description: "Os dados de exemplo foram recarregados."});
    // A simple reload to reflect changes everywhere.
    // In a real app with better state management, this wouldn't be necessary.
    window.location.reload();
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
                <Button variant="destructive">Resetar Ambiente</Button>
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
                  <AlertDialogAction onClick={handleReset}>Sim, Resetar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
