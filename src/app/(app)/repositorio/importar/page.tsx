
"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { v4 as uuidv4 } from 'uuid';

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useData } from "@/hooks/use-data";
import { QuestionDificuldade, QuestionOrigem, QuestionTipo, Questao, Topico, Disciplina } from "@/types";
import { parseCsvForReview } from "@/lib/csv-parser";
import { ArrowLeft, Edit, Save, Trash2, UploadCloud, Terminal } from "lucide-react";
import { QuestionForm } from "@/components/forms/question-form";

// Schema for the initial form (upload/paste)
const uploadSchema = z.object({
  tipo: z.enum(["Múltipla Escolha", "Certo ou Errado", "Completar Lacuna", "Flashcard"]),
  origem: z.enum(["Autoral", "Conteúdo", "Legislação", "Jurisprudência", "Já caiu"]),
  csvFile: z.custom<FileList>().optional(),
  csvText: z.string().optional(),
}).refine(data => (data.csvFile && data.csvFile.length > 0) || (data.csvText && data.csvText.trim().length > 0), {
  message: "Forneça um arquivo CSV ou cole o texto para importar.",
  path: ["csvFile"], 
});

type UploadValues = z.infer<typeof uploadSchema>;

// Represents a question parsed from the CSV, not yet saved
type ParsedQuestao = Omit<Questao, 'id' | 'createdAt' | 'updatedAt' | 'user'> & { 
    tempId: string,
    disciplinaNome?: string,
    topicoNome?: string,
    subtopicoNome?: string
};

