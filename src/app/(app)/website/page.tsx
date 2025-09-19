"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import Image from "next/image";

const features = [
    {
        title: "Estudo Inteligente",
        description: "Nossa plataforma utiliza IA para otimizar seu aprendizado e focar nos seus pontos fracos.",
    },
    {
        title: "Simulados Personalizados",
        description: "Crie simulados com base em disciplinas, tópicos e nível de dificuldade para uma prática direcionada.",
    },
    {
        title: "Repetição Espaçada",
        description: "Nunca mais esqueça o que estudou com nosso sistema de revisão baseado em algoritmos comprovados.",
    },
];

export default function WebsitePage() {
    return (
        <div className="bg-background text-foreground">
            {/* Hero Section */}
            <section className="container mx-auto px-4 py-20 text-center">
                <h1 className="text-4xl md:text-6xl font-bold font-headline tracking-tight">
                    Revolucione Seus Estudos com iSabIA
                </h1>
                <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                    A plataforma inteligente que personaliza sua preparação para concursos e provas, maximizando seu desempenho.
                </p>
                <div className="mt-8 flex justify-center gap-4">
                    <Button size="lg">Começar Agora</Button>
                    <Button size="lg" variant="outline">Ver Funcionalidades</Button>
                </div>
            </section>

            {/* Feature Section */}
            <section className="bg-muted/50 py-20">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold font-headline">
                            Tudo que Você Precisa para ser Aprovado
                        </h2>
                        <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
                            Ferramentas poderosas para levar seu estudo para o próximo nível.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        {features.map((feature, index) => (
                            <Card key={index}>
                                <CardHeader>
                                    <div className="flex items-center gap-3">
                                        <div className="bg-primary/10 text-primary p-2 rounded-full">
                                            <CheckCircle className="h-6 w-6" />
                                        </div>
                                        <CardTitle>{feature.title}</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground">{feature.description}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>
            
             {/* Image Showcase Section */}
            <section className="container mx-auto px-4 py-20">
                 <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold font-headline">
                           Visual e Intuitivo
                        </h2>
                        <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
                           Uma interface projetada para manter você focado e motivado.
                        </p>
                    </div>
                <div className="relative aspect-video w-full max-w-5xl mx-auto overflow-hidden rounded-2xl border-4 border-primary/10 shadow-2xl">
                     <Image
                        src="https://picsum.photos/seed/dashboard-ui/1280/720"
                        alt="Screenshot do Dashboard iSabIA"
                        fill
                        className="object-cover"
                        data-ai-hint="dashboard ui"
                     />
                </div>
            </section>
        </div>
    );
}