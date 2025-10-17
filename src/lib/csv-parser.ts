
import { Questao, QuestionTipo, QuestionDificuldade, QuestionOrigem, Disciplina, Topico } from "@/types";
import { IDataSource } from "./data-adapter";
import { v4 as uuidv4 } from 'uuid';

function normalizeDificuldade(dificuldade: string | undefined): QuestionDificuldade {
    const d = dificuldade?.toLowerCase().trim();
    if (d === 'fácil' || d === 'facil') return QuestionDificuldade.Facil;
    if (d === 'média' || d === 'medio' || d === 'médio') return QuestionDificuldade.Medio;
    if (d === 'difícil' || d === 'dificil') return QuestionDificuldade.Dificil;
    return QuestionDificuldade.Facil; // Default
}

// Represents a question parsed from the CSV, not yet saved
type ParsedQuestao = Omit<Questao, 'id' | 'createdAt' | 'updatedAt' | 'user'> & { tempId: string };


export async function parseCsvForReview(
    csvData: string, 
    defaultTipo: QuestionTipo, 
    defaultOrigem: QuestionOrigem,
    dataSource: IDataSource
): Promise<{ questoes: ParsedQuestao[], log: string[] }> {
    
    const lines = csvData.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) {
        throw new Error("O CSV precisa ter pelo menos uma linha de cabeçalho e uma linha de dados.");
    }

    const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows = lines.slice(1);
    
    const log: string[] = [];
    const parsedQuestoes: ParsedQuestao[] = [];

    const getColumn = (row: string[], name: string) => {
        const index = header.indexOf(name);
        return index > -1 ? row[index]?.trim().replace(/"/g, '') : undefined;
    }

    // Pre-fetch all disciplinas and topicos to avoid multiple DB calls in loop
    const allDisciplinas = await dataSource.list<Disciplina>('disciplinas');
    const allTopicos = await dataSource.list<Topico>('topicos');
    const disciplinaMap = new Map(allDisciplinas.map(d => [d.nome.toLowerCase(), d]));
    const topicoMap = new Map(allTopicos.map(t => [`${t.disciplinaId}-${t.nome.toLowerCase()}`, t]));
    
    for (let i = 0; i < rows.length; i++) {
        const rowData = rows[i].split(',');
        const disciplinaNome = getColumn(rowData, 'disciplina');
        const topicoNome = getColumn(rowData, 'tópico da disciplina');
        const enunciado = getColumn(rowData, 'questão');

        if (!disciplinaNome || !topicoNome || !enunciado) {
            log.push(`AVISO: Linha ${i + 2} ignorada por falta de 'disciplina', 'tópico da disciplina' ou 'questão'.`);
            continue;
        }

        let disciplina = disciplinaMap.get(disciplinaNome.toLowerCase());
        if (!disciplina) {
            disciplina = { nome: disciplinaNome, id: `temp-disciplina-${uuidv4()}` } as Disciplina;
            disciplinaMap.set(disciplinaNome.toLowerCase(), disciplina);
            log.push(`[Linha ${i + 2}] Nova disciplina será criada: ${disciplinaNome}`);
        }

        let topico = topicoMap.get(`${disciplina.id}-${topicoNome.toLowerCase()}`);
        if (!topico) {
            topico = { nome: topicoNome, disciplinaId: disciplina.id, id: `temp-topico-${uuidv4()}` } as Topico;
            topicoMap.set(`${disciplina.id}-${topicoNome.toLowerCase()}`, topico);
            log.push(`[Linha ${i + 2}] Novo tópico será criado: ${topicoNome}`);
        }
        
        const subtópicoNome = getColumn(rowData, 'subtópico');
        if (subtópicoNome) {
            let subtópico = topicoMap.get(`${disciplina.id}-${subtópicoNome.toLowerCase()}`);
             if (!subtópico) {
                subtópico = { nome: subtópicoNome, disciplinaId: disciplina.id, topicoPaiId: topico.id, id: `temp-subtopico-${uuidv4()}` } as Topico;
                topicoMap.set(`${disciplina.id}-${subtópicoNome.toLowerCase()}`, subtópico);
                log.push(`[Linha ${i + 2}] Novo subtópico será criado: ${subtópicoNome}`);
             }
             topico = subtópico;
        }

        const alternativas = header.filter(h => h.startsWith('alternativa_')).map(h => getColumn(rowData, h)).filter(Boolean) as string[];
        
        const questao: ParsedQuestao = {
            tempId: uuidv4(),
            disciplinaId: disciplina.id,
            topicoId: topico.id,
            tipo: defaultTipo,
            origem: defaultOrigem,
            enunciado: enunciado,
            dificuldade: normalizeDificuldade(getColumn(rowData, 'dificuldade')),
            respostaCorreta: getColumn(rowData, 'resposta') || '',
            explicacao: getColumn(rowData, 'explicação') || '',
            alternativas: alternativas,
            isActive: true,
            version: 1,
            hashConteudo: 'csv_import_' + uuidv4(),
        };
        parsedQuestoes.push(questao);
    }
    
    return { questoes: parsedQuestoes, log };
}
