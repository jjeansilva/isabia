

import { v4 as uuidv4 } from 'uuid';
import { CollectionName, Disciplina, Questao, Simulado, SimuladoDificuldade, Topico, Revisao, QuestionTipo, QuestionDificuldade, CriterioSimulado, QuestionOrigem, SimuladoQuestao, ImportProgress, Resposta, PerformancePorCriterio, StatsDia, SimuladoStatus } from '@/types';
import PocketBase, { ListResult } from 'pocketbase';
import { SimuladoFormValues } from '@/components/forms/simulado-form';

// Helper to get/set data from localStorage
const getFromStorage = <T>(key: string): T[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(`isab_${key}`);
  return data ? JSON.parse(data) : [];
};

const saveToStorage = <T>(key: string, data: T[]): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`isab_${key}`, JSON.stringify(data));
};

export interface IDataSource {
  pb?: PocketBase;
  list<T>(collection: CollectionName, options?: any): Promise<T[]>;
  get<T>(collection: CollectionName, id: string): Promise<T | null>;
  create<T>(collection: CollectionName, data: Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'user'>): Promise<T>;
  update<T extends { id: string }>(collection: CollectionName, id: string, data: Partial<T>): Promise<T>;
  delete(collection: CollectionName, id: string): Promise<void>;
  bulkDelete(collection: CollectionName, ids: string[]): Promise<void>;
  bulkCreateFromCsv(csvData: string, tipo: QuestionTipo, origem: QuestionOrigem, onProgress: (progress: ImportProgress) => void): Promise<number>;
  gerarSimulado(formValues: SimuladoFormValues): Promise<Simulado>;
  getDashboardStats(): Promise<any>;
  getQuestoesParaRevisar(): Promise<Questao[]>;
  registrarRespostaRevisao(questaoId: string, performance: 'facil' | 'medio' | 'dificil'): Promise<void>;
}