export default function ImportarPage() {
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [parsedQuestoes, setParsedQuestoes] = useState<ParsedQuestao[]>([]);
  const [baseQuestaoData, setBaseQuestaoData] = useState<{ tipo: QuestionTipo, origem: QuestionOrigem } | null>(null);
  const [importLog, setImportLog] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedQuestao, setSelectedQuestao] = useState<{questao: ParsedQuestao, index: number} | undefined>(undefined);

  const { toast } = useToast();
  const dataSource = useData();
  const queryClient = useQueryClient();

  const form = useForm<UploadValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: { tipo: "Múltipla Escolha", origem: "Autoral" },
  });
  const [activeTab, setActiveTab] = useState("file");

  const handleParseCsv = async (values: UploadValues) => {
    setIsParsing(true);
    try {
      let csvData = "";
      if (activeTab === "file" && values.csvFile && values.csvFile.length > 0) {
        csvData = await values.csvFile[0].text();
      } else if (activeTab === "text" && values.csvText) {
        csvData = values.csvText;
      }
      
      if (!csvData) {
        toast({ variant: "destructive", title: "Nenhum dado CSV encontrado." });
        return;
      }
      
      const { questoes, log } = await parseCsvForReview(csvData, values.tipo, values.origem, dataSource);
      
      const questoesWithTempId = questoes.map(q => ({ ...q, tempId: uuidv4() }));
      setParsedQuestoes(questoesWithTempId);
      setBaseQuestaoData({ tipo: values.tipo, origem: values.origem });
      setImportLog(log);

      setStep("review");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao processar CSV", description: error.message });
    } finally {
      setIsParsing(false);
    }
  };
  
  const handleEdit = (index: number) => {
    const questaoToEdit = parsedQuestoes[index];
    setSelectedQuestao({ questao: questaoToEdit, index });
    setIsFormOpen(true);
  };
  
  const handleUpdateQuestao = (updatedQuestao: ParsedQuestao) => {
      if(selectedQuestao === undefined) return;
      const newQuestoes = [...parsedQuestoes];
      newQuestoes[selectedQuestao.index] = updatedQuestao;
      setParsedQuestoes(newQuestoes);
      toast({title: "Questão atualizada na lista de importação."});
  }

  const handleDelete = (index: number) => {
    setParsedQuestoes(prev => prev.filter((_, i) => i !== index));
    toast({ title: "Questão removida da importação." });
  };
  
  const saveMutation = useMutation({
    mutationFn: async (questoesToSave: ParsedQuestao[]) => {
      let createdCount = 0;
      
      const disciplinaCache = new Map<string, string>(); // name -> id
      const topicoCache = new Map<string, string>(); // {disciplinaId}-{topicoName} -> id

      const allDisciplinas = await dataSource.list<Disciplina>('disciplinas');
      allDisciplinas.forEach(d => disciplinaCache.set(d.nome.toLowerCase(), d.id));

      const allTopicos = await dataSource.list<Topico>('topicos');
      allTopicos.forEach(t => topicoCache.set(`${t.disciplinaId}-${t.nome.toLowerCase()}`, t.id));

      for(const questao of questoesToSave) {
          let disciplinaId: string;
          let topicoId: string;

          // 1. Resolve Disciplina
          const disciplinaNomeLower = questao.disciplinaNome!.toLowerCase();
          if (disciplinaCache.has(disciplinaNomeLower)) {
              disciplinaId = disciplinaCache.get(disciplinaNomeLower)!;
          } else {
              const newDisciplina = await dataSource.create<Disciplina>('disciplinas', { nome: questao.disciplinaNome!, cor: '#00329C' } as any);
              disciplinaId = newDisciplina.id;
              disciplinaCache.set(disciplinaNomeLower, disciplinaId);
          }

          // 2. Resolve Tópico Principal
          const topicoNomeLower = questao.topicoNome!.toLowerCase();
          const topicoKey = `${disciplinaId}-${topicoNomeLower}`;
          let topicoPaiId: string;
          if (topicoCache.has(topicoKey)) {
              topicoPaiId = topicoCache.get(topicoKey)!;
          } else {
              const newTopico = await dataSource.create<Topico>('topicos', { nome: questao.topicoNome!, disciplinaId } as any);
              topicoPaiId = newTopico.id;
              topicoCache.set(topicoKey, topicoPaiId);
          }
          topicoId = topicoPaiId;

          // 3. Resolve Subtópico (if exists)
          if (questao.subtopicoNome) {
              const subtopicoNomeLower = questao.subtopicoNome.toLowerCase();
              const subtopicoKey = `${disciplinaId}-${subtopicoNomeLower}`;
              if (topicoCache.has(subtopicoKey)) {
                  topicoId = topicoCache.get(subtopicoKey)!;
              } else {
                  const newSubtopico = await dataSource.create<Topico>('topicos', { nome: questao.subtopicoNome, disciplinaId, topicoPaiId } as any);
                  topicoId = newSubtopico.id;
                  topicoCache.set(subtopicoKey, topicoId);
              }
          }

          // 4. Create Questão
          const questaoToCreate = {
            ...questao,
            disciplinaId: disciplinaId,
            topicoId: topicoId,
            origem: Array.isArray(questao.origem) ? questao.origem[0] : questao.origem,
          };

          await dataSource.create('questoes', questaoToCreate as any);
          createdCount++;
      }
      
      return createdCount;
    },
    onSuccess: (count) => {
        queryClient.invalidateQueries({ queryKey: ["questoes"] });
        queryClient.invalidateQueries({ queryKey: ["disciplinas"] });
        queryClient.invalidateQueries({ queryKey: ["topicos"] });
        toast({ title: "Importação Concluída!", description: `${count} questões foram salvas com sucesso.` });
        setStep("upload");
        setParsedQuestoes([]);
        setImportLog([]);
    },
    onError: (error: any) => {
        const errorMessage = error?.originalError?.data?.message || error.message || "Ocorreu um erro desconhecido.";
        console.error("Erro ao Salvar:", error.originalError?.data || error);
        toast({ variant: "destructive", title: "Erro ao Salvar", description: `Não foi possível salvar as questões. Detalhes: ${errorMessage}` });
    },
    onSettled: () => {
        setIsSaving(false);
    }
  });


  const handleSaveAll = () => {
      if (parsedQuestoes.length === 0) {
          toast({ variant: "destructive", title: "Nenhuma questão para salvar." });
          return;
      }
      setIsSaving(true);
      saveMutation.mutate(parsedQuestoes);
  };

  if (step === "review") {
    return (
      <>
        {isFormOpen && selectedQuestao && (
            <QuestionForm
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                questao={selectedQuestao.questao as unknown as Questao}
                onSaveOveride={(data) => handleUpdateQuestao(data)}
            />
        )}
        <PageHeader title="Conferir Questões Importadas" description={`Você está importando ${parsedQuestoes.length} questões. Verifique os dados antes de salvar.`} />
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-2">
                 <Button variant="outline" onClick={() => setStep('upload')}><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Button>
                 <Button onClick={handleSaveAll} disabled={isSaving}>
                     {isSaving ? "Salvando..." : <><Save className="h-4 w-4 mr-2"/> Salvar Todas as {parsedQuestoes.length} Questões</>}
                </Button>
            </div>
          {importLog.length > 0 && (
            <Alert>
              <Terminal className="h-4 w-4" />
              <AlertTitle>Log de Importação</AlertTitle>
              <AlertDescription>
                <div className="max-h-40 overflow-y-auto mt-2 font-mono text-xs bg-muted/50 p-3 rounded-md">
                  {importLog.map((line, index) => (
                    <p key={index}>{line}</p>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {parsedQuestoes.map((q, index) => (
            <Card key={q.tempId}>
              <CardContent className="p-4 grid gap-4">
                  <div>
                    <p className="text-sm font-semibold">{index + 1}. {q.enunciado}</p>
                    <p className="text-xs text-muted-foreground mt-2"><span className="font-bold">Resposta:</span> {String(q.respostaCorreta)}</p>
                    <p className="text-xs text-muted-foreground mt-1"><span className="font-bold">Explicação:</span> {q.explicacao || "N/A"}</p>
                  </div>
                  <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(index)}><Edit className="h-3 w-3 mr-1.5"/> Editar</Button>
                      <Button variant="destructive-outline" size="sm" onClick={() => handleDelete(index)}><Trash2 className="h-3 w-3 mr-1.5"/> Excluir</Button>
                  </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Importar Questões via CSV" description="Envie um arquivo CSV ou cole o texto para iniciar." />
      <Card>
        <CardContent className="pt-6">
            <Alert className="mb-6">
                <AlertTitle>Formato do CSV</AlertTitle>
                <AlertDescription>
                    <p>O CSV deve conter o seguinte cabeçalho na primeira linha:</p>
                    <pre className="mt-2 text-xs bg-muted p-2 rounded-md whitespace-pre-wrap break-all">
    {`"dificuldade","disciplina","tópico da disciplina","subtópico","questão","resposta","alternativa_2","alternativa_3","...","explicação"`}
                    </pre>
                    <p className="mt-2 text-sm text-muted-foreground">
                    Para questões de <span className="font-bold">Múltipla Escolha</span>, a resposta correta vai na coluna "resposta", e as demais nas colunas "alternativa_x". <br/>
                    Para <span className="font-bold">Certo ou Errado</span>, a resposta é "Certo" ou "Errado". <br/>
                    Disciplinas e tópicos que não existirem serão criados.
                    </p>
                </AlertDescription>
            </Alert>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(handleParseCsv)} className="space-y-6 pt-2">
                <div className="grid md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="tipo" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tipo de Questão Padrão</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                <SelectContent>
                                    {(["Múltipla Escolha", "Certo ou Errado", "Completar Lacuna", "Flashcard"] as QuestionTipo[]).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="origem" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Origem Padrão</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                <SelectContent>
                                    {(['Autoral', 'Conteúdo', 'Legislação', 'Jurisprudência', 'Já caiu'] as QuestionOrigem[]).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </FormItem>
                    )}/>
                </div>
                
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="file">Arquivo CSV</TabsTrigger>
                    <TabsTrigger value="text">Colar Texto</TabsTrigger>
                  </TabsList>
                  <TabsContent value="file" className="pt-4">
                    <FormField control={form.control} name="csvFile" render={({ field: { onChange, ...rest } }) => (
                        <FormItem>
                            <FormLabel>Arquivo CSV</FormLabel>
                            <FormControl><Input type="file" accept=".csv" onChange={(e) => onChange(e.target.files)} {...rest} /></FormControl>
                        </FormItem>
                    )}/>
                  </TabsContent>
                  <TabsContent value="text" className="pt-4">
                    <FormField control={form.control} name="csvText" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Conteúdo CSV</FormLabel>
                            <FormControl><Textarea placeholder="Cole o conteúdo do seu CSV aqui, incluindo o cabeçalho..." className="h-40 font-mono text-xs" {...field} /></FormControl>
                        </FormItem>
                    )}/>
                  </TabsContent>
                </Tabs>
                <FormMessage>{form.formState.errors.csvFile?.message}</FormMessage>
                
                <div className="flex justify-end">
                    <Button type="submit" disabled={isParsing}>
                        {isParsing ? "Processando..." : <><UploadCloud className="h-4 w-4 mr-2" /> Processar e Conferir</>}
                    </Button>
                </div>
            </form>
            </Form>
        </CardContent>
      </Card>
    </>
  );
}

    