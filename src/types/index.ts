export interface Disciplina {
  id: string;
  nome: string;
  descricao?: string;
  cor?: string;
  ordem?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Topico {
  id: string;
  disciplinaId: string;
  nome: string;
  ordem?: number;
  createdAt: string;
  updatedAt: string;
}

export type QuestionTipo = 'multipla' | 'vf' | 'lacuna' | 'flashcard';
export type QuestionDificuldade = 'facil' | 'medio' | 'dificil';
export type QuestionOrigem = 'autoral' | 'banca' | 'importacao';
export type RespostaConfianca = 'certeza' | 'duvida' | 'chute';

export interface Questao {
  id: string;
  disciplinaId: string;
  topicoId: string;
  tipo: QuestionTipo;
  dificuldade: QuestionDificuldade;
  origem: QuestionOrigem;
  enunciado: string;
  alternativas?: string[];
  respostaCorreta: any;
  explicacao?: string;
  tags?: string[];
  version: number;
  isActive: boolean;
  hashConteudo: string;
  createdAt: string;
  updatedAt: string;
}

export type SimuladoStatus = 'rascunho' | 'andamento' | 'concluido';
export type SimuladoDificuldade = 'facil' | 'dificil' | 'aleatorio';

export interface Simulado {
  id: string;
  nome: string;
  descricao?: string;
  dificuldade: SimuladoDificuldade;
  status: SimuladoStatus;
  criadoEm: string;
  finalizadoEm?: string;
  questoes: SimuladoQuestao[];
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
  respondedAt: string;
}

export interface Revisao {
  id: string;
  questaoId: string;
  bucket: number;
  proximaRevisao: string;
}

export interface StatsDia {
  id: string;
  data: string;
  totalQuestoes: number;
  acertos: number;
  erros: number;
  tempoMedio: number;
}

export type CollectionName = 'isabia_disciplinas' | 'isabia_topicos' | 'isabia_questoes' | 'isabia_simulados' | 'isabia_respostas' | 'isabia_revisao' | 'isabia_stats';
