
import { v4 as uuidv4 } from 'uuid';
import { CollectionName, Disciplina, Topico, Questao, Simulado, Resposta, Revisao, StatsDia } from '@/types';
import { IDataSource } from './data-adapter';

function createMockData() {
  const now = new Date();

  // Disciplinas
  const disciplinas: Omit<Disciplina, 'id'|'createdAt'|'updatedAt'|'user'>[] = [
    { nome: 'Direito Constitucional', cor: '#00329C', ordem: 1, descricao: 'Estudo da constituição e organização dos poderes.' },
    { nome: 'Direito Administrativo', cor: '#32BAD9', ordem: 2, descricao: 'Normas que regem a função administrativa.' },
    { nome: 'Português', cor: '#03A688', ordem: 3, descricao: 'Estudo da língua portuguesa.' },
    { nome: 'Raciocínio Lógico', cor: '#F2B705', ordem: 4, descricao: 'Fundamentos do raciocínio lógico e matemática.' },
    { nome: 'Informática', cor: '#D95204', ordem: 5, descricao: 'Conceitos de hardware, software e redes.' },
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
      tipo: 'Múltipla Escolha',
      dificuldade: 'Fácil',
      origem: 'Já caiu',
      enunciado: 'Qual remédio constitucional é utilizado para proteger o direito de locomoção?',
      alternativas: '["Habeas Corpus", "Habeas Data", "Mandado de Segurança", "Mandado de Injunção"]',
      respostaCorreta: '"Habeas Corpus"',
      explicacao: 'O Habeas Corpus, previsto no art. 5º, LXVIII, da CF, protege o direito de ir e vir.',
      tags: ['direitos_fundamentais', 'remedios'],
      version: 1,
      isActive: true,
      hashConteudo: 'hash1',
      necessitaRevisao: false,
      motivoRevisao: '',
    },
    {
      disciplina: 'Direito Administrativo',
      topico: 'Atos Administrativos',
      tipo: 'Certo ou Errado',
      dificuldade: 'Médio',
      origem: 'Autoral',
      enunciado: 'A presunção de legitimidade é um atributo do ato administrativo que admite prova em contrário.',
      respostaCorreta: 'true',
      explicacao: 'Correto, a presunção é relativa (juris tantum), podendo ser afastada por prova em contrário.',
      tags: ['atos', 'atributos'],
      version: 1,
      isActive: true,
      hashConteudo: 'hash2',
      necessitaRevisao: true,
      motivoRevisao: 'A resposta parece correta, mas a explicação poderia ser mais detalhada, mencionando a diferença para a presunção de veracidade.',
    },
     {
      disciplina: 'Português',
      topico: 'Concordância Verbal',
      tipo: 'Completar Lacuna',
      dificuldade: 'Difícil',
      origem: 'Conteúdo',
      enunciado: 'A maioria dos presentes [[votou]] a favor da proposta.',
      respostaCorreta: '"votou"',
      explicacao: 'O verbo concorda com o núcleo do sujeito "maioria", que está no singular.',
      tags: ['concordancia', 'sujeito_coletivo'],
      version: 1,
      isActive: true,
      hashConteudo: 'hash3',
      necessitaRevisao: false,
      motivoRevisao: '',
    },
    {
      disciplina: 'Direito Constitucional',
      topico: 'Controle de Constitucionalidade',
      tipo: 'Flashcard',
      dificuldade: 'Médio',
      origem: 'Autoral',
      enunciado: 'O que é o controle difuso de constitucionalidade?',
      respostaCorreta: '"É aquele realizado por qualquer juiz ou tribunal, no caso concreto, com efeitos inter partes."',
      version: 1,
      isActive: true,
      hashConteudo: 'hash4',
      necessitaRevisao: true,
      motivoRevisao: 'Erro de digitação na palavra "realisado". O correto é "realizado".',
    },
     {
      disciplina: 'Informática',
      topico: 'Segurança da Informação',
      tipo: 'Certo ou Errado',
      dificuldade: 'Fácil',
      origem: 'Já caiu',
      enunciado: 'Firewall é um software ou hardware que verifica informações provenientes da Internet ou de uma rede, e as bloqueia ou permite que cheguem ao seu computador.',
      respostaCorreta: 'true',
      explicacao: 'Essa é a definição básica de um firewall, que atua como uma barreira de proteção.',
      tags: ['seguranca', 'redes'],
      version: 1,
      isActive: true,
      hashConteudo: 'hash5',
      necessitaRevisao: false,
      motivoRevisao: '',
    },
  ];

  // Stats
  const stats: Omit<StatsDia, 'id' | 'user' | 'createdAt' | 'updatedAt'>[] = Array.from({ length: 7 }, (_, i) => ({
    data: new Date(new Date().setDate(now.getDate() - (6 - i))).toISOString().split('T')[0],
    totalQuestoes: Math.floor(Math.random() * 40) + 10,
    acertos: Math.floor(Math.random() * 30) + 5,
    erros: Math.floor(Math.random() * 10) + 2,
    tempoMedio: Math.floor(Math.random() * 120) + 60,
  }));

  return { disciplinas, topicosData, questoesData, stats };
}

