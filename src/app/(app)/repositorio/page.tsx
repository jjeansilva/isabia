import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CorrecoesTab } from "./_components/correcoes-tab";
import { QuestoesTab } from "./_components/questoes-tab";
import { TaxonomiaTab } from "./_components/taxonomia-tab";
import { Archive } from "lucide-react";

export default function RepositorioPage() {
  return (
    <>
      <PageHeader
        title="Repositório de Conteúdo"
        description="Gerencie e aprimore todo o seu acervo de estudos em um só lugar."
      />
      <Tabs defaultValue="questoes" className="w-full">
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