class MockDataSource implements IDataSource {
  async list<T>(collection: CollectionName, options?: any): Promise<T[]> {
    let data = getFromStorage<T>(collection);
    if (options && options.filter) {
       // Super basic mock filter, needs improvement for complex queries
      const filterKey = options.filter.split('=')[0].trim();
      const filterValue = options.filter.split('=')[1].trim().replace(/"/g, '');
      data = data.filter(item => (item as any)[filterKey] === filterValue);
    }
    return Promise.resolve(data);
  }

  async get<T extends {id: string}>(collection: CollectionName, id: string): Promise<T | null> {
    const data = getFromStorage<T>(collection);
    const item = data.find(d => d.id === id) || null;
    return Promise.resolve(item);
  }

  async create<T>(collection: CollectionName, data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const allData = getFromStorage<any>(collection);
    const now = new Date().toISOString();
    const newItem = {
      ...data,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    } as T;
    allData.push(newItem);
    saveToStorage(collection, allData);
    return Promise.resolve(newItem);
  }

   async bulkDelete(collection: CollectionName, ids: string[]): Promise<void> {
    let data = getFromStorage<any>(collection);
    const filteredData = data.filter(item => !ids.includes(item.id));
    saveToStorage(collection, filteredData);
    return Promise.resolve();
  }

  async update<T extends { id: string }>(collection: CollectionName, id: string, data: Partial<T>): Promise<T> {
    const allData = getFromStorage<T>(collection);
    const index = allData.findIndex(d => d.id === id);
    if (index === -1) throw new Error("Item not found");
    
    const updatedItem = { ...allData[index], ...data, updatedAt: new Date().toISOString() };
    allData[index] = updatedItem;
    saveToStorage(collection, allData);
    return Promise.resolve(updatedItem);
  }

  async delete(collection: CollectionName, id: string): Promise<void> {
    let allData = getFromStorage<any>(collection);
    allData = allData.filter(d => d.id !== id);
    saveToStorage(collection, allData);
    return Promise.resolve();
  }
  
  async gerarSimulado(formValues: SimuladoFormValues): Promise<Simulado> {
      let allQuestoes = getFromStorage<Questao>('questoes');
      let combinedQuestoes: Questao[] = [];
      let totalQuestoesPedidas = 0;

      for(const criteria of formValues.criterios) {
        let filtered = allQuestoes.filter(q => q.isActive && q.disciplinaId === criteria.disciplinaId);
        
        if (criteria.topicoId && criteria.topicoId !== 'all') {
          filtered = filtered.filter(q => q.topicoId === criteria.topicoId);
        }

        if (criteria.dificuldade !== 'aleatorio') {
            filtered = filtered.filter(q => q.dificuldade === criteria.dificuldade);
        }

        const shuffled = filtered.sort(() => 0.5 - Math.random());
        const selectedQuestoes = shuffled.slice(0, criteria.quantidade);
        
        totalQuestoesPedidas += criteria.quantidade;
        combinedQuestoes.push(...selectedQuestoes);
      }
      
      if (combinedQuestoes.length < totalQuestoesPedidas) {
          throw new Error(`Não foram encontradas questões suficientes para todos os critérios. Encontradas: ${combinedQuestoes.length}, Pedidas: ${totalQuestoesPedidas}`);
      }

      const finalQuestoes = combinedQuestoes.sort(() => 0.5 - Math.random());


      const novoSimulado: Omit<Simulado, 'id' | 'createdAt' | 'updatedAt' | 'user'> = {
          nome: formValues.nome,
          criterios: formValues.criterios,
          status: 'Rascunho',
          criadoEm: new Date().toISOString(),
          questoes: finalQuestoes.map((q, index) => ({
              id: uuidv4(),
              simuladoId: '', // will be set after simulado is created
              questaoId: q.id,
              ordem: index + 1,
          })),
      };

      const createdSimulado = await this.create<Simulado>('simulados', novoSimulado as any);
      
      createdSimulado.questoes.forEach(q => (q as SimuladoQuestao).simuladoId = createdSimulado.id);
      
      return await this.update<Simulado>('simulados', createdSimulado.id, { questoes: createdSimulado.questoes });
  }

  async getDashboardStats(): Promise<any> {
    const simulados = await this.list<Simulado>('simulados');
    const respostas = await this.list<Resposta>('respostas');
    const questoes = await this.list<Questao>('questoes');
    const disciplinas = await this.list<Disciplina>('disciplinas');
    const topicos = await this.list<Topico>('topicos');
    const revisoes = await this.list<Revisao>('revisoes');

    const totalRespostas = respostas.length;
    const totalAcertos = respostas.filter(r => r.acertou).length;
    const acertoGeral = totalRespostas > 0 ? (totalAcertos / totalRespostas) * 100 : 0;
    const tempoMedioGeral = totalRespostas > 0 ? respostas.reduce((acc, r) => acc + r.tempoSegundos, 0) / totalRespostas : 0;

    const umMesAtras = new Date();
    umMesAtras.setDate(umMesAtras.getDate() - 30);
    const respostasUltimos30d = respostas.filter(r => new Date(r.respondedAt) >= umMesAtras);
    const acertosUltimos30d = respostasUltimos30d.filter(r => r.acertou).length;
    const acertoUltimos30dPercent = respostasUltimos30d.length > 0 ? (acertosUltimos30d / respostasUltimos30d.length) * 100 : 0;
    
    // Histórico de acertos para o gráfico
    const historicoAcertos = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        const dateString = date.toISOString().split('T')[0];
        const respostasDoDia = respostas.filter(r => r.respondedAt.startsWith(dateString));
        const acertosDoDia = respostasDoDia.filter(r => r.acertou).length;
        return {
            date: dateString,
            acerto: respostasDoDia.length > 0 ? (acertosDoDia / respostasDoDia.length) * 100 : 0,
        };
    });

    const questoesMap = new Map(questoes.map(q => [q.id, q]));
    
    const reducePerformance = (map: Map<string, { total: number; acertos: number }>, key: string, acertou: boolean) => {
        if (!map.has(key)) map.set(key, { total: 0, acertos: 0 });
        const current = map.get(key)!;
        current.total++;
        if (acertou) {
          current.acertos++;
        }
    };
    
    const desempenhoMap = new Map<string, { total: number; acertos: number }>();
    const dificuldadeMap = new Map<string, { total: number; acertos: number }>();
    const tipoMap = new Map<string, { total: number; acertos: number }>();

    for (const resposta of respostas) {
        const questao = questoesMap.get(resposta.questaoId);
        if (!questao) continue;

        reducePerformance(desempenhoMap, questao.disciplinaId, resposta.acertou);
        reducePerformance(dificuldadeMap, questao.dificuldade, resposta.acertou);
        reducePerformance(tipoMap, questao.tipo, resposta.acertou);
    }
    
    const formatPerformanceData = (map: Map<string, { total: number; acertos: number }>, nameMap: Map<string, string>): PerformancePorCriterio[] => {
        return Array.from(map.entries()).map(([id, data]) => ({
            nome: nameMap.get(id) || id,
            totalQuestoes: data.total,
            percentualAcerto: data.total > 0 ? (data.acertos / data.total) * 100 : 0,
        })).sort((a, b) => b.totalQuestoes - a.totalQuestoes);
    };

