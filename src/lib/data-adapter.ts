

import { v4 as uuidv4 } from 'uuid';
import { CollectionName, Disciplina, Questao, Simulado, SimuladoDificuldade, Topico, Revisao, QuestionTipo, QuestionDificuldade, CriterioSimulado, QuestionOrigem, SimuladoQuestao } from '@/types';
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
  list<T>(collection: CollectionName, options?: any): Promise<T[] | ListResult<T>>;
  get<T>(collection: CollectionName, id: string): Promise<T | null>;
  create<T>(collection: CollectionName, data: Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'user'>): Promise<T>;
  bulkCreate<T>(collection: CollectionName, data: Partial<T>[]): Promise<T[]>;
  bulkDelete(collection: CollectionName, ids: string[]): Promise<void>;
  bulkCreateFromCsv?(csvData: string, tipo: QuestionTipo, origem: QuestionOrigem): Promise<number>;
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
          status: 'rascunho',
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
    const statsDia = await this.list('stats');
    const simulados = await this.list<Simulado>('simulados');
    const questoes = await this.list<Questao>('questoes');
    const respostas = await this.list('respostas');
    const revisao = await this.list<Revisao>('revisoes');

    const totalAcertos = respostas.filter((r: any) => r.acertou).length;
    const acertoGeral = respostas.length > 0 ? (totalAcertos / respostas.length) * 100 : 0;
    
    const simuladoEmAndamento = simulados.find(s => s.status === 'andamento');
    const questoesParaRevisarHoje = revisao.filter((r: any) => new Date(r.proximaRevisao) <= new Date()).length;

    const allDisciplinas = await this.list<Disciplina>('disciplinas');
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

  async list<T>(collection: CollectionName, options?: any): Promise<ListResult<T>> {
    const { page, perPage, ...restOptions } = options || {};
    if (page && perPage) {
        return this.pb.collection(collection).getList<T>(page, perPage, restOptions);
    }
    const records = await this.pb.collection(collection).getFullList<T>(restOptions);
    // Mimic ListResult for getFullList
    return {
        page: 1,
        perPage: records.length,
        totalPages: 1,
        totalItems: records.length,
        items: records,
    };
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
      let totalQuestoesPedidas = 0;
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
        const availableQuestoesResult = await this.list<Questao>('questoes', { filter: filterString });
        const availableQuestoes = availableQuestoesResult.items;

        const shuffled = availableQuestoes.sort(() => 0.5 - Math.random());
        const selectedQuestoes = shuffled.slice(0, criteria.quantidade);
        
        if (selectedQuestoes.length < criteria.quantidade) {
            const disciplina = await this.get<Disciplina>('disciplinas', criteria.disciplinaId);
            throw new Error(`Questões insuficientes para a disciplina ${disciplina?.nome}. Pedidas: ${criteria.quantidade}, Encontradas: ${selectedQuestoes.length}.`);
        }

        combinedQuestoes.push(...selectedQuestoes);
        totalQuestoesPedidas += criteria.quantidade;
      }

      const finalQuestoes = combinedQuestoes.sort(() => 0.5 - Math.random());

      const novoSimulado: Omit<Simulado, 'id' | 'createdAt' | 'updatedAt' | 'user'> = {
          nome: formValues.nome,
          criterios: formValues.criterios,
          status: 'rascunho',
          criadoEm: new Date().toISOString(),
          questoes: finalQuestoes.map((q, index) => ({
              id: '', 
              simuladoId: '', 
              questaoId: q.id,
              ordem: index + 1,
              correta: false, // default value
          })),
      };

      const createdSimulado = await this.create<Simulado>('simulados', novoSimulado as any);
      
      const updatedQuestoes: SimuladoQuestao[] = createdSimulado.questoes.map(q => ({...q, simuladoId: createdSimulado.id, correta: false}));
      
      return await this.update<Simulado>('simulados', createdSimulado.id, { questoes: updatedQuestoes as any });
  }

  async getDashboardStats(): Promise<any> {
    const userFilter = `user = "${this.pb.authStore.model?.id}"`;

    const [statsDia, simulados, questoes, respostas, revisao, allDisciplinas] = await Promise.all([
        this.list('stats', { filter: userFilter }),
        this.list<Simulado>('simulados', { filter: userFilter }),
        this.list<Questao>('questoes', { filter: userFilter }),
        this.list('respostas', { filter: userFilter }),
        this.list<Revisao>('revisoes', { filter: userFilter }),
        this.list<Disciplina>('disciplinas', { filter: userFilter })
    ]);
    
    const totalAcertos = (respostas as any[]).filter((r: any) => r.acertou).length;
    const acertoGeral = (respostas as any[]).length > 0 ? (totalAcertos / (respostas as any[]).length) * 100 : 0;
    
    const simuladoEmAndamento = (simulados.items as Simulado[]).find(s => s.status === 'andamento');
    const questoesParaRevisarHoje = (revisao.items as Revisao[]).filter((r: any) => new Date(r.proximaRevisao) <= new Date()).length;

    const distribution = (allDisciplinas.items as Disciplina[]).map(d => {
        const total = (questoes.items as Questao[]).filter(q => q.disciplinaId === d.id).length;
        return { name: d.nome, total };
    });

    return Promise.resolve({
        statsDia: statsDia.items,
        acertoGeral,
        simuladosCount: {
            criados: simulados.totalItems,
            emAndamento: (simulados.items as Simulado[]).filter(s => s.status === 'andamento').length,
            concluidos: (simulados.items as Simulado[]).filter(s => s.status === 'concluido').length,
        },
        simuladoEmAndamento,
        questoesParaRevisarHoje,
        distribution,
    });
  }

  async getQuestoesParaRevisar(): Promise<Questao[]> {
    const hoje = new Date().toISOString().split('T')[0];
    const userFilter = `user = "${this.pb.authStore.model?.id}"`;
    const revisoesHojeResult = await this.list<Revisao>('revisoes',{
        filter: `proximaRevisao <= "${hoje}" && ${userFilter}`
    });
    const revisoesHojeIds = revisoesHojeResult.items.map(r => r.questaoId);

    if (revisoesHojeIds.length === 0) return [];
    
    const idFilter = revisoesHojeIds.map(id => `id="${id}"`).join(" || ");
    const questoesResult = await this.list<Questao>('questoes', { filter: `(${idFilter}) && ${userFilter}` });
    
    return questoesResult.items;
  }

  async registrarRespostaRevisao(questaoId: string, performance: 'facil' | 'medio' | 'dificil'): Promise<void> {
    let revisao: Revisao | undefined;
    const userFilter = `user = "${this.pb.authStore.model?.id}"`;

    try {
        revisao = await this.pb.collection('revisoes').getFirstListItem<Revisao>(`questaoId="${questaoId}" && ${userFilter}`);
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

  async bulkCreateFromCsv(csvData: string, tipo: QuestionTipo, origem: QuestionOrigem): Promise<number> {
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

    for (const line of lines) {
        if (!line.trim()) continue;
        
        const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/"/g, '').trim()) || [];
        
        const disciplinaNome = values[colMap.disciplina];
        let topicoNome = values[colMap['tópico da disciplina']];
        const subtopicoNome = values[colMap.subtópico];

        if (subtopicoNome && subtopicoNome.toLowerCase() !== 'n/a' && subtopicoNome !== '') {
            topicoNome = `${topicoNome} - ${subtopicoNome}`;
        }
        
        let disciplina = disciplinasCache[disciplinaNome];
        if (!disciplina) {
            try {
                const filter = `nome="${disciplinaNome}" && user = "${userId}"`;
                disciplina = await this.pb.collection('disciplinas').getFirstListItem<Disciplina>(filter);
            } catch(e) {
                if ((e as any)?.status === 404) {
                    disciplina = await this.create<Disciplina>('disciplinas', { nome: disciplinaNome } as any);
                } else {
                    console.error("Error fetching disciplina:", e);
                    throw e;
                }
            }
            disciplinasCache[disciplinaNome] = disciplina;
        }

        const cacheKey = `${disciplina.id}-${topicoNome}`;
        let topico = topicosCache[cacheKey];
        if (!topico) {
            try {
                const filter = `nome = "${topicoNome}" && disciplinaId = "${disciplina.id}" && user = "${userId}"`;
                topico = await this.pb.collection('topicos').getFirstListItem<Topico>(filter);
             } catch(e) {
                 if ((e as any)?.status === 404) {
                    topico = await this.create<Topico>('topicos', { nome: topicoNome, disciplinaId: disciplina.id } as any);
                 } else {
                    console.error("Error fetching topico:", e);
                    throw e;
                 }
            }
            topicosCache[cacheKey] = topico;
        }

        let respostaCorreta: any = values[colMap.resposta];
        let alternativas: any;

        if (tipo === 'Múltipla Escolha') {
             const resp = values[colMap.resposta];
             const outrasAlternativas = header.filter(h => h.startsWith('alternativa_')).map(key => values[colMap[key]]).filter(Boolean);
             const todasAlternativas = [resp, ...outrasAlternativas];
             alternativas = JSON.stringify(todasAlternativas);
             respostaCorreta = resp;
        } else if (tipo === 'Certo ou Errado') {
            const lowerCaseAnswer = respostaCorreta.toLowerCase();
            respostaCorreta = ['certo', 'verdadeiro', 'v'].includes(lowerCaseAnswer);
        }

        const questao: Partial<Questao> = {
            tipo: tipo,
            dificuldade: values[colMap.dificuldade] as QuestionDificuldade,
            disciplinaId: disciplina.id,
            topicoId: topico.id,
            enunciado: values[colMap['questão']],
            respostaCorreta: JSON.stringify(respostaCorreta),
            alternativas: alternativas,
            explicacao: values[colMap.explicacao],
            origem: origem,
            version: 1,
            isActive: true,
            hashConteudo: 'import-csv-' + uuidv4(),
        };
        questoesToCreate.push(questao);
    }
    
    if (questoesToCreate.length > 0) {
      console.log("[DEBUG] Questoes to be created:", JSON.stringify(questoesToCreate, null, 2));
      await this.bulkCreate('questoes', questoesToCreate);
    }

    return questoesToCreate.length;
  }
}

export { PocketBaseDataSource, MockDataSource };
