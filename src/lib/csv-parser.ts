
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
type ParsedQuestao = Omit<Questao, 'id' | 'createdAt' | 'updatedAt' | 'user'> & { disciplinaNome?: string, topicoNome?: string, subtopicoNome?: string };


/**
 * Parses a single line of a CSV string, respecting quotes.
 * @param line The CSV line to parse.
 * @returns An array of strings representing the fields.
 */
function parseCsvLine(line: string): string[] {
    const fields: string[] = [];
    let currentField = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
        const char = line[i];

        if (char === '"') {
            // Handle escaped quotes ("")
            if (inQuotes && line[i + 1] === '"') {
                currentField += '"';
                i++; // Skip the next quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            fields.push(currentField);
            currentField = '';
        } else {
            currentField += char;
        }
        i++;
    }

    fields.push(currentField); // Add the last field
    return fields;
}


export async function parseCsvForReview(
    csvData: string, 
    defaultTipo: QuestionTipo, 
    defaultOrigem: QuestionOrigem,
    dataSource: IDataSource
): Promise<{ questoes: ParsedQuestao[], log: string[] }> {
    
    const lines = csvData.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) {
        throw new Error("O CSV precisa ter pelo menos uma linha de cabeçalho e uma linha de dados.");
    }

    const headerLine = lines[0];
    const header = parseCsvLine(headerLine).map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1);
    
    const log: string[] = [];
    const parsedQuestoes: ParsedQuestao[] = [];

    const getColumn = (row: string[], name: string) => {
        const index = header.indexOf(name);
        return index > -1 ? row[index]?.trim().replace(/^"|"$/g, '') : undefined;
    }

    // Pre-fetch all disciplinas to check for existence
    const allDisciplinas = await dataSource.list<Disciplina>('disciplinas');
    const disciplinaMap = new Map(allDisciplinas.map(d => [d.nome.toLowerCase(), d]));
    const newDisciplinas = new Set<string>();
    const newTopicos = new Set<string>(); // key: disciplinaName-topicoName
    
    for (let i = 0; i < rows.length; i++) {
        if (!rows[i]) continue;
        const rowData = parseCsvLine(rows[i]);
        const disciplinaNome = getColumn(rowData, 'disciplina');
        const topicoNome = getColumn(rowData, 'tópico da disciplina');
        const subtópicoNome = getColumn(rowData, 'subtópico');
        const enunciado = getColumn(rowData, 'questão');

        if (!disciplinaNome || !topicoNome || !enunciado) {
            log.push(`AVISO: Linha ${i + 2} ignorada por falta de 'disciplina', 'tópico da disciplina' ou 'questão'.`);
            continue;
        }

        // Log new disciplinas and topicos
        const disciplinaNomeLower = disciplinaNome.toLowerCase();
        if (!disciplinaMap.has(disciplinaNomeLower) && !newDisciplinas.has(disciplinaNomeLower)) {
            log.push(`[Nova Disciplina] Será criada: ${disciplinaNome}`);
            newDisciplinas.add(disciplinaNomeLower);
        }
        
        const topicoKey = `${disciplinaNomeLower}-${topicoNome.toLowerCase()}`;
        if (!newTopicos.has(topicoKey)) {
             // We can't check for existing topics perfectly without their IDs, so we just log the intent to create.
             // The backend logic will handle finding or creating.
             log.push(`[Novo Tópico] Será criado (ou encontrado): ${topicoNome}`);
             newTopicos.add(topicoKey);
        }

        if (subtópicoNome) {
             const subtopicoKey = `${disciplinaNomeLower}-${subtópicoNome.toLowerCase()}`;
             if(!newTopicos.has(subtopicoKey)) {
                 log.push(`[Novo Subtópico] Será criado (ou encontrado): ${subtópicoNome}`);
                 newTopicos.add(subtopicoKey);
             }
        }


        const alternativas = header.filter(h => h.startsWith('alternativa_')).map(h => getColumn(rowData, h)).filter(Boolean) as string[];
        
        const questao: ParsedQuestao = {
            disciplinaId: '', // Will be resolved on save
            topicoId: '', // Will be resolved on save
            disciplinaNome: disciplinaNome,
            topicoNome: topicoNome,
            subtopicoNome: subtópicoNome,
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
