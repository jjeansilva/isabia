import { v4 as uuidv4 } from 'uuid';
import { CollectionName, Disciplina, Topico, Questao, Simulado, Resposta, Revisao, StatsDia } from '@/types';
import { IDataSource } from './data-adapter';

function createMockData() {
  const now = new Date();

  // Disciplinas
  const disciplinas: Omit<Disciplina, 'id'|'createdAt'|'updatedAt'|'user'>[] = [
    { nome: 'Direito Constitucional', cor: '#00329C', ordem: 1 },
    { nome: 'Direito Administrativo', cor: '#32BAD9', ordem: 2 },
    { nome: 'Português', cor: '#03A688', ordem: 3 },
    { nome: 'Raciocínio Lógico', cor: '#F2B705', ordem: 4 },
    { nome: 'Informática', cor: '#D95204', ordem: 5 },
  ];

  // Tópicos - agora dependerão dos IDs das disciplinas criadas
  const topicosData = [
    { disciplina: 'Direito Constitucional', nome: 'Direitos Fundamentais', ordem: 1 },
    { disciplina: 'Direito Constitucional', nome: 'Controle de Constitucionalidade', ordem: 2 },
    { disciplina: 'Direito Administrativo', nome: 'Atos Administrativos', ordem: 1 },
    { disciplina: 'Português', nome: 'Concordância Verbal', ordem: 1 },
    { disciplina: 'Informática', nome: 'Segurança da Informação', ordem: 1 },
  ];
  
  // Questões - agora dependerão dos IDs de disciplinas e tópicos
  const questoesData = [
    {
      disciplina: 'Direito Constitucional',
      topico: 'Direitos Fundamentais',
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
    },
    {
      disciplina: 'Direito Administrativo',
      topico: 'Atos Administrativos',
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
    },
     {
      disciplina: 'Português',
      topico: 'Concordância Verbal',
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
    },
    {
      disciplina: 'Direito Constitucional',
      topico: 'Controle de Constitucionalidade',
      tipo: 'flashcard',
      dificuldade: 'medio',
      origem: 'autoral',
      enunciado: 'O que é o controle difuso de constitucionalidade?',
      respostaCorreta: 'É aquele realizado por qualquer juiz ou tribunal, no caso concreto, com efeitos inter partes.',
      version: 1,
      isActive: true,
      hashConteudo: 'hash4',
    },
     {
      disciplina: 'Informática',
      topico: 'Segurança da Informação',
      tipo: 'vf',
      dificuldade: 'facil',
      origem: 'banca',
      enunciado: 'Firewall é um software ou hardware que verifica informações provenientes da Internet ou de uma rede, e as bloqueia ou permite que cheguem ao seu computador.',
      respostaCorreta: true,
      explicacao: 'Essa é a definição básica de um firewall, que atua como uma barreira de proteção.',
      tags: ['seguranca', 'redes'],
      version: 1,
      isActive: true,
      hashConteudo: 'hash5',
    },
  ];

  // Stats
  const stats: Omit<StatsDia, 'id' | 'user'>[] = Array.from({ length: 7 }, (_, i) => ({
    data: new Date(new Date().setDate(now.getDate() - (6 - i))).toISOString().split('T')[0],
    totalQuestoes: Math.floor(Math.random() * 40) + 10,
    acertos: Math.floor(Math.random() * 30) + 5,
    erros: Math.floor(Math.random() * 10) + 2,
    tempoMedio: Math.floor(Math.random() * 120) + 60,
  }));

  return { disciplinas, topicosData, questoesData, stats };
}

export async function seedPocketBase(dataSource: IDataSource) {
    console.log("Seeding PocketBase with mock data...");
    const { disciplinas, topicosData, questoesData, stats } = createMockData();

    // NOTE: We are not clearing data anymore as it requires admin privileges 
    // that a normal user session doesn't have. The user should clear manually if needed
    // or we can provide a dedicated admin function later.
    
    // Seed Disciplinas
    console.log("Seeding disciplinas...");
    const createdDisciplinas = await dataSource.bulkCreate<Omit<Disciplina, 'id' | 'createdAt' | 'updatedAt'| 'user'>>('isabia_disciplinas', disciplinas);
    
    // Map names to IDs for relation
    const disciplinaMap = createdDisciplinas.reduce((acc, d) => {
        acc[d.nome] = d.id;
        return acc;
    }, {} as Record<string, string>);

    // Seed Tópicos
    console.log("Seeding topicos...");
    const topicosToCreate = topicosData.map(t => ({
        ...t,
        disciplinaId: disciplinaMap[t.disciplina],
    }));
    const createdTopicos = await dataSource.bulkCreate('isabia_topicos', topicosToCreate);

    const topicoMap = createdTopicos.reduce((acc, t) => {
        const key = `${t.disciplinaId}-${t.nome}`;
        acc[key] = t.id;
        return acc;
    }, {} as Record<string, string>);
    
    // Seed Questões
    console.log("Seeding questoes...");
    const questoesToCreate = questoesData.map(q => {
      const disciplinaId = disciplinaMap[q.disciplina];
      const topicoId = topicoMap[`${disciplinaId}-${q.topico}`];
      return { ...q, disciplinaId, topicoId };
    });
    await dataSource.bulkCreate('isabia_questoes', questoesToCreate);

    // Seed Stats
    console.log("Seeding stats...");
    await dataSource.bulkCreate('isabia_stats', stats);

    console.log("Seeding finished.");
}


export function seedLocalStorage() {
  if (typeof window !== 'undefined' && !localStorage.getItem('isab_seeded')) {
    console.log("Seeding local storage with mock data...");
    const rawData = createMockData();
    const now = new Date().toISOString();
    const user = "localuser";

    const seededDisciplinas: Disciplina[] = rawData.disciplinas.map(d => ({...d, id: uuidv4(), createdAt: now, updatedAt: now, user }));
    const disciplinaMap = seededDisciplinas.reduce((acc, d) => {
        acc[d.nome] = d.id;
        return acc;
    }, {} as Record<string, string>);
    
    const seededTopicos: Topico[] = rawData.topicosData.map(t => ({...t, id: uuidv4(), disciplinaId: disciplinaMap[t.disciplina], createdAt: now, updatedAt: now, user}));
     const topicoMap = seededTopicos.reduce((acc, t) => {
        const key = `${t.disciplinaId}-${t.nome}`;
        acc[key] = t.id;
        return acc;
    }, {} as Record<string, string>);
    
    const seededQuestoes: Questao[] = rawData.questoesData.map(q => {
        const disciplinaId = disciplinaMap[q.disciplina];
        const topicoId = topicoMap[`${disciplinaId}-${q.topico}`];
        return {
            ...q,
            id: uuidv4(),
            disciplinaId,
            topicoId,
            createdAt: now,
            updatedAt: now,
            user
        } as Questao;
    });

    const seededStats: StatsDia[] = rawData.stats.map(s => ({...s, id: uuidv4(), user }));


    localStorage.setItem('isab_isabia_disciplinas', JSON.stringify(seededDisciplinas));
    localStorage.setItem('isab_isabia_topicos', JSON.stringify(seededTopicos));
    localStorage.setItem('isab_isabia_questoes', JSON.stringify(seededQuestoes));
    localStorage.setItem('isab_isabia_simulados', JSON.stringify([]));
    localStorage.setItem('isab_isabia_respostas', JSON.stringify([]));
    localStorage.setItem('isab_isabia_revisao', JSON.stringify([]));
    localStorage.setItem('isab_isabia_stats', JSON.stringify(seededStats));
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
