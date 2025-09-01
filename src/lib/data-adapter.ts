import { v4 as uuidv4 } from 'uuid';
import { CollectionName, Disciplina, Questao, Simulado, SimuladoDificuldade, Topico, Revisao, QuestionTipo, QuestionDificuldade } from '@/types';
import PocketBase, { ListResult } from 'pocketbase';

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
  list<T>(collection: CollectionName, filter?: any): Promise<T[]>;
  get<T>(collection: CollectionName, id: string): Promise<T | null>;
  create<T>(collection: CollectionName, data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  bulkCreate?<T>(collection: CollectionName, data: Partial<T>[]): Promise<T[]>;
  bulkCreateFromCsv?(csvData: string, tipo: QuestionTipo): Promise<number>;
  update<T extends { id: string }>(collection: CollectionName, id: string, data: Partial<T>): Promise<T>;
  delete(collection: CollectionName, id: string): Promise<void>;
  gerarSimulado(criteria: { disciplinaId: string, topicoId?: string, quantidade: number, dificuldade: SimuladoDificuldade, nome: string }): Promise<Simulado>;
  getDashboardStats(): Promise<any>;
  getQuestoesParaRevisar(): Promise<Questao[]>;
  registrarRespostaRevisao(questaoId: string, performance: 'facil' | 'medio' | 'dificil'): Promise<void>;
}