export async function seedPocketBase(dataSource: IDataSource) {
    if (!dataSource.pb) {
        console.warn("Seeding aborted: Not a PocketBase data source.");
        return;
    }
    console.log("Seeding PocketBase with mock data...");
    const { disciplinas, topicosData, questoesData, stats } = createMockData();

    // Clear existing data for a clean slate
    const collectionsToClear: CollectionName[] = ['respostas', 'revisoes', 'simulados', 'questoes', 'topicos', 'disciplinas', 'stats'];
    
    for (const collection of collectionsToClear) {
        try {
            console.log(`Clearing collection: ${collection}...`);
            const items = await dataSource.list(collection, { fields: 'id' });
            if (items && items.length > 0) {
              await dataSource.bulkDelete(collection, items.map((i: any) => i.id));
              console.log(`-> Cleared ${items.length} items from ${collection}.`);
            } else {
              console.log(`-> Collection ${collection} is already empty.`);
            }
        } catch(e) {
            console.error(`Could not clear collection ${collection}:`, (e as any).message);
        }
    }
    
    // Seed Disciplinas
    console.log("Seeding disciplinas...");
    const createdDisciplinas = await dataSource.bulkCreate<Omit<Disciplina, 'id' | 'createdAt' | 'updatedAt'| 'user'>>('disciplinas', disciplinas);
    console.log(`-> Seeded ${createdDisciplinas.length} disciplinas.`);
    
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
    const createdTopicos = await dataSource.bulkCreate('topicos', topicosToCreate);
    console.log(`-> Seeded ${createdTopicos.length} tópicos.`);

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
    const createdQuestoes = await dataSource.bulkCreate('questoes', questoesToCreate);
    console.log(`-> Seeded ${createdQuestoes.length} questões.`);

    // Seed Stats
    console.log("Seeding stats...");
    await dataSource.bulkCreate('stats', stats);
    console.log(`-> Seeded ${stats.length} stats records.`);

    console.log("Seeding finished.");
}


export function seedLocalStorage() {
  if (typeof window !== 'undefined' && !localStorage.getItem('isab_seeded')) {
    console.log("Seeding local storage with mock data...");
    const rawData = createMockData();
    const now = new Date().toISOString();
    const user = "localuser";

    const seededDisciplinas: Disciplina[] = rawData.disciplinas.map(d => ({...d, id: uuidv4(), createdAt: now, updatedAt: now, user } as Disciplina));
    const disciplinaMap = seededDisciplinas.reduce((acc, d) => {
        acc[d.nome] = d.id;
        return acc;
    }, {} as Record<string, string>);
    
    const seededTopicos: Topico[] = rawData.topicosData.map(t => ({...t, id: uuidv4(), disciplinaId: disciplinaMap[t.disciplina], createdAt: now, updatedAt: now, user} as Topico));
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

    const seededStats: StatsDia[] = rawData.stats.map(s => ({...s, id: uuidv4(), user } as StatsDia));


    localStorage.setItem('isab_disciplinas', JSON.stringify(seededDisciplinas));
    localStorage.setItem('isab_topicos', JSON.stringify(seededTopicos));
    localStorage.setItem('isab_questoes', JSON.stringify(seededQuestoes));
    localStorage.setItem('isab_simulados', JSON.stringify([]));
    localStorage.setItem('isab_respostas', JSON.stringify([]));
    localStorage.setItem('isab_revisoes', JSON.stringify([]));
    localStorage.setItem('isab_stats', JSON.stringify(seededStats));
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
