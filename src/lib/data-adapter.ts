

import { v4 as uuidv4 } from 'uuid';
import { CollectionName, Disciplina, Questao, Simulado, SimuladoDificuldade, Topico, Revisao, QuestionTipo, QuestionDificuldade, CriterioSimulado, QuestionOrigem, SimuladoQuestao, ImportProgress, Resposta, PerformancePorCriterio } from '@/types';
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
  bulkCreate<T>(collection: CollectionName, data: Partial<T>[]): Promise<T[]>;
  bulkDelete(collection: CollectionName, ids: string[]): Promise<void>;
  bulkCreateFromCsv?(csvData: string, tipo: QuestionTipo, origem: QuestionOrigem, onProgress: (progress: ImportProgress) => void): Promise<number>;
  update<T extends { id: string }>(collection: CollectionName, id: string, data: Partial<T>): Promise<T>;
  delete(collection: CollectionName, id: string): Promise<void>;
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

  async bulkCreate<T>(collection: CollectionName, data: Partial<T>[]): Promise<T[]> {
    const allData = getFromStorage<any>(collection);
    const now = new Date().toISOString();
    const newItems = data.map(item => ({
        ...item,
        id: uuidv4(),
        createdAt: now,
        updatedAt: now,
    }));
    const updatedData = [...allData, ...newItems];
    saveToStorage(collection, updatedData);
    return Promise.resolve(newItems as T[]);
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
      
      createdSimulado.questoes.forEach(q => q.simuladoId = createdSimulado.id);
      
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
    
    const reducePerformance = (map: Map<string, { total: number; acertos: number }>, key: string) => {
        if (!map.has(key)) map.set(key, { total: 0, acertos: 0 });
        const current = map.get(key)!;
        current.total++;
        return current;
    };
    
    const desempenhoMap = new Map<string, { total: number; acertos: number }>();
    const dificuldadeMap = new Map<string, { total: number; acertos: number }>();
    const tipoMap = new Map<string, { total: number; acertos: number }>();

    for (const resposta of respostas) {
        const questao = questoesMap.get(resposta.questaoId);
        if (!questao) continue;

        const discPerf = reducePerformance(desempenhoMap, questao.disciplinaId);
        if (resposta.acertou) discPerf.acertos++;

        const difPerf = reducePerformance(dificuldadeMap, questao.dificuldade);
        if (resposta.acertou) difPerf.acertos++;

        const tipoPerf = reducePerformance(tipoMap, questao.tipo);
        if (resposta.acertou) tipoPerf.acertos++;
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
}

class PocketBaseDataSource implements IDataSource {
  public pb: PocketBase;
  
  constructor(pocketbaseInstance: PocketBase) {
    this.pb = pocketbaseInstance;
    this.pb.authStore.loadFromCookie(this.pb.authStore.exportToCookie());
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

  async bulkCreate<T>(collection: CollectionName, data: Partial<T>[]): Promise<T[]> {
      const results: T[] = [];
      for(const item of data) {
          const result = await this.create<T>(collection, item as any);
          results.push(result);
          await new Promise(resolve => setTimeout(resolve, 50)); 
      }
      return results;
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


      for(const criteria of formValues.criterios) {
        const filterParts: string[] = [];
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
        const availableQuestoes = await this.list<Questao>('questoes', { filter: filterString });

        const shuffled = availableQuestoes.sort(() => 0.5 - Math.random());
        const selectedQuestoes = shuffled.slice(0, criteria.quantidade);
        
        if (selectedQuestoes.length < criteria.quantidade) {
            const disciplina = await this.get<Disciplina>('disciplinas', criteria.disciplinaId);
            throw new Error(`Questões insuficientes para a disciplina ${disciplina?.nome}. Pedidas: ${criteria.quantidade}, Encontradas: ${selectedQuestoes.length}.`);
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
          status: 'Rascunho',
          criadoEm: new Date().toISOString(),
          questoes: JSON.stringify(questoesParaSalvar),
      };

      const createdSimulado = await this.create<Simulado>('simulados', novoSimulado as any);
      
      const updatedQuestoes: SimuladoQuestao[] = (JSON.parse(createdSimulado.questoes as any) as any[]).map(q => ({...q, simuladoId: createdSimulado.id }));
      
      return await this.update<Simulado>('simulados', createdSimulado.id, { questoes: JSON.stringify(updatedQuestoes) as any });
  }

  async getDashboardStats(): Promise<any> {
    const userFilter = `user = "${this.pb.authStore.model?.id}"`;

    const [simulados, respostas, questoes, disciplinas, revisoes] = await Promise.all([
        this.list<Simulado>('simulados', { filter: userFilter }),
        this.list<Resposta>('respostas', { filter: userFilter, expand: 'questaoId' }),
        this.list<Questao>('questoes', { filter: userFilter }),
        this.list<Disciplina>('disciplinas', { filter: userFilter }),
        this.list<Revisao>('revisoes', { filter: userFilter })
    ]);
    
    const totalRespostas = respostas.length;
    const totalAcertos = respostas.filter(r => r.acertou).length;
    const acertoGeral = totalRespostas > 0 ? (totalAcertos / totalRespostas) * 100 : 0;
    const tempoMedioGeral = totalRespostas > 0 ? respostas.reduce((acc, r) => acc + r.tempoSegundos, 0) / totalRespostas : 0;
    
    // --- Performance (last 30d) ---
    const umMesAtras = new Date();
    umMesAtras.setDate(umMesAtras.getDate() - 30);
    const respostasUltimos30d = respostas.filter(r => new Date(r.respondedAt) >= umMesAtras);
    const acertosUltimos30d = respostasUltimos30d.filter(r => r.acertou).length;
    const acertoUltimos30dPercent = respostasUltimos30d.length > 0 ? (acertosUltimos30d / respostasUltimos30d.length) * 100 : 0;

    // --- Chart data (last 30d) ---
    const historicoAcertos = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        const dateString = date.toISOString().split('T')[0];
        const respostasDoDia = respostas.filter(r => new Date(r.respondedAt).toISOString().startsWith(dateString));
        const acertosDoDia = respostasDoDia.filter(r => r.acertou).length;
        return {
            date: dateString,
            acerto: respostasDoDia.length > 0 ? (acertosDoDia / respostasDoDia.length) * 100 : 0,
        };
    });

    const questoesMap = new Map(questoes.map(q => [q.id, q]));

    // --- Performance by criteria ---
    const reducePerformance = (map: Map<string, { total: number; acertos: number }>, key: string) => {
        if (!map.has(key)) map.set(key, { total: 0, acertos: 0 });
        const current = map.get(key)!;
        current.total++;
        return current;
    };

    const desempenhoMap = new Map<string, { total: number; acertos: number }>();
    const dificuldadeMap = new Map<string, { total: number; acertos: number }>();
    const tipoMap = new Map<string, { total: number; acertos: number }>();
    
    for (const resposta of respostas) {
        // @ts-ignore
        const questao = resposta.expand?.questaoId as Questao | undefined;
        if (!questao) continue;

        const discPerf = reducePerformance(desempenhoMap, questao.disciplinaId);
        if (resposta.acertou) discPerf.acertos++;

        const difPerf = reducePerformance(dificuldadeMap, questao.dificuldade);
        if (resposta.acertou) difPerf.acertos++;

        const tipoPerf = reducePerformance(tipoMap, questao.tipo);
        if (resposta.acertou) tipoPerf.acertos++;
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
    
    const desempenhoPorDificuldade: PerformancePorCriterio[] = ['Fácil', 'Médio', 'Difícil'].map(d => {
        const data = dificuldadeMap.get(d) || { total: 0, acertos: 0 };
        return {
            nome: d,
            totalQuestoes: data.total,
            percentualAcerto: data.total > 0 ? (data.acertos / data.total) * 100 : 0,
        }
    });

    const desempenhoPorTipo: PerformancePorCriterio[] = ['Múltipla Escolha', 'Certo ou Errado', 'Completar Lacuna', 'Flashcard'].map(t => {
        const data = tipoMap.get(t) || { total: 0, acertos: 0 };
        return {
            nome: t,
            totalQuestoes: data.total,
            percentualAcerto: data.total > 0 ? (data.acertos / data.total) * 100 : 0,
        }
    });

    // --- Other stats ---
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
    const hoje = new Date().toISOString().split('T')[0];
    const userFilter = `user = "${this.pb.authStore.model?.id}"`;
    const revisoesHoje = await this.list<Revisao>('revisoes',{
        filter: `proximaRevisao <= "${hoje}" && ${userFilter}`
    });
    const revisoesHojeIds = revisoesHoje.map(r => r.questaoId);

    if (revisoesHojeIds.length === 0) return [];
    
    const idFilter = revisoesHojeIds.map(id => `id="${id}"`).join(" || ");
    const questoesResult = await this.list<Questao>('questoes', { filter: `(${idFilter}) && ${userFilter}` });
    
    return questoesResult;
  }

  async registrarRespostaRevisao(questaoId: string, performance: 'facil' | 'medio' | 'dificil'): Promise<void> {
    let revisao: Revisao | undefined;
    const userFilter = `user = "${this.pb.authStore.model?.id}"`;

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
    if (!this.pb.authStore.model?.id) throw new Error("Usuário não autenticado.");
    const userId = this.pb.authStore.model.id;

    const lines = csvData.trim().split('\n');
    const headerLine = lines.shift()?.trim().replace(/"/g, '');
    
    if (!headerLine) {
        throw new Error("CSV está vazio ou não contém um cabeçalho.");
    }

    const header = headerLine.split(',');
    
    const colMap: {[key: string]: number} = {};
    header.forEach((h, i) => colMap[h.trim()] = i);

    const requiredCols = ['dificuldade', 'disciplina', 'tópico da disciplina', 'questão', 'resposta'];
    for(const col of requiredCols) {
        if(!(col in colMap)) {
            throw new Error(`Coluna obrigatória ausente no cabeçalho do CSV: "${col}"`);
        }
    }
    
    const disciplinasCache: Record<string, Disciplina> = {};
    const topicosCache: Record<string, Topico> = {};

    const questoesToCreate: Partial<Questao>[] = [];
    const log: string[] = [];

    let currentLine = 0;
    const totalLines = lines.length;

    const getOrCreate = async <T extends {id: string, nome: string}>(
        collection: CollectionName, 
        cache: Record<string, T>, 
        filter: string, 
        data: any, 
        logMessage: string
    ): Promise<T> => {
        const cacheKey = JSON.stringify(filter);
        if (cache[cacheKey]) {
            return cache[cacheKey];
        }

        log.push(`Verificando ${logMessage}: "${data.nome}"...`);
        try {
            const results = await this.list<T>(collection, { filter });
            if (results && results.length > 0) {
                cache[cacheKey] = results[0];
                return results[0];
            }
        } catch (e) { /* ignore */ }

        log.push(`-> Não encontrado(a). Criando ${logMessage}: "${data.nome}"...`);
        const created = await this.create<T>(collection, data);
        log.push(`-> ${logMessage} "${data.nome}" criado(a) com sucesso.`);
        cache[cacheKey] = created;
        return created;
    };


    for (const line of lines) {
        currentLine++;
        if (!line.trim()) continue;
        
        onProgress({ message: `Processando linha ${currentLine} de ${totalLines}...`, current: currentLine, total: totalLines, log });

        const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/"/g, '').trim()) || [];
        
        // --- Disciplina ---
        const disciplinaNome = values[colMap.disciplina];
        if (!disciplinaNome) continue;
        const disciplinaFilter = `nome="${disciplinaNome}" && user = "${userId}"`;
        const disciplina = await getOrCreate<Disciplina>('disciplinas', disciplinasCache, disciplinaFilter, { nome: disciplinaNome }, 'disciplina');
        
        // --- Tópico Pai ---
        const topicoPaiNome = values[colMap['tópico da disciplina']];
        if (!topicoPaiNome) continue;
        const topicoPaiFilter = `nome = "${topicoPaiNome}" && disciplinaId = "${disciplina.id}" && (topicoPaiId = "" || topicoPaiId = null) && user = "${userId}"`;
        const topicoPai = await getOrCreate<Topico>('topicos', topicosCache, topicoPaiFilter, { nome: topicoPaiNome, disciplinaId: disciplina.id }, 'tópico pai');

        let topicoFinal = topicoPai;
        
        // --- Subtópico ---
        const subtopicoNome = values[colMap.subtópico];
        if (subtopicoNome && subtopicoNome.toLowerCase() !== 'n/a' && subtopicoNome !== '') {
             const subtopicoFilter = `nome = "${subtopicoNome}" && disciplinaId = "${disciplina.id}" && topicoPaiId = "${topicoPai.id}" && user = "${userId}"`;
             const subtopico = await getOrCreate<Topico>('topicos', topicosCache, subtopicoFilter, { nome: subtopicoNome, disciplinaId: disciplina.id, topicoPaiId: topicoPai.id }, 'subtópico');
             topicoFinal = subtopico;
        }

        log.push(`Montando questão da linha ${currentLine}...`);
        onProgress({ message: `Montando questão da linha ${currentLine}...`, current: currentLine, total: totalLines, log });


        let respostaCorreta: any = values[colMap.resposta];
        let alternativas: any;
        let dificuldade = values[colMap.dificuldade] as QuestionDificuldade;

        if (dificuldade && dificuldade.toString().toLowerCase() === 'média') {
            dificuldade = 'Médio';
        }

        if (tipo === 'Múltipla Escolha') {
             const resp = values[colMap.resposta];
             const outrasAlternativas = header.filter(h => h.startsWith('alternativa_')).map(key => values[colMap[key]]).filter(Boolean);
             const todasAlternativas = [resp, ...outrasAlternativas];
             alternativas = JSON.stringify(todasAlternativas);
             respostaCorreta = resp;
        } else if (tipo === 'Certo ou Errado') {
            const lowerCaseAnswer = respostaCorreta.toLowerCase();
            respostaCorreta = JSON.stringify(['certo', 'verdadeiro', 'v'].includes(lowerCaseAnswer));
        } else {
             respostaCorreta = JSON.stringify(respostaCorreta);
        }

        const questao: Partial<Questao> = {
            tipo: tipo,
            dificuldade: dificuldade,
            disciplinaId: disciplina.id,
            topicoId: topicoFinal.id,
            enunciado: values[colMap['questão']],
            respostaCorreta: respostaCorreta,
            alternativas: alternativas,
            explicacao: values[colMap['explicação']],
            origem: origem,
            version: 1,
            isActive: true,
            hashConteudo: 'import-csv-' + uuidv4(),
        };
        questoesToCreate.push(questao);
    }
    
    if (questoesToCreate.length > 0) {
      log.push(`Enviando ${questoesToCreate.length} questões para o banco de dados...`);
      onProgress({ message: `Salvando ${questoesToCreate.length} questões...`, current: totalLines, total: totalLines, log });
      await this.bulkCreate('questoes', questoesToCreate);
    }

    return questoesToCreate.length;
  }
}

export { PocketBaseDataSource, MockDataSource };

    





    

    





