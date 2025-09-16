

export interface User {
    id: string;
    email: string;
    name: string;
}

export interface Disciplina {
  id: string;
  nome: string;
  descricao?: string;
  cor?: string;
  ordem?: number;
  user: string;
  createdAt: string;
  updatedAt: string;
}

export interface Topico {
  id: string;
  disciplinaId: string;
  topicoPaiId?: string;
  nome: string;
  ordem?: number;
  user: string;
  createdAt: string;
  updatedAt: string;
}

export enum QuestionTipo {
    MultiplaEscolha = 'Múltipla Escolha',
    CertoErrado = 'Certo ou Errado',
    CompletarLacuna = 'Completar Lacuna',
    Flashcard = 'Flashcard',
}
export enum QuestionDificuldade {
    Facil = 'Fácil',
    Medio = 'Médio',
    Dificil = 'Difícil',
}

export type RespostaConfianca = 'Certeza' | 'Dúvida' | 'Chute';
export type QuestionOrigem = 'Autoral' | 'Conteúdo' | 'Legislação' | 'Jurisprudência' | 'Já caiu';
export type StatusQuestoesSimulado = 'todas' | 'nao_resolvidas' | 'resolvidas' | 'erradas' | 'acertadas';


export interface Questao {
  id: string;
  disciplinaId: string;
  topicoId: string;
  tipo: QuestionTipo;
  dificuldade: QuestionDificuldade;
  origem: QuestionOrigem | QuestionOrigem[];
  enunciado: string;
  alternativas?: string | string[]; // Stored as JSON string but can be parsed
  respostaCorreta: any;
  explicacao?: string;
  tags?: string[];
  version: number;
  isActive: boolean;
  hashConteudo: string;
  necessitaRevisao?: boolean;
  motivoRevisao?: string;
  user: string;
  createdAt: string;
  updatedAt: string;
}

export type SimuladoStatus = 'Rascunho' | 'Em andamento' | 'Concluído';
export type SimuladoDificuldade = 'aleatorio' | 'Fácil' | 'Médio' | 'Difícil';

export interface CriterioSimulado {
  disciplinaId: string;
  topicoId?: string;
  quantidade: number;
  dificuldade: SimuladoDificuldade;
  statusQuestoes: StatusQuestoesSimulado;
}

export interface Simulado {
  id: string;
  nome: string;
  descricao?: string;
  status: SimuladoStatus;
  criterios: CriterioSimulado[] | string;
  criadoEm: string;
  finalizadoEm?: string;
  questoes: SimuladoQuestao[] | string;
  user: string;
}

export interface SimuladoQuestao {
  id: string;
  simuladoId: string;
  questaoId: string;
  ordem: number;
  respostaUsuario?: any;
  correta?: boolean;
  confianca?: RespostaConfianca;
  tempoSegundos?: number;
}

export interface Resposta {
  id: string;
  questaoId: string;
  simuladoId?: string | null;
  acertou: boolean;
  respostaUsuario: any;
  confianca: RespostaConfianca;
  tempoSegundos: number;
  user: string;
  respondedAt: string;
  expand?: {
    questaoId?: Questao;
  };
}

export interface Revisao {
  id: string;
  questaoId: string;
  bucket: number;
  proximaRevisao: string;
  user: string;
}

export interface StatsDia {
  id: string;
  data: string;
  totalQuestoes: number;
  acertos: number;
  erros: number;
  tempoMedio: number;
  user: string;
}

export interface ImportProgress {
    message: string;
    current: number;
    total: number;
    log?: string[];
    isError?: boolean;
}

export interface PerformancePorCriterio {
    nome: string;
    totalQuestoes: number;
    percentualAcerto: number;
}


export type CollectionName = 'users' | 'disciplinas' | 'topicos' | 'questoes' | 'simulados' | 'respostas' | 'revisoes' | 'stats';
