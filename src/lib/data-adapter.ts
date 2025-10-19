

import { v4 as uuidv4 } from 'uuid';
import { CollectionName, Disciplina, Questao, Simulado, SimuladoDificuldade, Topico, Revisao, QuestionTipo, QuestionDificuldade, CriterioSimulado, QuestionOrigem, SimuladoQuestao, ImportProgress, Resposta, PerformancePorCriterio, StatsDia, SimuladoStatus, RespostaConfianca } from '@/types';
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
  gerarSimulado(formValues: SimuladoFormValues): Promise<Simulado>;
  getDashboardStats(): Promise<any>;
  getQuestoesParaRevisar(): Promise<Questao[]>;
  registrarRespostaRevisao(questaoId: string, performance: 'facil' | 'medio' | 'dificil'): Promise<void>;
  registrarRespostasSimulado(simuladoId: string, questoes: SimuladoQuestao[]): Promise<void>;
}

class MockDataSource implements IDataSource {
  async registrarRespostasSimulado(simuladoId: string, questoes: SimuladoQuestao[]): Promise<void> {
    const respostas = getFromStorage<Resposta>('respostas');
    const now = new Date().toISOString();

    const novasRespostas = questoes
        .filter(q => q.respostaUsuario !== undefined)
        .map(q => ({
            id: uuidv4(),
            acertou: Boolean(q.acertou),
            confianca: q.confianca || 'Dúvida',
            questaoId: q.questaoId,
            respostaUsuario: JSON.stringify(q.respostaUsuario),
            simuladoId: simuladoId,
            respondedAt: now,
            tempoSegundos: q.tempoSegundos || 0,
            user: 'localuser'
        }));
    
    respostas.push(...novasRespostas as any[]);
    saveToStorage('respostas', respostas);
    return Promise.resolve();
  }

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
      
      (createdSimulado.questoes as SimuladoQuestao[]).forEach(q => q.simuladoId = createdSimulado.id);
      
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
    const totalAcertos = respostas.filter(r => Boolean(r.acertou)).length;
    const acertoGeral = totalRespostas > 0 ? (totalAcertos / totalRespostas) * 100 : 0;
    const tempoMedioGeral = totalRespostas > 0 ? respostas.reduce((acc, r) => acc + r.tempoSegundos, 0) / totalRespostas : 0;

    const umMesAtras = new Date();
    umMesAtras.setDate(umMesAtras.getDate() - 30);
    const respostasUltimos30d = respostas.filter(r => new Date(r.respondedAt) >= umMesAtras);
    const acertosUltimos30d = respostasUltimos30d.filter(r => Boolean(r.acertou)).length;
    const acertoUltimos30dPercent = respostasUltimos30d.length > 0 ? (acertosUltimos30d / respostasUltimos30d.length) * 100 : 0;
    
    // Histórico de acertos para o gráfico
    const historicoAcertos = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        const dateString = date.toISOString().split('T')[0];
        const respostasDoDia = respostas.filter(r => r.respondedAt.startsWith(dateString));
        const acertosDoDia = respostasDoDia.filter(r => Boolean(r.acertou)).length;
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

        reducePerformance(desempenhoMap, questao.disciplinaId, Boolean(resposta.acertou));
        reducePerformance(dificuldadeMap, questao.dificuldade, Boolean(resposta.acertou));
        reducePerformance(tipoMap, questao.tipo, Boolean(resposta.acertou));
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
    