    const disciplinaNameMap = new Map(disciplinas.map(d => [d.id, d.nome]));
    const desempenhoPorDisciplina = formatPerformanceData(desempenhoMap, disciplinaNameMap);
    
    const desempenhoPorDificuldade = formatPerformanceData(dificuldadeMap, new Map(Object.values(QuestionDificuldade).map(d => [d, d])));
    const desempenhoPorTipo = formatPerformanceData(tipoMap, new Map(Object.values(QuestionTipo).map(t => [t,t])));
    
    const simuladoEmAndamento = simulados.find(s => s.status === 'Em andamento');
    const questoesParaRevisarHoje = revisoes.filter(r => new Date(r.proximaRevisao) <= new Date()).length;

    return Promise.resolve({
        totalRespostas,
        acertoGeral,
        tempoMedioGeral,
        acertoUltimos30d: acertoUltimos30dPercent,
        historicoAcertos,
        desempenhoPorDisciplina,
        desempenhoPorDificuldade,
        desempenhoPorTipo,
        simuladoEmAndamento,
        questoesParaRevisarHoje,
    });
  }


  async getQuestoesParaRevisar(): Promise<Questao[]> {
    const revisoes = getFromStorage<Revisao>('revisoes');
    const hoje = new Date();
    const revisoesHojeIds = revisoes
        .filter(r => new Date(r.proximaRevisao) <= hoje)
        .map(r => r.questaoId);

    const todasQuestoes = getFromStorage<Questao>('questoes');
    const questoesParaRevisar = todasQuestoes.filter(q => revisoesHojeIds.includes(q.id));
    
    return Promise.resolve(questoesParaRevisar);
  }

  async registrarRespostaRevisao(questaoId: string, performance: 'facil' | 'medio' | 'dificil'): Promise<void> {
    const revisoes = getFromStorage<Revisao>('revisoes');
    const questoes = getFromStorage<Questao>('questoes');
    const questao = questoes.find(q => q.id === questaoId);
    if(!questao) throw new Error("Questão não encontrada para registrar revisão.");
    
    let revisao = revisoes.find(r => r.questaoId === questaoId);
    const now = new Date();

    const intervalos = {
        facil: [1, 4, 10, 30], // dias
        medio: [1, 2, 5, 15],
        dificil: [0, 1, 2, 4],
    };

    if (revisao) {
      if (performance === 'dificil') {
        revisao.bucket = 0; // Resetar
      } else {
        revisao.bucket = Math.min(revisao.bucket + 1, intervalos[performance].length - 1);
      }
      const diasParaAdicionar = intervalos[performance][revisao.bucket];
      revisao.proximaRevisao = new Date(now.setDate(now.getDate() + diasParaAdicionar)).toISOString();
      const index = revisoes.findIndex(r => r.id === revisao!.id);
      revisoes[index] = revisao;
    } else {
      const bucket = performance === 'dificil' ? 0 : 1;
      const diasParaAdicionar = intervalos[performance][bucket];
      revisao = {
        id: uuidv4(),
        questaoId: questaoId,
        bucket: bucket,
        proximaRevisao: new Date(new Date().setDate(now.getDate() + diasParaAdicionar)).toISOString(),
      };
      revisoes.push(revisao as any);
    }
    
    saveToStorage('revisoes', revisoes);
    return Promise.resolve();
  }

  async bulkCreateFromCsv(csvData: string, tipo: QuestionTipo, origem: QuestionOrigem, onProgress: (progress: ImportProgress) => void): Promise<number> {
     const lines = csvData.split('\n').filter(line => line.trim() !== '');
    const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows = lines.slice(1);
    
    let createdCount = 0;
    const log: string[] = [];

    const getColumn = (row: string[], name: string) => {
        const index = header.indexOf(name);
        return index > -1 ? row[index]?.trim().replace(/"/g, '') : undefined;
    }

    onProgress({ message: 'Iniciando processamento...', current: 0, total: rows.length, log });
    
    const allDisciplinas = getFromStorage<Disciplina>('disciplinas');
    const allTopicos = getFromStorage<Topico>('topicos');
    const disciplinaMap = new Map(allDisciplinas.map(d => [d.nome.toLowerCase(), d.id]));
    const topicoMap = new Map(allTopicos.map(t => [`${t.disciplinaId}-${t.nome.toLowerCase()}`, t.id]));

    for (let i = 0; i < rows.length; i++) {
        const rowData = rows[i].split(',');
        const disciplinaNome = getColumn(rowData, 'disciplina');
        const topicoNome = getColumn(rowData, 'tópico da disciplina');
        const enunciado = getColumn(rowData, 'questão');

        try {
            if (!disciplinaNome || !topicoNome || !enunciado) {
                throw new Error(`Dados insuficientes na linha ${i + 2}. As colunas "disciplina", "tópico da disciplina" e "questão" são obrigatórias.`);
            }

            let disciplinaId = disciplinaMap.get(disciplinaNome.toLowerCase());
            if (!disciplinaId) {
                const newDisciplina = await this.create<Disciplina>('disciplinas', { nome: disciplinaNome });
                disciplinaId = newDisciplina.id;
                disciplinaMap.set(disciplinaNome.toLowerCase(), disciplinaId);
                log.push(`[Linha ${i + 2}] Nova disciplina criada: ${disciplinaNome}`);
            }

            let topicoId = topicoMap.get(`${disciplinaId}-${topicoNome.toLowerCase()}`);
            if (!topicoId) {
                const newTopico = await this.create<Topico>('topicos', { nome: topicoNome, disciplinaId });
                topicoId = newTopico.id;
                topicoMap.set(`${disciplinaId}-${topicoNome.toLowerCase()}`, topicoId);
                 log.push(`[Linha ${i + 2}] Novo tópico criado: ${topicoNome}`);
            }
            
            const subtópicoNome = getColumn(rowData, 'subtópico');
            if (subtópicoNome) {
                let subtópicoId = topicoMap.get(`${disciplinaId}-${subtópicoNome.toLowerCase()}`);
                 if (!subtópicoId) {
                    const newSubTopico = await this.create<Topico>('topicos', { nome: subtópicoNome, disciplinaId, topicoPaiId: topicoId });
                    subtópicoId = newSubTopico.id;
                    topicoMap.set(`${disciplinaId}-${subtópicoNome.toLowerCase()}`, subtópicoId);
                    log.push(`[Linha ${i + 2}] Novo subtópico criado: ${subtópicoNome}`);
                 }
                 topicoId = subtópicoId;
            }

            const questao: Partial<Questao> = {
                disciplinaId,
                topicoId,
                tipo,
                origem,
                enunciado,
                dificuldade: getColumn(rowData, 'dificuldade') as QuestionDificuldade || 'Fácil',
                respostaCorreta: JSON.stringify(getColumn(rowData, 'resposta')),
                explicacao: getColumn(rowData, 'explicação') || '',
                alternativas: JSON.stringify(header.filter(h => h.startsWith('alternativa_')).map(h => getColumn(rowData, h)).filter(Boolean)),
                isActive: true,
                version: 1,
                hashConteudo: 'csv_import_' + uuidv4(),
            };
            
            await this.create<Questao>('questoes', questao as any);
            createdCount++;
            onProgress({ message: `Processando linha ${i + 1}...`, current: i + 1, total: rows.length, log });
        } catch (error: any) {
            let errorMessage = `Erro na linha ${i + 2}: ${error.message}`;
            if (error.data?.data) {
                const fieldErrors = Object.entries(error.data.data).map(([field, err]: [string, any]) => `${field}: ${err.message}`).join(', ');
                errorMessage = `Erro na linha ${i + 2}. Detalhes: ${fieldErrors}`;
            }
            log.push(`[Linha ${i + 2}] ERRO: ${errorMessage}`);
            onProgress({ message: errorMessage, current: i + 1, total: rows.length, log, isError: true });
            throw new Error(errorMessage); // Stop the process
        }
    }
    
    return createdCount;
  }
}

