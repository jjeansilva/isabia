import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { History } from "lucide-react";

export default function RevisaoPage() {
  return (
    <>
      <PageHeader
        title="Revisão"
        description="Revise as questões usando o sistema de repetição espaçada."
      />
      <Card className="flex flex-col items-center justify-center text-center p-8 min-h-[400px]">
        <CardHeader>
            <div className="mx-auto bg-muted rounded-full p-4 w-fit">
                <History className="h-10 w-10 text-muted-foreground" />
            </div>
            <CardTitle className="mt-4">Em Construção</CardTitle>
            <CardDescription>A funcionalidade de revisão (SRS) está sendo desenvolvida.</CardDescription>
        </CardHeader>
      </Card>
    </>
  );
}