    this.pb.beforeSend = (url, options) => {
        if (options.method === 'GET') {
            delete (options.headers as any)['Content-Type'];
        }
        return { url, options };
    };
  }
  
  private addUserData(data: any): any {
    if (this.pb.authStore.model) {
      // Garantir que o campo acertou seja sempre um booleano válido
      const processedData = { ...data };
      
      // Verificação especial para o campo acertou
      if (processedData.acertou !== undefined) {
        if (processedData.acertou === null || processedData.acertou === '') {
          console.error('ERRO: Campo acertou está nulo ou vazio em addUserData! Definindo como false.');
          processedData.acertou = false;
        } else if (typeof processedData.acertou !== 'boolean') {
          // Converter para booleano se não for
          processedData.acertou = Boolean(processedData.acertou);
          console.log(`Campo acertou convertido para booleano em addUserData:`, processedData.acertou, `(tipo: ${typeof processedData.acertou})`);
        }
      }
      
      return {
        ...processedData,
        user: this.pb.authStore.model.id,
      };
    }
    return data;
  }

  async registrarRespostasSimulado(simuladoId: string, questoes: SimuladoQuestao[]): Promise<void> {
    if (!this.pb.authStore.model) throw new Error("Usuário não autenticado.");

    for (const questao of questoes) {
        if (questao.respostaUsuario === undefined) continue;

        try {
            // Build a clean payload with all required fields
            // Garantir que acertou seja sempre um booleano válido
            let acertouValue = false;
            
            // Verificação mais robusta para o campo acertou
            if (questao.acertou === undefined || questao.acertou === null || questao.acertou === '') {
                console.error(`ERRO: Campo acertou está indefinido, nulo ou vazio para questão ${questao.questaoId}! Definindo como false.`);
                acertouValue = false;
            } else if (typeof questao.acertou === 'boolean') {
                acertouValue = questao.acertou;
            } else if (typeof questao.acertou === 'string') {
                // Converter strings para booleano
                acertouValue = questao.acertou.toLowerCase() === 'true' || questao.acertou === '1';
            } else {
                // Converter qualquer outro tipo para booleano
                acertouValue = Boolean(questao.acertou);
            }
            
            // Log para depuração
            console.log(`Registrando resposta para questão ${questao.questaoId}:`, {
                acertouOriginal: questao.acertou,
                acertouConvertido: acertouValue,
                tipoAcertou: typeof questao.acertou
            });
            
            const payload = {
                acertou: acertouValue,
                confianca: questao.confianca || 'Dúvida',
                questaoId: questao.questaoId,
                respostaUsuario: JSON.stringify(questao.respostaUsuario),
                simuladoId: simuladoId,
                tempoSegundos: questao.tempoSegundos || 0,
                respondedAt: new Date().toISOString(),
            };
            
            // Verificação final e reforçada para garantir que acertou é sempre um booleano
            if (payload.acertou === undefined || payload.acertou === null || payload.acertou === '') {
                console.error('ERRO CRÍTICO: Campo acertou está undefined/null/vazio! Definindo como false.');
                payload.acertou = false; // Valor padrão para evitar erro
            } else if (typeof payload.acertou !== 'boolean') {
                // Forçar conversão para booleano
                payload.acertou = Boolean(payload.acertou);
                console.log(`Campo acertou forçado para booleano:`, payload.acertou, `(tipo: ${typeof payload.acertou})`);
            }
            
            // Log final do payload antes de enviar
            console.log('Payload final para criar resposta:', JSON.stringify(payload, null, 2));
            console.log('Campo acertou no payload final:', payload.acertou, `(tipo: ${typeof payload.acertou})`);

            // Criar uma cópia do payload para garantir que não há mutação inesperada
            const payloadFinal = {
                ...payload,
                acertou: Boolean(payload.acertou) // Garantir que seja booleano
            };

            await this.create('respostas', payloadFinal);
        } catch (error) {
            console.error(`Falha ao criar registro de resposta para questão ${questao.questaoId}:`, error);
            throw new Error(`Não foi possível salvar a resposta para a questão ID: ${questao.questaoId}. Detalhes: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
    }
  }

  async registrarRespostaRevisao(questaoId: string, performance: 'facil' | 'medio' | 'dificil'): Promise<void> {
    if (!this.pb.authStore.model) throw new Error("Usuário não autenticado.");
    
    try {
      // Buscar revisão existente para esta questão
      const userFilter = `user = "${this.pb.authStore.model.id}" && questaoId = "${questaoId}"`;
      const revisoes = await this.list('revisoes', { filter: userFilter });
      
      const now = new Date();
      
      const intervalos = {
        facil: [1, 4, 10, 30], // dias
        medio: [1, 2, 5, 15],
        dificil: [0, 1, 2, 4],
      };
      
      if (revisoes.length > 0) {
        // Atualizar revisão existente
        const revisao = revisoes[0] as any;
        
        if (performance === 'dificil') {
          revisao.bucket = 0; // Resetar
        } else {
          revisao.bucket = Math.min(revisao.bucket + 1, intervalos[performance].length - 1);
        }
        
        const diasParaAdicionar = intervalos[performance][revisao.bucket];
        const proximaRevisao = new Date(now.setDate(now.getDate() + diasParaAdicionar)).toISOString();
        
        await this.update('revisoes', revisao.id, {
          bucket: revisao.bucket,
          proximaRevisao: proximaRevisao
        });
      } else {
        // Criar nova revisão
        const bucket = performance === 'dificil' ? 0 : 1;
        const diasParaAdicionar = intervalos[performance][bucket];
        const proximaRevisao = new Date(new Date().setDate(now.getDate() + diasParaAdicionar)).toISOString();
        
        await this.create('revisoes', {
          questaoId: questaoId,
          bucket: bucket,
          proximaRevisao: proximaRevisao
        });
      }
    } catch (error) {
      console.error(`Erro ao registrar revisão para questão ${questaoId}:`, error);
      throw new Error(`Não foi possível registrar a revisão para a questão ID: ${questaoId}. Detalhes: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  async getQuestoesParaRevisar(): Promise<Questao[]> {
    if (!this.pb.authStore.model) throw new Error("Usuário não autenticado.");
    
    try {
      const hoje = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
      const userFilter = `user = "${this.pb.authStore.model.id}"`;
      
      // Buscar todas as revisões do usuário
      const revisoes = await this.list('revisoes', { filter: userFilter });
      
      // Filtrar revisões que precisam ser revisadas hoje
      const revisoesHoje = revisoes.filter((revisao: any) => {
        const dataRevisao = new Date(revisao.proximaRevisao).toISOString().split('T')[0];
        return dataRevisao <= hoje;
      });
      
      if (revisoesHoje.length === 0) {
        return [];
      }
      
      // Extrair IDs das questões para revisar
      const questoesIds = revisoesHoje.map((revisao: any) => revisao.questaoId);
      
      // Buscar as questões correspondentes
      const questoesParaRevisar: Questao[] = [];
      
      for (const questaoId of questoesIds) {
        try {
          const questao = await this.get<Questao>('questoes', questaoId);
          if (questao) {
            questoesParaRevisar.push(questao);
          }
        } catch (error) {
          console.error(`Erro ao buscar questão ${questaoId}:`, error);
        }
      }
      
      return questoesParaRevisar;
    } catch (error) {
      console.error('Erro ao buscar questões para revisar:', error);
      throw new Error(`Não foi possível buscar questões para revisar. Detalhes: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  // Na classe PocketBaseDataSource, adicionar tratamento de erros:

  async list<T>(collection: CollectionName, options?: any): Promise<T[]> {
  try {
    const records = await this.pb.collection(collection).getFullList<T>(options);
    
    // Verificação especial para a coleção simulados
    if (collection === 'simulados') {
      return records.map((record: any) => {
        if (record.questoes) {
          // Garantir que todas as questões tenham acertou como booleano válido
          const questoesComAcertouValido = record.questoes.map((questao: any) => {
            if (questao.respostaUsuario !== undefined && questao.acertou !== undefined) {
              return {
                ...questao,
                acertou: Boolean(questao.acertou)
              };
            }
            return questao;
          });
          record.questoes = questoesComAcertouValido;
        }
        return record;
      });
    }
    
    return records;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('Requisição abortada:', collection);
      return [];
    }
    throw error;
  }
}

  async get<T>(collection: CollectionName, id: string): Promise<T | null> {
    try {
        const record = await this.pb.collection(collection).getOne<T>(id);
        
        // Verificação especial para a coleção simulados
        if (collection === 'simulados' && record && (record as any).questoes) {
          // Garantir que todas as questões tenham acertou como booleano válido
          const questoesComAcertouValido = (record as any).questoes.map((questao: any) => {
            if (questao.respostaUsuario !== undefined && questao.acertou !== undefined) {
              return {
                ...questao,
                acertou: Boolean(questao.acertou)
              };
            }
            return questao;
          });
          (record as any).questoes = questoesComAcertouValido;
        }
        
        return record;
    } catch(e) {
        if (e instanceof Error && (e as any).status === 404) return null;
        throw e;
    }
  }

  // Na classe PocketBaseDataSource, adicionar tratamento de erros nos métodos create e update:
  
  async create<T>(collection: CollectionName, data: any): Promise<T> {
    try {
      // Garantir que acertou seja sempre um booleano válido antes de adicionar dados do usuário
      let processedData = { ...data };
      
      // Verificação especial para o campo acertou
      if (collection === 'respostas') {
        if (processedData.acertou === undefined || processedData.acertou === null || processedData.acertou === '') {
          console.error('ERRO: Campo acertou está indefinido, nulo ou vazio! Definindo como false.');
          processedData.acertou = false;
        } else if (typeof processedData.acertou !== 'boolean') {
          // Converter para booleano se não for
          processedData.acertou = Boolean(processedData.acertou);
          console.log(`Campo acertou convertido para booleano:`, processedData.acertou, `(tipo: ${typeof processedData.acertou})`);
        }
      }
      
      const dataWithUser = this.addUserData(processedData);
      
      // Log para depuração - dados originais
      console.log(`Dados originais para criar em ${collection}:`, JSON.stringify(data, null, 2));
      
      // Log para depuração - dados após adicionar usuário
      console.log(`Dados com usuário para criar em ${collection}:`, JSON.stringify(dataWithUser, null, 2));
      
      // Verificação final do campo acertou
      if (collection === 'respostas') {
        console.log(`Campo acertou nos dados finais:`, dataWithUser.acertou, `(tipo: ${typeof dataWithUser.acertou})`);
        
        // Garantir que acertou seja um booleano puro antes de enviar ao PocketBase
        if (typeof dataWithUser.acertou !== 'boolean') {
          console.warn(`AVISO: Campo acertou ainda não é booleano. Convertendo para booleano. Valor atual:`, dataWithUser.acertou, `(tipo: ${typeof dataWithUser.acertou})`);
          dataWithUser.acertou = Boolean(dataWithUser.acertou);
          console.log(`Campo acertou após conversão final:`, dataWithUser.acertou, `(tipo: ${typeof dataWithUser.acertou})`);
        }
        
        // Criar uma cópia explícita para garantir que não haja problemas de referência
        const finalData = { ...dataWithUser };
        finalData.acertou = Boolean(finalData.acertou);
        
        // Log final antes de enviar ao PocketBase
        console.log(`Dados finais antes de enviar ao PocketBase:`, JSON.stringify({
          ...finalData,
          acertou: finalData.acertou,
          acertouType: typeof finalData.acertou
        }, null, 2));
        
        return await this.pb.collection(collection).create<T>(finalData);
      }
      
      return await this.pb.collection(collection).create<T>(dataWithUser);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log(`Request to ${collection} aborted`);
        return {} as T;
      }
      
      // Enhanced error handling for PocketBase errors
      if (error instanceof Error && 'data' in error) {
        const pbError = error as any;
        console.error(`PocketBase error creating record in ${collection}:`, pbError);
        throw new Error(`Falha ao criar registro: ${pbError.message || pbError.data?.message || 'Erro desconhecido'}`);
      }
      
      console.error(`Error creating record in ${collection}:`, error);
      throw error;
    }
  }

async update<T extends { id: string; }>(collection: CollectionName, id: string, data: Partial<T>): Promise<T> {
  try {
    // Verificação especial para a coleção simulados
    if (collection === 'simulados' && data.questoes) {
      // Garantir que todas as questões tenham acertou como booleano válido
      const questoesComAcertouValido = (data.questoes as any[]).map(questao => {
        if (questao.respostaUsuario !== undefined) {
          return {
            ...questao,
            acertou: questao.acertou !== undefined && questao.acertou !== null ? Boolean(questao.acertou) : false
          };
        }
        return questao;
      });
      data.questoes = questoesComAcertouValido as any;
    }
    
    // Verificação especial para o campo acertou na coleção respostas
    if (collection === 'respostas' && data.acertou !== undefined) {
      if (data.acertou === null || data.acertou === '') {
        console.error('ERRO: Campo acertou está nulo ou vazio no update! Definindo como false.');
        data.acertou = false;
      } else if (typeof data.acertou !== 'boolean') {
        // Converter para booleano se não for
        data.acertou = Boolean(data.acertou);
        console.log(`Campo acertou convertido para booleano no update:`, data.acertou, `(tipo: ${typeof data.acertou})`);
      }
    }
    
    const record = await this.pb.collection(collection).update<T>(id, data);
    return record;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('Requisição de atualização abortada:', collection);
      throw new Error('Operação cancelada pelo usuário');
    }
    throw error;
  }
}

async gerarSimulado(formValues: SimuladoFormValues): Promise<Simulado> {
  try {
    let combinedQuestoes: Questao[] = [];
    const userFilter = `user = "${this.pb.authStore.model?.id}"`;
    
    const allRespostas = await this.list<Resposta>('respostas', { filter: userFilter, fields: 'id,questaoId,acertou' });
    
    const resolvidasIds = new Set(allRespostas.map(r => r.questaoId));
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
      acertou: false, // Garantir que acertou seja sempre um booleano válido
    }));

    const novoSimulado: Omit<Simulado, 'id' | 'createdAt' | 'updatedAt' | 'user'> = {
        nome: formValues.nome,
        criterios: formValues.criterios,
        status: 'Rascunho' as SimuladoStatus,
        criadoEm: new Date().toISOString(),
        questoes: questoesParaSalvar,
    };

    const createdSimulado = await this.create<Simulado>('simulados', novoSimulado as any);
    
    const updatedQuestoes = (createdSimulado.questoes as any[]).map(q => ({...q, simuladoId: createdSimulado.id }));
    
    return await this.update<Simulado>('simulados', createdSimulado.id, { questoes: updatedQuestoes });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('Requisição de geração de simulado abortada');
      throw new Error('Operação cancelada pelo usuário');
    }
    throw error;
  }
}

  async delete(collection: CollectionName, id: string): Promise<void> {
    await this.pb.collection(collection).delete(id);
  }
}

export { PocketBaseDataSource, MockDataSource };
