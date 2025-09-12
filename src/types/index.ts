

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

export type QuestionTipo = 'Múltipla Escolha' | 'Certo ou Errado' | 'Completar Lacuna' | 'Flashcard';
export type QuestionDificuldade = 'Fácil' | 'Médio' | 'Difícil';
export type QuestionOrigem = 'Autoral' | 'Conteúdo' | 'Legislação' | 'Jurisprudência' | 'Já caiu';
export type RespostaConfianca = 'Certeza' | 'Dúvida' | 'Chute';

export interface Questao {
  id: string;
  disciplinaId: string;
  topicoId: string;
  tipo: QuestionTipo;
  dificuldade: QuestionDificuldade;
  origem: QuestionOrigem | QuestionOrigem[];
  enunciado: string;
  alternativas?: string; // Stored as JSON string
  respostaCorreta: any;
  explicacao?: string;
  tags?: string[];
  version: number;
  isActive: boolean;
  hashConteudo: string;
  user: string;
  createdAt: string;
  updatedAt: string;
}

export type SimuladoStatus = 'rascunho' | 'andamento' | 'concluido';
export type SimuladoDificuldade = 'aleatorio' | 'Fácil' | 'Médio' | 'Difícil';

export interface CriterioSimulado {
  disciplinaId: string;
  topicoId?: string;
  quantidade: number;
  dificuldade: SimuladoDificuldade;
}

export interface Simulado {
  id: string;
  nome: string;
  descricao?: string;
  status: SimuladoStatus;
  criterios: CriterioSimulado[]; // Changed from 'dificuldade'
  criadoEm: string;
  finalizadoEm?: string;
  questoes: SimuladoQuestao[];
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


export type CollectionName = 'users' | 'disciplinas' | 'topicos' | 'questoes' | 'simulados' | 'respostas' | 'revisoes' | 'stats';