class PocketBaseDataSource implements IDataSource {
  public pb: PocketBase;
  
  constructor(pocketbaseInstance: PocketBase) {
    this.pb = pocketbaseInstance;
    this.pb.authStore.loadFromCookie(this.pb.authStore.exportToCookie());
    
    this.pb.beforeSend = (url, options) => {
        if (options.method === 'GET') {
            delete (options.headers as any)['Content-Type'];
        }
        return { url, options };
    };
  }
  
  private addUserData(data: any): any {
    if (this.pb.authStore.model) {
      return {
        ...data,
        user: this.pb.authStore.model.id,
      };
    }
    return data;
  }

  async list<T>(collection: CollectionName, options?: any): Promise<T[]> {
    const records = await this.pb.collection(collection).getFullList<T>(options);
    return records;
  }

  async get<T>(collection: CollectionName, id: string): Promise<T | null> {
    try {
        const record = await this.pb.collection(collection).getOne<T>(id);
        return record;
    } catch(e) {
        if (e instanceof Error && (e as any).status === 404) return null;
        throw e;
    }
  }

  async create<T>(collection: CollectionName, data: Omit<T, "id" | "createdAt" | "updatedAt" | "user">): Promise<T> {
    const dataWithUser = this.addUserData(data);
    const record = await this.pb.collection(collection).create<T>(dataWithUser);
    return record;
  }

