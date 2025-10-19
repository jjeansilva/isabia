

import { v4 as uuidv4 } from 'uuid';
import { CollectionName, Disciplina, Questao, Simulado, SimuladoDificuldade, Topico, Revisao, QuestionTipo, QuestionDificuldade, CriterioSimulado, QuestionOrigem, SimuladoQuestao, ImportProgress, Resposta, PerformancePorCriterio, StatsDia, SimuladoStatus, RespostaConfianca } from '@/types';
import PocketBase, { ListResult } from 'pocketbase';
import { SimuladoFormValues } from '@/components/forms/simulado-form';

// Debug helpers: only log in development
const IS_DEV = process.env.NODE_ENV === 'development';
const dlog = (...args: any[]) => { if (IS_DEV) console.log(...args); };
const dwarn = (...args: any[]) => { if (IS_DEV) console.warn(...args); };

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
      if ('acertou' in processedData) {
        if (processedData.acertou === undefined || processedData.acertou === null || processedData.acertou === '') {
          console.error('ERRO: Campo acertou está undefined/nulo/vazio em addUserData! Definindo como false.');
          processedData.acertou = false;
        } else if (typeof processedData.acertou !== 'boolean') {
          // Converter para booleano se não for
          processedData.acertou = Boolean(processedData.acertou);
          dlog(`Campo acertou convertido para booleano em addUserData:`, processedData.acertou, `(tipo: ${typeof processedData.acertou})`);
        }
        
        // Verificação final para garantir que acertou é booleano
        if (typeof processedData.acertou !== 'boolean') {
          console.error('ERRO CRÍTICO: Campo acertou ainda não é booleano após conversão em addUserData! Forçando para false.');
          processedData.acertou = false;
        }
      }
      
      return {
        ...processedData,
        user: this.pb.authStore.model.id,
      };
    }
    return data;
  }

  private formatPBDate(date: Date): string {
    const iso = date.toISOString();
    return iso.slice(0,19).replace('T',' ') + 'Z';
  }
  
  private normalizeConfianca(value: any): RespostaConfianca {
    const allowed = new Set<RespostaConfianca>(['Certeza','Dúvida','Chute']);
    const v = typeof value === 'string' ? (value as string).trim() : '';
    return allowed.has(v as RespostaConfianca) ? (v as RespostaConfianca) : 'Dúvida';
  }

  async registrarRespostasSimulado(simuladoId: string, questoes: SimuladoQuestao[]): Promise<void> {
    if (!this.pb.authStore.model) throw new Error("Usuário não autenticado.");
    
    // Obter o ID do usuário atual
    const userId = this.pb.authStore.model.id;
    if (!userId) {
        throw new Error("ID do usuário não encontrado. Faça login novamente.");
    }
    
    dlog(`Iniciando registro de respostas para simulado ${simuladoId}. Total de questões: ${questoes.length}`);
    
    // Filtrar apenas questões que foram respondidas
    const questoesRespondidas = questoes.filter(q => q.respostaUsuario !== undefined);
    dlog(`Questões respondidas: ${questoesRespondidas.length}`);
    
    // Registrar cada resposta individualmente
    for (const questao of questoesRespondidas) {
        let cleanPayload: any = null; // Declarar fora do try para estar disponível no catch
        
        try {
            dlog(`Processando questão ${questao.questaoId}:`, JSON.stringify({
                acertou: questao.acertou,
                tipoAcertou: typeof questao.acertou,
                respostaUsuario: questao.respostaUsuario ? (typeof questao.respostaUsuario) : 'undefined',
                tempoSegundos: questao.tempoSegundos
            }));
            
            // Determinar se a resposta está correta (true/false)
            const acertouValue = Boolean(
                questao.acertou === true || 
                questao.acertou === 'true' || 
                questao.acertou === 1 || 
                questao.acertou === '1'
            );
            
            // Garantir que respostaUsuario seja uma string não vazia
            let respostaUsuarioStr = 'resposta não fornecida';
            
            try {
                // Primeiro, tentar converter para string de forma segura
                if (questao.respostaUsuario === null || questao.respostaUsuario === undefined) {
                    respostaUsuarioStr = 'resposta não fornecida';
                } else if (typeof questao.respostaUsuario === 'string') {
                    // Se já for string, usar diretamente (se não for vazia)
                    respostaUsuarioStr = questao.respostaUsuario.trim() !== '' 
                        ? questao.respostaUsuario 
                        : 'resposta não fornecida';
                } else if (typeof questao.respostaUsuario === 'object') {
                    // Se for objeto, tentar serializar
                    const jsonStr = JSON.stringify(questao.respostaUsuario);
                    respostaUsuarioStr = jsonStr && jsonStr !== 'null' && jsonStr !== 'undefined' && jsonStr !== '{}' && jsonStr !== '[]'
                        ? jsonStr 
                        : 'resposta não fornecida';
                } else {
                    // Para outros tipos (number, boolean, etc)
                    respostaUsuarioStr = String(questao.respostaUsuario);
                }
            } catch (e) {
                console.error(`Erro ao processar respostaUsuario para questão ${questao.questaoId}:`, e);
                respostaUsuarioStr = 'resposta não fornecida (erro de processamento)';
            }
            
            // Verificação final para garantir que nunca seja vazio
            if (!respostaUsuarioStr || respostaUsuarioStr.trim() === '') {
                respostaUsuarioStr = 'resposta não fornecida';
            }
            
            // Garantir que tempoSegundos seja um número válido
            const tempoSegundos = typeof questao.tempoSegundos === 'number' && !isNaN(questao.tempoSegundos)
                ? questao.tempoSegundos
                : (typeof questao.tempoSegundos === 'string' 
                    ? Number(questao.tempoSegundos) || 0
                    : 0);
            
            // Criar um payload limpo com todos os campos necessários
            cleanPayload = {
                acertou: acertouValue ? 'true' : 'false',  // Enviar como string conforme requisito
                confianca: this.normalizeConfianca(questao.confianca),
                questaoId: questao.questaoId,
                respostaUsuario: respostaUsuarioStr, // Garantido como string não vazia
                simuladoId: simuladoId,
                tempoSegundos: tempoSegundos,
                respondedAt: this.formatPBDate(new Date()),
                user: userId // Campo obrigatório
            };
            
            // Log detalhado do payload final
            dlog(`Payload final para questão ${questao.questaoId}:`, JSON.stringify(cleanPayload, null, 2));
            dlog(`Tipos dos campos:`, {
                acertou: typeof cleanPayload.acertou,
                confianca: typeof cleanPayload.confianca,
                questaoId: typeof cleanPayload.questaoId,
                respostaUsuario: typeof cleanPayload.respostaUsuario,
                simuladoId: typeof cleanPayload.simuladoId,
                tempoSegundos: typeof cleanPayload.tempoSegundos,
                respondedAt: typeof cleanPayload.respondedAt,
                user: typeof cleanPayload.user
            });

            // Verificar se todos os campos obrigatórios estão presentes
            dlog('=== VERIFICAÇÃO DE CAMPOS OBRIGATÓRIOS ===');
            dlog('questaoId:', cleanPayload.questaoId, '(tipo:', typeof cleanPayload.questaoId, ')');
            dlog('user:', cleanPayload.user, '(tipo:', typeof cleanPayload.user, ')');
            dlog('acertou:', cleanPayload.acertou, '(tipo:', typeof cleanPayload.acertou, ')');
            dlog('respostaUsuario:', cleanPayload.respostaUsuario, '(tipo:', typeof cleanPayload.respostaUsuario, ')');
            dlog('tempoSegundos:', cleanPayload.tempoSegundos, '(tipo:', typeof cleanPayload.tempoSegundos, ')');
            dlog('respondedAt:', cleanPayload.respondedAt, '(tipo:', typeof cleanPayload.respondedAt, ')');
            dlog('simuladoId:', cleanPayload.simuladoId, '(tipo:', typeof cleanPayload.simuladoId, ')');
            dlog('confianca:', cleanPayload.confianca, '(tipo:', typeof cleanPayload.confianca, ')');
            dlog('=======================================');
            
            if (!cleanPayload.questaoId) {
                throw new Error(`Campo questaoId está vazio ou inválido`);
            }
            if (!cleanPayload.user) {
                throw new Error(`Campo user está vazio ou inválido`);
            }
            if (typeof cleanPayload.acertou !== 'string') {
                 throw new Error(`Campo acertou não é uma string: ${typeof cleanPayload.acertou}`);
             }
             if (cleanPayload.acertou !== 'true' && cleanPayload.acertou !== 'false') {
                 throw new Error(`Campo acertou não está em 'true'/'false': ${cleanPayload.acertou}`);
             }
            if (!cleanPayload.respostaUsuario) {
                throw new Error(`Campo respostaUsuario está vazio ou inválido`);
            }
            if (typeof cleanPayload.tempoSegundos !== 'number' || isNaN(cleanPayload.tempoSegundos)) {
                throw new Error(`Campo tempoSegundos não é um número válido: ${cleanPayload.tempoSegundos}`);
            }
            if (!cleanPayload.respondedAt) {
                throw new Error(`Campo respondedAt está vazio ou inválido`);
            }
            
            // Usar o método create para garantir padronização e validações
            const result = await this.create('respostas', cleanPayload);
            dlog(`Resposta criada com sucesso para questão ${questao.questaoId}:`, (result as any).id);
            
        } catch (error) {
            console.error(`Falha ao criar registro de resposta para questão ${questao.questaoId}:`, error);
            
            // Extrair detalhes do erro do PocketBase
            if (error instanceof Error) {
                console.error(`Mensagem de erro:`, error.message);
                
                if ('data' in error) {
                    const pbError = error as any;
                    console.error('Objeto de erro completo:', JSON.stringify(pbError, null, 2));
                    
                    if (pbError.data) {
                        console.error('Dados do erro:', JSON.stringify(pbError.data, null, 2));
                    }
                    
                    if (pbError.response) {
                        console.error('Resposta do erro:', JSON.stringify(pbError.response, null, 2));
                    }
                    
                    // Log adicional para depuração
                    console.error('Status do erro:', pbError.status);
                    console.error('URL da requisição:', pbError.url);
                    if (cleanPayload) {
                        console.error('Dados enviados que causaram o erro:', JSON.stringify(cleanPayload, null, 2));
                    } else {
                        console.error('Payload não foi criado antes do erro');
                    }
                }
            }
            
            throw new Error(`Não foi possível salvar a resposta para a questão ID: ${questao.questaoId}. Detalhes: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
    }
    
    dlog(`Registro de respostas concluído para simulado ${simuladoId}`);
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
        dwarn('Requisição abortada:', collection);
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
      // Cria uma cópia limpa dos dados para evitar referências
      let processedData = JSON.parse(JSON.stringify(data));
      
      // Tratamento especial para a coleção respostas
      if (collection === 'respostas') {
        // Forçar o campo acertou para uma string válida 'true'/'false'
        if (processedData.acertou === undefined || processedData.acertou === null || 
            processedData.acertou === '' || processedData.acertou === 'undefined' || 
            processedData.acertou === 'null') {
          console.error('ERRO: Campo acertou inválido! Definindo como "false".');
          processedData.acertou = 'false';
        } else {
          // Converter explicitamente para string
          const isTrue = processedData.acertou === true || 
                         processedData.acertou === 'true' || 
                         processedData.acertou === 1 || 
                         processedData.acertou === '1';
          processedData.acertou = isTrue ? 'true' : 'false';
        }
        
        // Verificação final
        if (typeof processedData.acertou !== 'string' || (processedData.acertou !== 'true' && processedData.acertou !== 'false')) {
          console.error(`ERRO CRÍTICO: Campo acertou ainda não é string válida (${typeof processedData.acertou}): ${processedData.acertou}`);
          processedData.acertou = 'false';
        }
        
        dlog(`Campo acertou processado:`, processedData.acertou, `(tipo: ${typeof processedData.acertou})`);
      }
      
      // Adicionar dados do usuário
      const dataWithUser = this.addUserData(processedData);
      
      // Verificação final para respostas
      if (collection === 'respostas') {
        // Garantir que respostaUsuario seja uma string válida
        let respostaUsuarioStr = 'resposta não fornecida';
        try {
          if (dataWithUser.respostaUsuario === null || dataWithUser.respostaUsuario === undefined) {
            respostaUsuarioStr = 'resposta não fornecida';
          } else if (typeof dataWithUser.respostaUsuario === 'string') {
            respostaUsuarioStr = dataWithUser.respostaUsuario.trim() !== '' 
              ? dataWithUser.respostaUsuario 
              : 'resposta não fornecida';
          } else if (typeof dataWithUser.respostaUsuario === 'object') {
            const jsonStr = JSON.stringify(dataWithUser.respostaUsuario);
            respostaUsuarioStr = jsonStr && jsonStr !== 'null' && jsonStr !== 'undefined' && jsonStr !== '{}' && jsonStr !== '[]'
              ? jsonStr 
              : 'resposta não fornecida';
          } else {
            respostaUsuarioStr = String(dataWithUser.respostaUsuario);
          }
        } catch (e) {
          console.error(`Erro ao processar respostaUsuario no método create:`, e);
          respostaUsuarioStr = 'resposta não fornecida (erro de processamento)';
        }
        
        // Verificação final para garantir que nunca seja vazio
        if (!respostaUsuarioStr || respostaUsuarioStr.trim() === '') {
          respostaUsuarioStr = 'resposta não fornecida';
        }
        
        // Criar um objeto limpo com apenas os campos necessários
        const cleanData: any = {
          questaoId: dataWithUser.questaoId,
          acertou: typeof dataWithUser.acertou === 'string' ? dataWithUser.acertou : (dataWithUser.acertou === true ? 'true' : 'false'), // Enviar como string 'true'/'false'
          respostaUsuario: respostaUsuarioStr, // Garantido como string não vazia
          confianca: this.normalizeConfianca(dataWithUser.confianca),
          tempoSegundos: typeof dataWithUser.tempoSegundos === 'number' ? dataWithUser.tempoSegundos : Number(dataWithUser.tempoSegundos || 0),
          respondedAt: dataWithUser.respondedAt || this.formatPBDate(new Date()),
          user: dataWithUser.user
        };
        if (dataWithUser.simuladoId) {
          cleanData.simuladoId = dataWithUser.simuladoId;
        }
        
        // Log final antes de enviar
        dlog(`Enviando para PocketBase (${collection}):`, JSON.stringify(cleanData, null, 2));
        
        // Enviar dados limpos para o PocketBase
        return await this.pb.collection(collection).create<T>(cleanData);
      }
      
      return await this.pb.collection(collection).create<T>(dataWithUser);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        dlog(`Request to ${collection} aborted`);
        return {} as T;
      }
      
      // Enhanced error handling for PocketBase errors
      if (error instanceof Error && 'data' in error) {
        const pbError = error as any;
        console.error(`PocketBase error creating record in ${collection}:`, pbError);
        if (pbError.data && pbError.data.data) {
          console.error('Detalhes do erro:', JSON.stringify(pbError.data.data, null, 2));
        }
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
          dlog(`Campo acertou convertido para booleano no update:`, data.acertou, `(tipo: ${typeof data.acertou})`);
        }
      }
      
      const record = await this.pb.collection(collection).update<T>(id, data);
      return record;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        dlog('Requisição de atualização abortada:', collection);
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
        dwarn('Requisição de geração de simulado abortada');
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
