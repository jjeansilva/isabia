import { SimuladoForm } from "@/components/forms/simulado-form";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function NovoSimuladoPage() {
    return (
        <>
            <PageHeader
                title="Novo Simulado"
                description="Defina os critérios para gerar um novo simulado."
            />
            <Card>
                <CardContent className="pt-6">
                    <SimuladoForm />
                </CardContent>
            </Card>
        </>
    )
}