   async bulkDelete(collection: CollectionName, ids: string[]): Promise<void> {
    const promises = ids.map(id => this.delete(collection, id));
    await Promise.all(promises);
  }
  
  async update<T extends { id: string; }>(collection: CollectionName, id: string, data: Partial<T>): Promise<T> {
    const record = await this.pb.collection(collection).update<T>(id, data);
    return record;
  }
  
  async delete(collection: CollectionName, id: string): Promise<void> {
    await this.pb.collection(collection).delete(id);
  }

  async gerarSimulado(formValues: SimuladoFormValues): Promise<Simulado> {
      let combinedQuestoes: Questao[] = [];
      const userFilter = `user = "${this.pb.authStore.model?.id}"`;
      
      const allRespostas = await this.list<Resposta>('respostas', { filter: userFilter, fields: 'id,questaoId,acertou' });
      const respostasMap = new Map<string, boolean>();
      allRespostas.forEach(r => {
        // We only care about the last result for a question, so we can just overwrite.
        // For more complex logic (e.g. "ever correct", "ever wrong"), this needs adjustment.
        respostasMap.set(r.questaoId, r.acertou);
      });
      const resolvidasIds = new Set(respostasMap.keys());
      const acertadasIds = new Set(allRespostas.filter(r => r.acertou).map(r => r.questaoId));
      const erradasIds = new Set(allRespostas.filter(r => !r.acertou).map(r => r.questaoId));

      for(const criteria of formValues.criterios) {
        let filterParts: string[] = [];
        filterParts.push(`isActive=true`);
        filterParts.push(`disciplinaId="${criteria.disciplinaId}"`);
        filterParts.push(userFilter);
        
        if (criteria.topicoId && criteria.topicoId !== 'all') {
          filterParts.push(`topicoId="${criteria.topicoId}"`);
        }

        if (criteria.dificuldade !== 'aleatorio') {
          filterParts.push(`dificuldade="${criteria.dificuldade}"`);
        }
        
        const filterString = filterParts.join(" && ");
        let availableQuestoes = await this.list<Questao>('questoes', { filter: filterString });

        // Apply performance filter
        switch(criteria.statusQuestoes) {
            case 'nao_resolvidas':
                availableQuestoes = availableQuestoes.filter(q => !resolvidasIds.has(q.id));
                break;
            case 'resolvidas':
                availableQuestoes = availableQuestoes.filter(q => resolvidasIds.has(q.id));
                break;
            case 'acertadas':
                availableQuestoes = availableQuestoes.filter(q => acertadasIds.has(q.id));
                break;
            case 'erradas':
                 availableQuestoes = availableQuestoes.filter(q => erradasIds.has(q.id));
                break;
            case 'todas':
            default:
                // No additional filtering needed
                break;
        }

        const shuffled = availableQuestoes.sort(() => 0.5 - Math.random());
        const selectedQuestoes = shuffled.slice(0, criteria.quantidade);
        
        if (selectedQuestoes.length < criteria.quantidade) {
            const disciplina = await this.get<Disciplina>('disciplinas', criteria.disciplinaId);
            throw new Error(`Questões insuficientes para a disciplina ${disciplina?.nome} com os filtros aplicados. Pedidas: ${criteria.quantidade}, Encontradas: ${selectedQuestoes.length}.`);
        }

        combinedQuestoes.push(...selectedQuestoes);
      }

      const finalQuestoes = combinedQuestoes.sort(() => 0.5 - Math.random());

      const questoesParaSalvar: SimuladoQuestao[] = finalQuestoes.map((q, index) => ({
        id: uuidv4(),
        simuladoId: '', 
        questaoId: q.id,
        ordem: index + 1,
      }));

      const novoSimulado = {
          nome: formValues.nome,
          criterios: JSON.stringify(formValues.criterios),
          status: 'Rascunho' as SimuladoStatus,
          criadoEm: new Date().toISOString(),
          questoes: JSON.stringify(questoesParaSalvar),
      };

      const createdSimulado = await this.create<Simulado>('simulados', novoSimulado as any);
      
      const updatedQuestoes: SimuladoQuestao[] = (JSON.parse(createdSimulado.questoes as any) as any[]).map(q => ({...q, simuladoId: createdSimulado.id }));
      
      return await this.update<Simulado>('simulados', createdSimulado.id, { questoes: JSON.stringify(updatedQuestoes) as any });
  }

