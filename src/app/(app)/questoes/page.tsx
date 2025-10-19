

"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useData } from "@/hooks/use-data";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Questao, Disciplina, Topico, QuestionDificuldade, QuestionTipo, RespostaConfianca, Resposta, StatusQuestoesSimulado } from "@/types";
import { SparklineChart } from "@/components/charts/sparkline-chart";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Filters = {
  disciplinaId: string | "all";
  topicoId: string | "all";
  subTopicoId: string | "all";
  dificuldade: "todas" | QuestionDificuldade;
  statusQuestoes: StatusQuestoesSimulado;
  orderBy: "aleatoria" | "recentes" | "antigas" | "topicos" | "disciplinas";
};

export default function QuestoesPage() {
  const dataSource = useData();
  const queryClient = useQueryClient();
  const [filtersDraft, setFiltersDraft] = useState<Filters>({
    disciplinaId: "all",
    topicoId: "all",
    subTopicoId: "all",
    dificuldade: "todas",
    statusQuestoes: "todas",
    orderBy: "aleatoria",
  });
  const [appliedFilters, setAppliedFilters] = useState<Filters>({
    disciplinaId: "all",
    topicoId: "all",
    subTopicoId: "all",
    dificuldade: "todas",
    statusQuestoes: "todas",
    orderBy: "aleatoria",
  });

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyQuestaoId, setHistoryQuestaoId] = useState<string | null>(null);

  const { data: disciplinas, isLoading: loadingDisciplinas } = useQuery({
    queryKey: ["disciplinas"],
    queryFn: () => dataSource.list<Disciplina>("disciplinas"),
  });

  const { data: topicos, isLoading: loadingTopicos } = useQuery({
    queryKey: ["topicos"],
    queryFn: () => dataSource.list<Topico>("topicos"),
  });

  const { data: respostasUsuario } = useQuery({
    queryKey: ["respostasUsuario"],
    queryFn: () => {
      const userId = dataSource.pb?.authStore.model?.id;
      const filter = userId ? `user = "${userId}"` : undefined;
      return dataSource.list<Resposta>("respostas", filter ? { filter, fields: "id,questaoId,acertou,respondedAt" } : undefined);
    },
  });

  const resolvidasSet = useMemo(() => new Set(respostasUsuario?.map(r => r.questaoId) ?? []), [respostasUsuario]);
  const acertadasSet = useMemo(() => new Set((respostasUsuario ?? []).filter(r => (r.acertou === true || (r as any).acertou === 'true')).map(r => r.questaoId)), [respostasUsuario]);
  const erradasSet = useMemo(() => new Set((respostasUsuario ?? []).filter(r => !(r.acertou === true || (r as any).acertou === 'true')).map(r => r.questaoId)), [respostasUsuario]);

  const filterString = useMemo(() => {
    const parts: string[] = ["isActive=true"]; // somente ativas
    const userId = dataSource.pb?.authStore.model?.id;
    if (userId) parts.push(`user=\"${userId}\"`);
    if (appliedFilters.disciplinaId && appliedFilters.disciplinaId !== "all") parts.push(`disciplinaId=\"${appliedFilters.disciplinaId}\"`);
    // Subtopico tem precedência sobre topico
    if (appliedFilters.subTopicoId && appliedFilters.subTopicoId !== "all") parts.push(`topicoId=\"${appliedFilters.subTopicoId}\"`);
    else if (appliedFilters.topicoId && appliedFilters.topicoId !== "all") parts.push(`topicoId=\"${appliedFilters.topicoId}\"`);
    if (appliedFilters.dificuldade && appliedFilters.dificuldade !== "todas") parts.push(`dificuldade=\"${appliedFilters.dificuldade}\"`);
    return parts.join(" && ");
  }, [appliedFilters, dataSource.pb?.authStore.model?.id]);

  const { data: todasQuestoes, isLoading: loadingQuestoes, refetch: refetchQuestoes } = useQuery({
    queryKey: ["questoes", filterString],
    queryFn: () => dataSource.list<Questao>("questoes", { filter: filterString }),
  });

  const topicosByIdObj = useMemo(() => new Map((topicos ?? []).map(t => [t.id, t])), [topicos]);
  const lastRespostaByQuestao = useMemo(() => {
    const map = new Map<string, { acertou: any; respondedAt?: string }>();
    (respostasUsuario ?? []).forEach((r: any) => {
      const prev = map.get(r.questaoId);
      const rTime = r.respondedAt ? new Date(r.respondedAt).getTime() : 0;
      const pTime = prev?.respondedAt ? new Date(prev.respondedAt).getTime() : -Infinity;
      if (!prev || rTime > pTime) {
        map.set(r.questaoId, { acertou: r.acertou, respondedAt: r.respondedAt });
      }
    });
    return map;
  }, [respostasUsuario]);

  const disciplinasByIdObj = useMemo(() => new Map((disciplinas ?? []).map(d => [d.id, d])), [disciplinas]);

  const historyList = useMemo(() => {
    if (!historyQuestaoId) return [] as Array<{ acertou: any; respondedAt?: string }>;
    const list = (respostasUsuario ?? []).filter((r: any) => r.questaoId === historyQuestaoId);
    return list.sort((a: any, b: any) => new Date(a.respondedAt).getTime() - new Date(b.respondedAt).getTime());
  }, [historyQuestaoId, respostasUsuario]);

  const historyChartData = useMemo(() => {
    let correct = 0;
    return historyList.map((r, idx) => {
      if (r.acertou === true || r.acertou === 'true') correct++;
      const rate = Math.round((correct / (idx + 1)) * 100);
      const dateLabel = r.respondedAt ? r.respondedAt.split('T')[0] : `${idx + 1}`;
      return { date: dateLabel, acerto: rate };
    });
  }, [historyList]);

  const questoesFiltradas = useMemo(() => {
    let list = (todasQuestoes ?? []).slice();
    switch (appliedFilters.statusQuestoes) {
      case "nao_resolvidas":
        list = list.filter(q => !resolvidasSet.has(q.id));
        break;
      case "resolvidas":
        list = list.filter(q => resolvidasSet.has(q.id));
        break;
      case "erradas":
        list = list.filter(q => erradasSet.has(q.id));
        break;
      case "acertadas":
        list = list.filter(q => acertadasSet.has(q.id));
        break;
      case "todas":
      default:
        break;
    }
    // Ordenação
    const sorted = list.slice();
    switch (appliedFilters.orderBy) {
      case "recentes":
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "antigas":
        sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case "topicos": {
        sorted.sort((a, b) => {
          const ta = topicosByIdObj.get(a.topicoId);
          const tb = topicosByIdObj.get(b.topicoId);
          const oa = ta?.ordem ?? Number.MAX_SAFE_INTEGER;
          const ob = tb?.ordem ?? Number.MAX_SAFE_INTEGER;
          if (oa !== ob) return oa - ob;
          const na = ta?.nome ?? "";
          const nb = tb?.nome ?? "";
          return na.localeCompare(nb);
        });
        break;
      }
      case "disciplinas": {
        sorted.sort((a, b) => {
          const da = disciplinasByIdObj.get(a.disciplinaId);
          const db = disciplinasByIdObj.get(b.disciplinaId);
          const oa = da?.ordem ?? Number.MAX_SAFE_INTEGER;
          const ob = db?.ordem ?? Number.MAX_SAFE_INTEGER;
          if (oa !== ob) return oa - ob;
          const na = da?.nome ?? "";
          const nb = db?.nome ?? "";
          return na.localeCompare(nb);
        });
        break;
      }
      case "aleatoria":
      default:
        sorted.sort(() => 0.5 - Math.random());
        break;
    }
    return sorted;
  }, [todasQuestoes, appliedFilters.statusQuestoes, appliedFilters.orderBy, resolvidasSet, acertadasSet, erradasSet, topicosByIdObj, disciplinasByIdObj]);

  type LocalAnswer = {
    respostaUsuario: any;
    acertou?: boolean;
    confianca?: RespostaConfianca;
    tempoSegundos?: number;
  };
  const [answers, setAnswers] = useState<Record<string, LocalAnswer>>({});

  const [feedbackByQuestao, setFeedbackByQuestao] = useState<Record<string, { acertou: boolean; explicacao?: string }>>({});

  const salvarResposta = useMutation({
    mutationFn: async (questao: Questao) => {
      const ans = answers[questao.id];
      let acertouCalc: boolean | undefined = ans?.acertou;
      if (questao.tipo === QuestionTipo.MultiplaEscolha) {
        const correta = typeof questao.respostaCorreta === "number" ? String(questao.respostaCorreta) : String(questao.respostaCorreta);
        const resp = ans?.respostaUsuario != null ? String(ans.respostaUsuario) : "";
        acertouCalc = resp !== "" && resp === correta;
      } else if (questao.tipo === QuestionTipo.CertoErrado) {
        const corretaBool = questao.respostaCorreta === true || questao.respostaCorreta === "true" || questao.respostaCorreta === 1 || questao.respostaCorreta === "1";
        const respBool = ans?.respostaUsuario === true || ans?.respostaUsuario === "true" || ans?.respostaUsuario === 1 || ans?.respostaUsuario === "1";
        acertouCalc = respBool === corretaBool;
      } else if (questao.tipo === QuestionTipo.CompletarLacuna) {
        const corretaStr = (questao.respostaCorreta ?? "").toString().trim();
        const respStr = (ans?.respostaUsuario ?? "").toString().trim();
        acertouCalc = respStr !== "" && corretaStr !== "" && respStr === corretaStr;
      } else if (questao.tipo === QuestionTipo.Flashcard) {
        // acertouCalc já está em ans?.acertou
      }

      const payload = {
        questaoId: questao.id,
        acertou: acertouCalc === true ? 'true' : 'false',
        respostaUsuario: typeof ans?.respostaUsuario === 'string' ? ans?.respostaUsuario : JSON.stringify(ans?.respostaUsuario ?? ''),
        confianca: ans?.confianca ?? 'Dúvida',
        respondedAt: new Date().toISOString(),
      };

      return await dataSource.create<Resposta>("respostas", payload as any);
    },
    onSuccess: (_data, questao) => {
      // Recomputar correção para feedback imediato
      const ans = answers[questao.id];
      let acertouCalc: boolean | undefined = ans?.acertou;
      if (questao.tipo === QuestionTipo.MultiplaEscolha) {
        const correta = typeof questao.respostaCorreta === "number" ? String(questao.respostaCorreta) : String(questao.respostaCorreta);
        const resp = ans?.respostaUsuario != null ? String(ans.respostaUsuario) : "";
        acertouCalc = resp !== "" && resp === correta;
      } else if (questao.tipo === QuestionTipo.CertoErrado) {
        const corretaBool = questao.respostaCorreta === true || questao.respostaCorreta === "true" || questao.respostaCorreta === 1 || questao.respostaCorreta === "1";
        const respBool = ans?.respostaUsuario === true || ans?.respostaUsuario === "true" || ans?.respostaUsuario === 1 || ans?.respostaUsuario === "1";
        acertouCalc = respBool === corretaBool;
      } else if (questao.tipo === QuestionTipo.CompletarLacuna) {
        const corretaStr = (questao.respostaCorreta ?? "").toString().trim();
        const respStr = (ans?.respostaUsuario ?? "").toString().trim();
        acertouCalc = respStr !== "" && corretaStr !== "" && respStr === corretaStr;
      } // Flashcard mantém ans?.acertou

      setFeedbackByQuestao(prev => ({
        ...prev,
        [questao.id]: { acertou: acertouCalc === true, explicacao: questao.explicacao }
      }));
      // Não atualizar a lista automaticamente; só com o botão Filtrar
    },
  });

  const renderRespostaInput = (questao: Questao) => {
    const ans = answers[questao.id] ?? {};
    const setAns = (partial: Partial<LocalAnswer>) => setAnswers(prev => ({ ...prev, [questao.id]: { ...prev[questao.id], ...partial } }));

    if (questao.tipo === QuestionTipo.MultiplaEscolha) {
      const alternativas: string[] = Array.isArray(questao.alternativas)
        ? (questao.alternativas as string[])
        : typeof questao.alternativas === 'string'
          ? (() => { try { const parsed = JSON.parse(questao.alternativas); return Array.isArray(parsed) ? parsed : []; } catch { return []; } })()
          : [];
      return (
        <div className="space-y-2">
          {alternativas.length === 0 && <div className="text-xs text-muted-foreground">Sem alternativas disponíveis</div>}
          {alternativas.map((alt, idx) => (
            <label key={idx} className="flex items-center gap-2">
              <input
                type="radio"
                name={`alt-${questao.id}`}
                value={String(idx)}
                checked={String(ans.respostaUsuario ?? '') === String(idx)}
                onChange={(e) => setAns({ respostaUsuario: e.target.value })}
              />
              <span>{alt}</span>
            </label>
          ))}
        </div>
      );
    }

    if (questao.tipo === QuestionTipo.CertoErrado) {
      return (
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name={`ce-${questao.id}`}
              value="true"
              checked={String(ans.respostaUsuario ?? '') === 'true'}
              onChange={() => setAns({ respostaUsuario: 'true' })}
            />
            <span>Certo</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name={`ce-${questao.id}`}
              value="false"
              checked={String(ans.respostaUsuario ?? '') === 'false'}
              onChange={() => setAns({ respostaUsuario: 'false' })}
            />
            <span>Errado</span>
          </label>
        </div>
      );
    }

    if (questao.tipo === QuestionTipo.CompletarLacuna) {
      return (
        <input
          type="text"
          className="w-full rounded border px-3 py-2 text-sm"
          placeholder="Digite sua resposta"
          value={(ans.respostaUsuario ?? '') as string}
          onChange={(e) => setAns({ respostaUsuario: e.target.value })}
        />
      );
    }

    if (questao.tipo === QuestionTipo.Flashcard) {
      return (
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">Marque seu desempenho:</span>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name={`fc-${questao.id}`}
              value="true"
              checked={Boolean(ans.acertou) === true}
              onChange={() => setAns({ acertou: true })}
            />
            <span>Acertou</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name={`fc-${questao.id}`}
              value="false"
              checked={Boolean(ans.acertou) === false}
              onChange={() => setAns({ acertou: false })}
            />
            <span>Errou</span>
          </label>
        </div>
      );
    }

    return null;
  };

  const disciplinaById = useMemo(() => new Map((disciplinas ?? []).map(d => [d.id, d.nome])), [disciplinas]);
  const topicosById = useMemo(() => new Map((topicos ?? []).map(t => [t.id, t.nome])), [topicos]);

  const subTopicos = useMemo(() => {
    if (!topicos || filtersDraft.topicoId === 'all') return [];
    return topicos.filter(t => t.topicoPaiId === filtersDraft.topicoId);
  }, [topicos, filtersDraft.topicoId]);

  return (
    <>
      <PageHeader title="Resolução de Questões" description="Resolva questões em sequência sem precisar criar um simulado." />

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-sm font-medium">Disciplina</label>
              <select
                className="mt-1 w-full rounded border px-2 py-2 text-sm"
                value={filtersDraft.disciplinaId}
                onChange={(e) => setFiltersDraft(prev => ({ ...prev, disciplinaId: e.target.value as any, topicoId: 'all', subTopicoId: 'all' }))}
              >
                <option value="all">Todas</option>
                {(disciplinas ?? []).map(d => (
                  <option key={d.id} value={d.id}>{d.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Tópico</label>
              <select
                className="mt-1 w-full rounded border px-2 py-2 text-sm"
                value={filtersDraft.topicoId}
                onChange={(e) => setFiltersDraft(prev => ({ ...prev, topicoId: e.target.value as any, subTopicoId: 'all' }))}
              >
                <option value="all">Todos</option>
                {(topicos ?? []).filter(t => filtersDraft.disciplinaId === 'all' || t.disciplinaId === filtersDraft.disciplinaId).map(t => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Subtópico</label>
              <select
                className="mt-1 w-full rounded border px-2 py-2 text-sm"
                value={filtersDraft.subTopicoId}
                onChange={(e) => setFiltersDraft(prev => ({ ...prev, subTopicoId: e.target.value as any }))}
                disabled={filtersDraft.topicoId === 'all'}
              >
                <option value="all">Todos</option>
                {subTopicos.map(st => (
                  <option key={st.id} value={st.id}>{st.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Dificuldade</label>
              <select
                className="mt-1 w-full rounded border px-2 py-2 text-sm"
                value={filtersDraft.dificuldade}
                onChange={(e) => setFiltersDraft(prev => ({ ...prev, dificuldade: e.target.value as any }))}
              >
                <option value="todas">Todas</option>
                <option value="Fácil">Fácil</option>
                <option value="Médio">Médio</option>
                <option value="Difícil">Difícil</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Ordenação</label>
              <select
                className="mt-1 w-full rounded border px-2 py-2 text-sm"
                value={filtersDraft.orderBy}
                onChange={(e) => setFiltersDraft(prev => ({ ...prev, orderBy: e.target.value as any }))}
              >
                <option value="aleatoria">Aleatória</option>
                <option value="recentes">Últimas incluídas</option>
                <option value="antigas">Primeiras incluídas</option>
                <option value="topicos">Ordem de tópicos</option>
                <option value="disciplinas">Ordem de disciplinas</option>
              </select>
            </div>

            <div className="sm:col-span-2 lg:col-span-4">
              <label className="text-sm font-medium">Status</label>
              <select
                className="mt-1 w-full rounded border px-2 py-2 text-sm"
                value={filtersDraft.statusQuestoes}
                onChange={(e) => setFiltersDraft(prev => ({ ...prev, statusQuestoes: e.target.value as StatusQuestoesSimulado }))}
              >
                <option value="todas">Todas</option>
                <option value="nao_resolvidas">Não resolvidas</option>
                <option value="resolvidas">Resolvidas</option>
                <option value="erradas">Erradas</option>
                <option value="acertadas">Acertadas</option>
              </select>
            </div>

            <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
              <Button onClick={() => { setAppliedFilters(filtersDraft); refetchQuestoes(); }}>
                Filtrar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {loadingQuestoes && Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader><CardTitle><Skeleton className="h-6 w-1/2" /></CardTitle></CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}

        {!loadingQuestoes && questoesFiltradas.length === 0 && (
          <Card>
            <CardHeader><CardTitle>Nenhuma questão encontrada</CardTitle></CardHeader>
            <CardContent>
              Ajuste os filtros para encontrar questões.
            </CardContent>
          </Card>
        )}

        {questoesFiltradas.map((q) => (
          <Card key={q.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base sm:text-xl">{q.enunciado}</CardTitle>
                  {(() => {
                    const topicoObj = topicosByIdObj.get(q.topicoId);
                    const isSub = !!topicoObj?.topicoPaiId;
                    const topicoName = isSub ? topicosByIdObj.get(topicoObj!.topicoPaiId!)?.nome : topicoObj?.nome;
                    const subTopicoName = isSub ? topicoObj?.nome : undefined;
                    const disciplinaName = disciplinaById.get(q.disciplinaId) ?? "";
                    return (
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-medium">{disciplinaName}</span>
                        {topicoName && <span>• {topicoName}</span>}
                        {subTopicoName && <span>› {subTopicoName}</span>}
                      </div>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{q.dificuldade}</Badge>
                  {(() => {
                    const fb = feedbackByQuestao[q.id];
                    const last = lastRespostaByQuestao.get(q.id);
                    const lastAcertou = typeof fb?.acertou === 'boolean' ? fb.acertou : (last ? (last.acertou === true || last.acertou === 'true') : undefined);
                    if (lastAcertou === undefined) return null;
                    const text = lastAcertou ? 'acertei' : 'errei';
                    const cls = lastAcertou ? 'bg-green-600 text-white' : 'bg-red-600 text-white';
                    return <Badge className={cls} onClick={() => { setHistoryQuestaoId(q.id); setHistoryOpen(true); }} role="button">{text}</Badge>;
                  })()}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderRespostaInput(q)}
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Confiança</label>
                  <select
                    className="mt-1 w-full rounded border px-2 py-2 text-sm"
                    value={(answers[q.id]?.confianca ?? 'Dúvida') as RespostaConfianca}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: { ...(prev[q.id] ?? {}), confianca: e.target.value as RespostaConfianca } }))}
                  >
                    <option value="Certeza">Certeza</option>
                    <option value="Dúvida">Dúvida</option>
                    <option value="Chute">Chute</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => salvarResposta.mutate(q)}
                  disabled={salvarResposta.isLoading}
                >
                  Resolver
                </Button>
                </div>

              {feedbackByQuestao[q.id] && (
                <div className="mt-3 rounded border p-3 text-sm">
                  {feedbackByQuestao[q.id].acertou ? (
                    <p className="font-medium text-green-600">Acertou!</p>
                  ) : (
                    <p className="font-medium text-red-600">Errou.</p>
                  )}
                  {q.explicacao && (
                    <p className="mt-2 text-muted-foreground">{q.explicacao}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Histórico de respostas</DialogTitle>
            <DialogDescription>
              Evolução dos seus acertos nesta questão ao longo do tempo.
            </DialogDescription>
          </DialogHeader>
          <div className="mb-4">
            <SparklineChart data={historyChartData} dataKey="acerto" color="hsl(var(--primary))" />
          </div>
          <div className="space-y-2">
            {historyList.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem respostas registradas para esta questão.</p>
            ) : (
              historyList.map((r, i) => {
                const ok = r.acertou === true || r.acertou === 'true';
                const dateStr = r.respondedAt ? new Date(r.respondedAt).toLocaleString() : `Resposta ${i + 1}`;
                return (
                  <div key={i} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                    <span className={ok ? "text-green-600" : "text-red-600"}>{ok ? "acertei" : "errei"}</span>
                    <span className="text-muted-foreground">{dateStr}</span>
                  </div>
                )
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
