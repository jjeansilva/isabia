import { v4 as uuidv4 } from 'uuid';
import { CollectionName, Disciplina, Questao, Simulado, SimuladoDificuldade, Topico } from '@/types';

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
  update<T extends { id: string }>(collection: CollectionName, id: string, data: Partial<T>): Promise<T>;
  delete(collection: CollectionName, id: string): Promise<void>;
  gerarSimulado(criteria: { disciplinaId: string, topicoId?: string, quantidade: number, dificuldade: SimuladoDificuldade, nome: string }): Promise<Simulado>;
  getDashboardStats(): Promise<any>;
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
      let allQuestoes = getFromStorage<Questao>('questoes');
      
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

      const createdSimulado = await this.create<Simulado>('simulados', novoSimulado as any);
      
      createdSimulado.questoes.forEach(q => q.simuladoId = createdSimulado.id);
      
      return await this.update<Simulado>('simulados', createdSimulado.id, { questoes: createdSimulado.questoes });
  }

  async getDashboardStats(): Promise<any> {
    const statsDia = await this.list('stats');
    const simulados = await this.list<Simulado>('simulados');
    const questoes = await this.list<Questao>('questoes');
    const respostas = await this.list('respostas');
    const revisao = await this.list('revisao');

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
}

class PocketBaseDataSource implements IDataSource {
  constructor() {
    // const pb = new PocketBase(process.env.NEXT_PUBLIC_PB_URL);
    // ... authentication logic
    console.warn("PocketBaseDataSource is a stub and not connected to a real backend.");
  }

  private async _notImplemented(): Promise<any> {
    throw new Error("PocketBaseDataSource method not implemented.");
  }

  list<T>(collection: CollectionName, filter?: any): Promise<T[]> { return this._notImplemented(); }
  get<T>(collection: CollectionName, id: string): Promise<T | null> { return this._notImplemented(); }
  create<T>(collection: CollectionName, data: Omit<T, "id">): Promise<T> { return this._notImplemented(); }
  update<T extends { id: string; }>(collection: CollectionName, id: string, data: Partial<T>): Promise<T> { return this._notImplemented(); }
  delete(collection: CollectionName, id: string): Promise<void> { return this._notImplemented(); }
  gerarSimulado(criteria: any): Promise<Simulado> { return this._notImplemented(); }
  getDashboardStats(): Promise<any> { return this._notImplemented(); }
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
