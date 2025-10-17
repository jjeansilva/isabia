

"use client";

import { useEffect } from "react";
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { PlusCircle, Upload } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { CorrecoesTab } from "../repositorio/_components/correcoes-tab";
import { QuestoesTab } from "../repositorio/_components/questoes-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


export default function QuestoesPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new repository page, preserving any query params
    const params = new URLSearchParams(window.location.search);
    router.replace(`/repositorio?${params.toString()}`);
  }, [router]);

  // Render a loading state or null while redirecting
  return (
     <div className="w-full h-96 flex items-center justify-center">
      <p>Redirecionando para o novo repositório...</p>
    </div>
  );
}