  async getDashboardStats(): Promise<any> {
    if (!this.pb.authStore.model?.id) {
        return {
            totalRespostas: 0,
            acertoGeral: 0,
            tempoMedioGeral: 0,
            acertoUltimos30d: 0,
            historicoAcertos: [],
            desempenhoPorDisciplina: [],
            desempenhoPorDificuldade: [],
            desempenhoPorTipo: [],
            simuladoEmAndamento: null,
            questoesParaRevisarHoje: 0,
        };
    }
    const userId = this.pb.authStore.model.id;
    const userFilter = `user = "${userId}"`;

    try {
        const hoje = new Date().toISOString().split('T')[0];
        const revisoesFilter = `proximaRevisao <= "${hoje}" && ${userFilter}`;

        const [respostas, disciplinas, questoes, revisoes, allSimulados] = await Promise.all([
            this.list<Resposta>('respostas', { filter: userFilter }),
            this.list<Disciplina>('disciplinas', { filter: userFilter }),
            this.list<Questao>('questoes', { filter: userFilter, fields: 'id,disciplinaId,dificuldade,tipo' }),
            this.list<Revisao>('revisoes', { filter: revisoesFilter }),
            this.list<Simulado>('simulados', { filter: userFilter }), // Removed sort
        ]);
        
        // Client-side sorting
        const simulados = allSimulados.sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());

        const totalRespostas = respostas.length;
        const totalAcertos = respostas.filter(r => r.acertou).length;
        const acertoGeral = totalRespostas > 0 ? (totalAcertos / totalRespostas) * 100 : 0;
        const tempoTotal = respostas.reduce((acc, r) => acc + r.tempoSegundos, 0);
        const tempoMedioGeral = totalRespostas > 0 ? tempoTotal / totalRespostas : 0;

        const umMesAtras = new Date();
        umMesAtras.setDate(umMesAtras.getDate() - 30);
        const respostasUltimos30d = respostas.filter(r => new Date(r.respondedAt) >= umMesAtras);
        const acertosUltimos30d = respostasUltimos30d.filter(r => r.acertou).length;
        const acertoUltimos30dPercent = respostasUltimos30d.length > 0 ? (acertosUltimos30d / respostasUltimos30d.length) * 100 : 0;

        const historicoAcertos = Array.from({ length: 30 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (29 - i));
            const dateString = date.toISOString().split('T')[0];
            const respostasDoDia = respostas.filter(r => r.respondedAt.startsWith(dateString));
            const acertosDoDia = respostasDoDia.filter(r => r.acertou).length;
            return {
                date: dateString,
                acerto: respostasDoDia.length > 0 ? (acertosDoDia / respostasDoDia.length) * 100 : 0,
            };
        });
        
        const disciplinaNameMap = new Map(disciplinas.map(d => [d.id, d.nome]));
        const questoesMap = new Map(questoes.map(q => [q.id, q]));

        const desempenhoMap = new Map<string, { total: number; acertos: number }>();
        const dificuldadeMap = new Map<string, { total: number; acertos: number }>();
        const tipoMap = new Map<string, { total: number; acertos: number }>();

        const updateMap = (map: Map<string, { total: number; acertos: number }>, key: string, acertou: boolean) => {
            if (!key) return;
            const current = map.get(key) || { total: 0, acertos: 0 };
            current.total++;
            if (acertou) current.acertos++;
            map.set(key, current);
        };

        for (const resposta of respostas) {
            const questao = questoesMap.get(resposta.questaoId);
            if (!questao) continue;
            
            const disciplinaNome = disciplinaNameMap.get(questao.disciplinaId);
            if (disciplinaNome) {
                updateMap(desempenhoMap, disciplinaNome, resposta.acertou);
            }
            updateMap(dificuldadeMap, questao.dificuldade, resposta.acertou);
            updateMap(tipoMap, questao.tipo, resposta.acertou);
        }
        
