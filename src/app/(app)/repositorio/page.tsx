
"use client";

import { useSearchParams } from 'next/navigation';
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CorrecoesTab } from "./_components/correcoes-tab";
import { QuestoesTab } from "./_components/questoes-tab";
import { TaxonomiaTab } from "./_components/taxonomia-tab";
import { Button } from '@/components/ui/button';
import { PlusCircle, Upload } from 'lucide-react';
import Link from 'next/link';

export default function RepositorioPage() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'questoes';

  return (
    <>
      <PageHeader
        title="Repositório de Conteúdo"
        description="Gerencie e aprimore todo o seu acervo de estudos em um só lugar."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/repositorio/importar">
            <Upload className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Importar Questões</span>
          </Link>
        </Button>
         <Button asChild>
            <Link href="/repositorio?new=true">
                <PlusCircle className="mr-2 h-4 w-4" />
                Nova Questão
            </Link>
        </Button>
      </PageHeader>
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl">
          <TabsTrigger value="questoes">Questões</TabsTrigger>
          <TabsTrigger value="correcoes">Correções</TabsTrigger>
          <TabsTrigger value="taxonomia">Taxonomia</TabsTrigger>
        </TabsList>
        <TabsContent value="questoes" className="mt-6">
          <QuestoesTab />
        </TabsContent>
        <TabsContent value="correcoes" className="mt-6">
          <CorrecoesTab />
        </TabsContent>
        <TabsContent value="taxonomia" className="mt-6">
          <TaxonomiaTab />
        </TabsContent>
      </Tabs>
    </>
  );
}
