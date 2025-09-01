import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookCopy } from "lucide-react";

export default function TaxonomiaPage() {
  return (
    <>
      <PageHeader
        title="Taxonomia"
        description="Gerencie suas disciplinas, tópicos e subtópicos."
      />
      <Card className="flex flex-col items-center justify-center text-center p-8 min-h-[400px]">
        <CardHeader>
            <div className="mx-auto bg-muted rounded-full p-4 w-fit">
                <BookCopy className="h-10 w-10 text-muted-foreground" />
            </div>
            <CardTitle className="mt-4">Em Construção</CardTitle>
            <CardDescription>A funcionalidade de gerenciamento de taxonomia está sendo desenvolvida.</CardDescription>
        </CardHeader>
      </Card>
    </>
  );
}