class MockDataSource implements IDataSource {
  async list<T>(collection: CollectionName, filter?: any): Promise<T[]> {
    let data = getFromStorage<T>(collection);
    if (filter) {
      data = data.filter(item => 
        Object.entries(filter).every(([key, value]) => (item as any)[key] === value)
      );
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

  async gerarSimulado(criteria: { disciplinaId: string, topicoId?: string, quantidade: number, dificuldade: SimuladoDificuldade, nome: string }): Promise<Simulado> {
      let allQuestoes = getFromStorage<Questao>('isabia_questoes');
      
      let filtered = allQuestoes.filter(q => q.isActive && q.disciplinaId === criteria.disciplinaId);
      
      if (criteria.topicoId) {
        filtered = filtered.filter(q => q.topicoId === criteria.topicoId);
      }

      if (criteria.dificuldade !== 'aleatorio') {
          if (criteria.dificuldade === 'facil') {
            filtered = filtered.filter(q => q.dificuldade === 'facil' || q.dificuldade === 'medio');
          } else { // dificil
            filtered = filtered.filter(q => q.dificuldade === 'medio' || q.dificuldade === 'dificil');
          }
      }

      const shuffled = filtered.sort(() => 0.5 - Math.random());
      const selectedQuestoes = shuffled.slice(0, criteria.quantidade);
      
      if (selectedQuestoes.length < criteria.quantidade) {
          throw new Error(`Não foram encontradas questões suficientes para os critérios selecionados. Encontradas: ${selectedQuestoes.length}, Pedidas: ${criteria.quantidade}`);
      }

      const novoSimulado: Omit<Simulado, 'id' | 'createdAt' | 'updatedAt'> = {
          nome: criteria.nome,
          dificuldade: criteria.dificuldade,
          status: 'rascunho',
          criadoEm: new Date().toISOString(),
          questoes: selectedQuestoes.map((q, index) => ({
              id: uuidv4(),
              simuladoId: '', // will be set after simulado is created
              questaoId: q.id,
              ordem: index + 1,
          })),
      };

      const createdSimulado = await this.create<Simulado>('isabia_simulados', novoSimulado as any);
      
      createdSimulado.questoes.forEach(q => q.simuladoId = createdSimulado.id);
      
      return await this.update<Simulado>('isabia_simulados', createdSimulado.id, { questoes: createdSimulado.questoes });
  }

  async getDashboardStats(): Promise<any> {
    const statsDia = await this.list('isabia_stats');
    const simulados = await this.list<Simulado>('isabia_simulados');
    const questoes = await this.list<Questao>('isabia_questoes');
    const respostas = await this.list('isabia_respostas');
    const revisao = await this.list<Revisao>('isabia_revisao');

    const totalAcertos = respostas.filter((r: any) => r.acertou).length;
    const acertoGeral = respostas.length > 0 ? (totalAcertos / respostas.length) * 100 : 0;
    
    const simuladoEmAndamento = simulados.find(s => s.status === 'andamento');
    const questoesParaRevisarHoje = revisao.filter((r: any) => new Date(r.proximaRevisao) <= new Date()).length;

    const allDisciplinas = await this.list<Disciplina>('isabia_disciplinas');
    const distribution = allDisciplinas.map(d => {
        const total = questoes.filter(q => q.disciplinaId === d.id).length;
        return { name: d.nome, total };
    });

    return Promise.resolve({
        statsDia,
        acertoGeral,
        simuladosCount: {
            criados: simulados.length,
            emAndamento: simulados.filter(s => s.status === 'andamento').length,
            concluidos: simulados.filter(s => s.status === 'concluido').length,
        },
        simuladoEmAndamento,
        questoesParaRevisarHoje,
        distribution,
    });
  }

  async getQuestoesParaRevisar(): Promise<Questao[]> {
    const revisoes = getFromStorage<Revisao>('isabia_revisao');
    const hoje = new Date();
    const revisoesHojeIds = revisoes
        .filter(r => new Date(r.proximaRevisao) <= hoje)
        .map(r => r.questaoId);

    const todasQuestoes = getFromStorage<Questao>('isabia_questoes');
    const questoesParaRevisar = todasQuestoes.filter(q => revisoesHojeIds.includes(q.id));
    
    return Promise.resolve(questoesParaRevisar);
  }

  async registrarRespostaRevisao(questaoId: string, performance: 'facil' | 'medio' | 'dificil'): Promise<void> {
    const revisoes = getFromStorage<Revisao>('isabia_revisao');
    const questoes = getFromStorage<Questao>('isabia_questoes');
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
    
    saveToStorage('isabia_revisao', revisoes);
    return Promise.resolve();
  }
}

class PocketBaseDataSource implements IDataSource {
  private pb: PocketBase;
  
  constructor() {
    this.pb = new PocketBase(process.env.NEXT_PUBLIC_PB_URL);
    console.log("PocketBaseDataSource initialized for:", process.env.NEXT_PUBLIC_PB_URL);
  }

  private async ensureAuthenticated() {
    if (!this.pb.authStore.isValid) {
      // This is a server-side only operation, requires admin credentials
      if (process.env.PB_ADMIN_EMAIL && process.env.PB_ADMIN_PASSWORD) {
        await this.pb.admins.authWithPassword(
            process.env.PB_ADMIN_EMAIL,
            process.env.PB_ADMIN_PASSWORD
        );
      } else if (typeof window !== 'undefined') {
        // Handle client-side auth if necessary in the future
      }
    }
  }

  async list<T>(collection: CollectionName, filter?: any): Promise<T[]> {
    await this.ensureAuthenticated();
    const filterString = filter ? Object.entries(filter).map(([key, value]) => `${key}="${value}"`).join(' && ') : '';
    const records = await this.pb.collection(collection).getFullList<T>({ filter: filterString });
    return records;
  }

  async get<T>(collection: CollectionName, id: string): Promise<T | null> {
    await this.ensureAuthenticated();
    try {
        const record = await this.pb.collection(collection).getOne<T>(id);
        return record;
    } catch(e) {
        if (e instanceof Error && (e as any).status === 404) return null;
        throw e;
    }
  }

  async create<T>(collection: CollectionName, data: Omit<T, "id" | "createdAt" | "updatedAt">): Promise<T> {
    await this.ensureAuthenticated();
    const record = await this.pb.collection(collection).create<T>(data);
    return record;
  }

  async bulkCreate<T>(collection: CollectionName, data: Partial<T>[]): Promise<T[]> {
      await this.ensureAuthenticated();
      const promises = data.map(item => this.pb.collection(collection).create<T>(item));
      return Promise.all(promises);
  }
  
  async update<T extends { id: string; }>(collection: CollectionName, id: string, data: Partial<T>): Promise<T> {
    await this.ensureAuthenticated();
    const record = await this.pb.collection(collection).update<T>(id, data);
    return record;
  }
  
  async delete(collection: CollectionName, id: string): Promise<void> {
    await this.ensureAuthenticated();
    await this.pb.collection(collection).delete(id);
  }

  async gerarSimulado(criteria: { disciplinaId: string, topicoId?: string, quantidade: number, dificuldade: SimuladoDificuldade, nome: string }): Promise<Simulado> {
    await this.ensureAuthenticated();
    
    const filterParts: string[] = [];
    filterParts.push(`isActive=true`);
    filterParts.push(`disciplinaId="${criteria.disciplinaId}"`);
    if(criteria.topicoId) {
        filterParts.push(`topicoId="${criteria.topicoId}"`);
    }

    if (criteria.dificuldade !== 'aleatorio') {
        if (criteria.dificuldade === 'facil') {
            filterParts.push(`(dificuldade="facil" || dificuldade="medio")`);
        } else { // dificil
            filterParts.push(`(dificuldade="medio" || dificuldade="dificil")`);
        }
    }
    
    const filterString = filterParts.join(" && ");
    const allQuestoes = await this.pb.collection('isabia_questoes').getFullList<Questao>({ filter: filterString });

    const shuffled = allQuestoes.sort(() => 0.5 - Math.random());
    const selectedQuestoes = shuffled.slice(0, criteria.quantidade);
      
    if (selectedQuestoes.length < criteria.quantidade) {
        throw new Error(`Não foram encontradas questões suficientes para os critérios selecionados. Encontradas: ${selectedQuestoes.length}, Pedidas: ${criteria.quantidade}`);
    }

    const novoSimulado: Omit<Simulado, 'id' | 'createdAt' | 'updatedAt'> = {
        nome: criteria.nome,
        dificuldade: criteria.dificuldade,
        status: 'rascunho',
        criadoEm: new Date().toISOString(),
        questoes: selectedQuestoes.map((q, index) => ({
            id: '', // pocketbase will generate this
            simuladoId: '', 
            questaoId: q.id,
            ordem: index + 1,
        })),
    };

    const createdSimulado = await this.create<Simulado>('isabia_simulados', novoSimulado as any);
      
    createdSimulado.questoes.forEach(q => q.simuladoId = createdSimulado.id);
      
    return await this.update<Simulado>('isabia_simulados', createdSimulado.id, { questoes: createdSimulado.questoes });
  }

  async getDashboardStats(): Promise<any> {
    const statsDia = await this.list('isabia_stats');
    const simulados = await this.list<Simulado>('isabia_simulados');
    const questoes = await this.list<Questao>('isabia_questoes');
    const respostas = await this.list('isabia_respostas');
    const revisao = await this.list<Revisao>('isabia_revisao');

    const totalAcertos = respostas.filter((r: any) => r.acertou).length;
    const acertoGeral = respostas.length > 0 ? (totalAcertos / respostas.length) * 100 : 0;
    
    const simuladoEmAndamento = simulados.find(s => s.status === 'andamento');
    const questoesParaRevisarHoje = revisao.filter((r: any) => new Date(r.proximaRevisao) <= new Date()).length;

    const allDisciplinas = await this.list<Disciplina>('isabia_disciplinas');
    const distribution = allDisciplinas.map(d => {
        const total = questoes.filter(q => q.disciplinaId === d.id).length;
        return { name: d.nome, total };
    });

    return Promise.resolve({
        statsDia,
        acertoGeral,
        simuladosCount: {
            criados: simulados.length,
            emAndamento: simulados.filter(s => s.status === 'andamento').length,
            concluidos: simulados.filter(s => s.status === 'concluido').length,
        },
        simuladoEmAndamento,
        questoesParaRevisarHoje,
        distribution,
    });
  }

  async getQuestoesParaRevisar(): Promise<Questao[]> {
    await this.ensureAuthenticated();
    const hoje = new Date().toISOString().split('T')[0];
    const revisoesHoje = await this.pb.collection('isabia_revisao').getFullList<Revisao>({
        filter: `proximaRevisao <= "${hoje}"`
    });
    const revisoesHojeIds = revisoesHoje.map(r => r.questaoId);

    if (revisoesHojeIds.length === 0) return [];
    
    const filterString = revisoesHojeIds.map(id => `id="${id}"`).join(" || ");
    const questoes = await this.pb.collection('isabia_questoes').getFullList<Questao>({ filter: filterString });
    
    return questoes;
  }

  async registrarRespostaRevisao(questaoId: string, performance: 'facil' | 'medio' | 'dificil'): Promise<void> {
    await this.ensureAuthenticated();
    
    let revisao: Revisao | undefined;
    try {
        revisao = await this.pb.collection('isabia_revisao').getFirstListItem<Revisao>(`questaoId="${questaoId}"`);
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
      await this.update('isabia_revisao', revisao.id, { bucket: revisao.bucket, proximaRevisao: revisao.proximaRevisao });
    } else {
      const bucket = performance === 'dificil' ? 0 : 1;
      const diasParaAdicionar = intervalos[performance][bucket];
      const novaRevisao: Omit<Revisao, 'id' | 'createdAt' | 'updatedAt'> = {
        questaoId: questaoId,
        bucket: bucket,
        proximaRevisao: new Date(new Date().setDate(now.getDate() + diasParaAdicionar)).toISOString(),
      };
      await this.create('isabia_revisao', novaRevisao as any);
    }
  }

  async bulkCreateFromCsv(csvData: string, tipo: QuestionTipo): Promise<number> {
    await this.ensureAuthenticated();

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
    
    // Cache for created disciplines and topics to avoid multiple lookups/creates
    const disciplinasCache: Record<string, Disciplina> = {};
    const topicosCache: Record<string, Topico> = {};

    const questoesToCreate: Partial<Questao>[] = [];

    for (const line of lines) {
        if (!line.trim()) continue;
        
        const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/"/g, '').trim()) || [];
        
        const disciplinaNome = values[colMap.disciplina];
        let topicoNome = values[colMap['tópico da disciplina']];
        const subtopicoNome = values[colMap.subtópico]; // Note: subtópico is merged into tópico

        if (subtopicoNome && subtopicoNome.toLowerCase() !== 'n/a' && subtopicoNome !== '') {
            topicoNome = `${topicoNome} - ${subtopicoNome}`;
        }
        
        // --- Get or Create Disciplina ---
        let disciplina = disciplinasCache[disciplinaNome];
        if (!disciplina) {
            try {
                disciplina = await this.pb.collection('isabia_disciplinas').getFirstListItem<Disciplina>(`nome="${disciplinaNome}"`);
            } catch(e) {
                if ((e as any)?.status === 404) {
                    disciplina = await this.create<Disciplina>('isabia_disciplinas', { nome: disciplinaNome });
                } else {
                    throw e; // Rethrow other errors
                }
            }
            disciplinasCache[disciplinaNome] = disciplina;
        }

        // --- Get or Create Topico ---
        const cacheKey = `${disciplina.id}-${topicoNome}`;
        let topico = topicosCache[cacheKey];
        if (!topico) {
            try {
                topico = await this.pb.collection('isabia_topicos').getFirstListItem<Topico>(`nome="${topicoNome}" AND disciplinaId="${disciplina.id}"`);
            } catch(e) {
                 if ((e as any)?.status === 404) {
                    topico = await this.create<Topico>('isabia_topicos', { nome: topicoNome, disciplinaId: disciplina.id });
                 } else {
                    throw e; // Rethrow other errors
                 }
            }
            topicosCache[cacheKey] = topico;
        }

        let respostaCorreta: any = values[colMap.resposta];
        let alternativas: string[] | undefined;

        if (tipo === 'multipla') {
             const resp = values[colMap.resposta];
             const outrasAlternativas = header.filter(h => h.startsWith('alternativa_')).map(key => values[colMap[key]]).filter(Boolean);
             alternativas = [resp, ...outrasAlternativas].sort(() => Math.random() - 0.5); // Randomize order
             respostaCorreta = resp;
        } else if (tipo === 'vf') {
            respostaCorreta = ['verdadeiro', 'certo', 'v'].includes(respostaCorreta.toLowerCase());
        }

        const questao: Partial<Questao> = {
            tipo: tipo,
            dificuldade: values[colMap.dificuldade].toLowerCase() as QuestionDificuldade,
            disciplinaId: disciplina.id,
            topicoId: topico.id,
            enunciado: values[colMap.questao],
            respostaCorreta: respostaCorreta,
            alternativas: alternativas,
            explicacao: values[colMap.explicacao],
            origem: 'importacao',
            version: 1,
            isActive: true,
            hashConteudo: 'import-csv-' + uuidv4(),
        };
        questoesToCreate.push(questao);
    }
    
    if (questoesToCreate.length > 0) {
      await this.bulkCreate('isabia_questoes', questoesToCreate);
    }

    return questoesToCreate.length;
  }
}

let dataSource: IDataSource;

export function getDataSource(): IDataSource {
  if (dataSource) {
    return dataSource;
  }
  
  const usePocketBase = process.env.NEXT_PUBLIC_PB_URL;

  if (usePocketBase) {
    dataSource = new PocketBaseDataSource();
  } else {
    dataSource = new MockDataSource();
  }

  return dataSource;
}