        const formatPerformanceData = (map: Map<string, { total: number; acertos: number }>): PerformancePorCriterio[] => {
            return Array.from(map.entries()).map(([nome, data]) => ({
                nome,
                totalQuestoes: data.total,
                percentualAcerto: data.total > 0 ? (data.acertos / data.total) * 100 : 0,
            })).sort((a, b) => b.totalQuestoes - a.totalQuestoes);
        };
    
        const desempenhoPorDisciplina = formatPerformanceData(desempenhoMap);
        const desempenhoPorDificuldade = formatPerformanceData(dificuldadeMap);
        const desempenhoPorTipo = formatPerformanceData(tipoMap);

        const questoesParaRevisarHoje = revisoes.length;
        
        const simuladoEmAndamento = simulados.find(s => s.status === 'Em andamento');

        return {
            totalRespostas,
            acertoGeral,
            tempoMedioGeral,
            acertoUltimos30d: acertoUltimos30dPercent,
            historicoAcertos,
            desempenhoPorDisciplina,
            desempenhoPorDificuldade,
            desempenhoPorTipo,
            simuladoEmAndamento,
            questoesParaRevisarHoje,
        };

    } catch (error) {
        console.error("Failed to get dashboard stats:", error);
        // Retornar um objeto de fallback para evitar que a UI quebre
        return {
            totalRespostas: 0, acertoGeral: 0, tempoMedioGeral: 0, acertoUltimos30d: 0, historicoAcertos: [],
            desempenhoPorDisciplina: [], desempenhoPorDificuldade: [], desempenhoPorTipo: [],
            simuladoEmAndamento: null, questoesParaRevisarHoje: 0
        };
    }
}

  async getQuestoesParaRevisar(): Promise<Questao[]> {
    if (!this.pb.authStore.model?.id) return [];
    const userFilter = `user = "${this.pb.authStore.model.id}"`;
    const hoje = new Date().toISOString().split('T')[0];
    const revisoesFilter = `proximaRevisao <= "${hoje}" && ${userFilter}`;

    const revisoesHoje = await this.list<Revisao>('revisoes',{ filter: revisoesFilter });
    const revisoesHojeIds = revisoesHoje.map(r => r.questaoId);

    if (revisoesHojeIds.length === 0) return [];
    
    const idFilter = revisoesHojeIds.map(id => `id="${id}"`).join(" || ");
    const questoesResult = await this.list<Questao>('questoes', { filter: `(${idFilter}) && ${userFilter}` });
    
    return questoesResult;
  }

  async registrarRespostaRevisao(questaoId: string, performance: 'facil' | 'medio' | 'dificil'): Promise<void> {
    if (!this.pb.authStore.model?.id) return;
    let revisao: Revisao | undefined;
    const userFilter = `user = "${this.pb.authStore.model.id}"`;

    try {
        const results = await this.list<Revisao>('revisoes', { filter: `questaoId="${questaoId}" && ${userFilter}` });
        revisao = results[0];
    } catch (e) {
        // Not found, will create new one
    }

    const now = new Date();
    const intervalos = {
        facil: [1, 4, 10, 30], // dias
        medio: [1, 2, 5, 15],
        dificil: [0, 1, 2, 4],
    };

    if (revisao) {
      if (performance === 'dificil') {
        revisao.bucket = 0; // Resetar
      } else {
        revisao.bucket = Math.min(revisao.bucket + 1, intervalos[performance].length - 1);
      }
      const diasParaAdicionar = intervalos[performance][revisao.bucket];
      revisao.proximaRevisao = new Date(new Date().setDate(now.getDate() + diasParaAdicionar)).toISOString();
      await this.update('revisoes', revisao.id, { bucket: revisao.bucket, proximaRevisao: revisao.proximaRevisao });
    } else {
      const bucket = performance === 'dificil' ? 0 : 1;
      const diasParaAdicionar = intervalos[performance][bucket];
      const novaRevisao: Omit<Revisao, 'id' | 'createdAt' | 'updatedAt' | 'user'> = {
        questaoId: questaoId,
        bucket: bucket,
        proximaRevisao: new Date(new Date().setDate(now.getDate() + diasParaAdicionar)).toISOString(),
      };
      await this.create('revisoes', novaRevisao as any);
    }
  }

  async bulkCreateFromCsv(csvData: string, tipo: QuestionTipo, origem: QuestionOrigem, onProgress: (progress: ImportProgress) => void): Promise<number> {
    const lines = csvData.split('\n').filter(line => line.trim() !== '');
    const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows = lines.slice(1);
    
    let createdCount = 0;
    const log: string[] = [];

    const getColumn = (row: string[], name: string) => {
        const index = header.indexOf(name);
        return index > -1 ? row[index]?.trim().replace(/"/g, '') : undefined;
    }

    onProgress({ message: 'Iniciando processamento...', current: 0, total: rows.length, log });
    
    const allDisciplinas = await this.list<Disciplina>('disciplinas');
    const allTopicos = await this.list<Topico>('topicos');
    const disciplinaMap = new Map(allDisciplinas.map(d => [d.nome.toLowerCase(), d.id]));
    const topicoMap = new Map(allTopicos.map(t => [`${t.disciplinaId}-${t.nome.toLowerCase()}`, t.id]));

    const creationPromises: Promise<any>[] = [];

    for (let i = 0; i < rows.length; i++) {
        const rowData = rows[i].split(',');
        
        const createRow = async () => {
            const disciplinaNome = getColumn(rowData, 'disciplina');
            const topicoNome = getColumn(rowData, 'tópico da disciplina');
            const enunciado = getColumn(rowData, 'questão');

            if (!disciplinaNome || !topicoNome || !enunciado) {
                throw new Error(`Dados insuficientes na linha ${i + 2}. As colunas "disciplina", "tópico da disciplina" e "questão" são obrigatórias.`);
            }

            let disciplinaId = disciplinaMap.get(disciplinaNome.toLowerCase());
            if (!disciplinaId) {
                const newDisciplina = await this.create<Disciplina>('disciplinas', { nome: disciplinaNome });
                disciplinaId = newDisciplina.id;
                disciplinaMap.set(disciplinaNome.toLowerCase(), disciplinaId);
                log.push(`[Linha ${i + 2}] Nova disciplina criada: ${disciplinaNome}`);
            }

            let topicoId = topicoMap.get(`${disciplinaId}-${topicoNome.toLowerCase()}`);
            if (!topicoId) {
                const newTopico = await this.create<Topico>('topicos', { nome: topicoNome, disciplinaId });
                topicoId = newTopico.id;
                topicoMap.set(`${disciplinaId}-${topicoNome.toLowerCase()}`, topicoId);
                 log.push(`[Linha ${i + 2}] Novo tópico criado: ${topicoNome}`);
            }
            
            const subtópicoNome = getColumn(rowData, 'subtópico');
            if (subtópicoNome) {
                let subtópicoId = topicoMap.get(`${disciplinaId}-${subtópicoNome.toLowerCase()}`);
                 if (!subtópicoId) {
                    const newSubTopico = await this.create<Topico>('topicos', { nome: subtópicoNome, disciplinaId, topicoPaiId: topicoId });
                    subtópicoId = newSubTopico.id;
                    topicoMap.set(`${disciplinaId}-${subtópicoNome.toLowerCase()}`, subtópicoId);
                    log.push(`[Linha ${i + 2}] Novo subtópico criado: ${subtópicoNome}`);
                 }
                 topicoId = subtópicoId;
            }

            const questao: Partial<Questao> = {
                disciplinaId,
                topicoId,
                tipo,
                origem,
                enunciado,
                dificuldade: getColumn(rowData, 'dificuldade') as QuestionDificuldade || 'Fácil',
                respostaCorreta: JSON.stringify(getColumn(rowData, 'resposta')),
                explicacao: getColumn(rowData, 'explicação') || '',
                alternativas: JSON.stringify(header.filter(h => h.startsWith('alternativa_')).map(h => getColumn(rowData, h)).filter(Boolean)),
                isActive: true,
                version: 1,
                hashConteudo: 'csv_import_' + uuidv4(),
            };
            
            await this.create<Questao>('questoes', questao as any);
        };

        try {
            await createRow();
            createdCount++;
            onProgress({ message: `Processando linha ${i + 1}...`, current: i + 1, total: rows.length, log });
        } catch (error: any) {
             let errorMessage = `Erro na linha ${i + 2}: ${error.message}`;
             if (error?.data?.data) {
                const fieldErrors = Object.entries(error.data.data).map(([field, err]: [string, any]) => `${field}: ${err.message}`).join(', ');
                errorMessage = `Erro na linha ${i + 2}. Detalhes: ${fieldErrors}`;
            }
            log.push(`[Linha ${i + 2}] ERRO: ${errorMessage}`);
            onProgress({ message: errorMessage, current: i + 1, total: rows.length, log, isError: true });
            throw new Error(errorMessage); // Stop the process
        }
    }
    
    return createdCount;
  }
}

export { PocketBaseDataSource, MockDataSource };
