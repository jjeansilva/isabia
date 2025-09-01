import { v4 as uuidv4 } from 'uuid';
import { Disciplina, Topico, Questao, Simulado, Resposta, Revisao, StatsDia } from '@/types';

function createMockData() {
  const now = new Date().toISOString();

  // Disciplinas
  const disciplinas: Disciplina[] = [
    { id: 'd1', nome: 'Direito Constitucional', cor: '#00329C', ordem: 1, createdAt: now, updatedAt: now },
    { id: 'd2', nome: 'Direito Administrativo', cor: '#32BAD9', ordem: 2, createdAt: now, updatedAt: now },
    { id: 'd3', nome: 'Português', cor: '#03A688', ordem: 3, createdAt: now, updatedAt: now },
  ];

  // Tópicos
  const topicos: Topico[] = [
    { id: 't1', disciplinaId: 'd1', nome: 'Direitos Fundamentais', ordem: 1, createdAt: now, updatedAt: now },
    { id: 't2', disciplinaId: 'd1', nome: 'Controle de Constitucionalidade', ordem: 2, createdAt: now, updatedAt: now },
    { id: 't3', disciplinaId: 'd2', nome: 'Atos Administrativos', ordem: 1, createdAt: now, updatedAt: now },
    { id: 't4', disciplinaId: 'd3', nome: 'Concordância Verbal', ordem: 1, createdAt: now, updatedAt: now },
  ];
  
  // Questões
  const questoes: Questao[] = [
    {
      id: 'q1',
      disciplinaId: 'd1',
      topicoId: 't1',
      tipo: 'multipla',
      dificuldade: 'facil',
      origem: 'banca',
      enunciado: 'Qual remédio constitucional é utilizado para proteger o direito de locomoção?',
      alternativas: ['Habeas Corpus', 'Habeas Data', 'Mandado de Segurança', 'Mandado de Injunção'],
      respostaCorreta: 'Habeas Corpus',
      explicacao: 'O Habeas Corpus, previsto no art. 5º, LXVIII, da CF, protege o direito de ir e vir.',
      tags: ['direitos_fundamentais', 'remedios'],
      version: 1,
      isActive: true,
      hashConteudo: 'hash1',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'q2',
      disciplinaId: 'd2',
      topicoId: 't3',
      tipo: 'vf',
      dificuldade: 'medio',
      origem: 'autoral',
      enunciado: 'A presunção de legitimidade é um atributo do ato administrativo que admite prova em contrário.',
      respostaCorreta: true,
      explicacao: 'Correto, a presunção é relativa (juris tantum), podendo ser afastada por prova em contrário.',
      tags: ['atos', 'atributos'],
      version: 1,
      isActive: true,
      hashConteudo: 'hash2',
      createdAt: now,
      updatedAt: now,
    },
     {
      id: 'q3',
      disciplinaId: 'd3',
      topicoId: 't4',
      tipo: 'lacuna',
      dificuldade: 'dificil',
      origem: 'importacao',
      enunciado: 'A maioria dos presentes [[votou]] a favor da proposta.',
      respostaCorreta: 'votou',
      explicacao: 'O verbo concorda com o núcleo do sujeito "maioria", que está no singular.',
      tags: ['concordancia', 'sujeito_coletivo'],
      version: 1,
      isActive: true,
      hashConteudo: 'hash3',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'q4',
      disciplinaId: 'd1',
      topicoId: 't2',
      tipo: 'flashcard',
      dificuldade: 'medio',
      origem: 'autoral',
      enunciado: 'O que é o controle difuso de constitucionalidade?',
      respostaCorreta: 'É aquele realizado por qualquer juiz ou tribunal, no caso concreto, com efeitos inter partes.',
      version: 1,
      isActive: true,
      hashConteudo: 'hash4',
      createdAt: now,
      updatedAt: now,
    },
    ...Array.from({ length: 20 }, (_, i) => ({
      id: `q${i + 5}`,
      disciplinaId: `d${(i % 3) + 1}`,
      topicoId: `t${(i % 4) + 1}`,
      tipo: 'multipla' as const,
      dificuldade: 'facil' as const,
      origem: 'banca' as const,
      enunciado: `Enunciado da questão de múltipla escolha número ${i + 5}.`,
      alternativas: [`Alternativa A${i}`, `Alternativa B${i}`, `Alternativa C${i}`, `Alternativa D${i}`],
      respostaCorreta: `Alternativa A${i}`,
      explicacao: `Explicação detalhada para a questão ${i + 5}.`,
      tags: ['mock'],
      version: 1,
      isActive: true,
      hashConteudo: `hash${i + 5}`,
      createdAt: now,
      updatedAt: now,
    })),
  ];

  // Simulados
  const simulados: Simulado[] = [
    {
      id: 's1',
      nome: 'Simulado de Revisão - Constitucional',
      dificuldade: 'aleatorio',
      status: 'concluido',
      criadoEm: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      finalizadoEm: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      questoes: [
        { id: 'sq1', simuladoId: 's1', questaoId: 'q1', ordem: 1, respostaUsuario: 'Habeas Corpus', correta: true, confianca: 'certeza' },
        { id: 'sq2', simuladoId: 's1', questaoId: 'q4', ordem: 2, respostaUsuario: 'Resposta errada', correta: false, confianca: 'duvida' },
      ],
    },
    {
      id: 's2',
      nome: 'Diagnóstico Geral',
      dificuldade: 'aleatorio',
      status: 'andamento',
      criadoEm: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      questoes: [
        { id: 'sq3', simuladoId: 's2', questaoId: 'q2', ordem: 1, respostaUsuario: true, correta: true, confianca: 'chute' },
        { id: 'sq4', simuladoId: 's2', questaoId: 'q3', ordem: 2 },
      ],
    },
    {
      id: 's3',
      nome: 'Simulado de Português (Rascunho)',
      dificuldade: 'facil',
      status: 'rascunho',
      criadoEm: now,
      questoes: [],
    },
  ];
  
  // Respostas
  const respostas: Resposta[] = [];
  simulados.forEach(sim => {
    sim.questoes.forEach(sq => {
      if(sq.respostaUsuario !== undefined) {
        respostas.push({
          id: uuidv4(),
          questaoId: sq.questaoId,
          simuladoId: sim.id,
          acertou: sq.correta ?? false,
          respostaUsuario: sq.respostaUsuario,
          confianca: sq.confianca ?? 'duvida',
          tempoSegundos: Math.floor(Math.random() * 180) + 30,
          respondedAt: sim.finalizadoEm || sim.criadoEm,
        });
      }
    });
  });


  // Revisão
  const revisao: Revisao[] = [
    { id: 'r1', questaoId: 'q2', bucket: 2, proximaRevisao: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'r2', questaoId: 'q4', bucket: 1, proximaRevisao: new Date().toISOString() },
  ];

  // Stats
  const stats: StatsDia[] = Array.from({ length: 7 }, (_, i) => ({
    id: `stat${i}`,
    data: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    totalQuestoes: Math.floor(Math.random() * 40) + 10,
    acertos: Math.floor(Math.random() * 30) + 5,
    erros: Math.floor(Math.random() * 10) + 2,
    tempoMedio: Math.floor(Math.random() * 120) + 60,
  }));

  return { disciplinas, topicos, questoes, simulados, respostas, revisao, stats };
}

export function seedLocalStorage() {
  if (typeof window !== 'undefined' && !localStorage.getItem('isab_seeded')) {
    console.log("Seeding local storage with mock data...");
    const data = createMockData();
    localStorage.setItem('isab_isabia_disciplinas', JSON.stringify(data.disciplinas));
    localStorage.setItem('isab_isabia_topicos', JSON.stringify(data.topicos));
    localStorage.setItem('isab_isabia_questoes', JSON.stringify(data.questoes));
    localStorage.setItem('isab_isabia_simulados', JSON.stringify(data.simulados));
    localStorage.setItem('isab_isabia_respostas', JSON.stringify(data.respostas));
    localStorage.setItem('isab_isabia_revisao', JSON.stringify(data.revisao));
    localStorage.setItem('isab_isabia_stats', JSON.stringify(data.stats));
    localStorage.setItem('isab_seeded', 'true');
  }
}

export function resetLocalStorage() {
    if (typeof window !== 'undefined') {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('isab_')) {
                localStorage.removeItem(key);
            }
        });
        console.log("Cleared all iSabIA data from local storage.");
        seedLocalStorage();
    }
}
