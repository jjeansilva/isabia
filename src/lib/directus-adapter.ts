import { v4 as uuidv4 } from 'uuid';
import { CollectionName, Disciplina, Questao, Simulado, SimuladoDificuldade, Topico, Revisao, QuestionTipo, QuestionDificuldade, CriterioSimulado, QuestionOrigem, SimuladoQuestao, ImportProgress, Resposta, PerformancePorCriterio, StatsDia, SimuladoStatus, RespostaConfianca } from '@/types';
import { createDirectus, rest, readItems, createItem, updateItem, deleteItem, readItem } from '@directus/sdk';
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
  directus: any;
  list<T>(collection: CollectionName, options?: any): Promise<T[]>;
  get<T extends { id: string }>(collection: CollectionName, id: string): Promise<T | null>;
  create<T>(collection: CollectionName, data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  update<T extends { id: string }>(collection: CollectionName, id: string, data: Partial<T>): Promise<T>;
  delete(collection: CollectionName, id: string): Promise<void>;