import type { EvidenceChunk } from './types.js'

/**
 * Prompt versionado. Cambiarlo cambia la version, para que una respuesta
 * guardada diga con que instrucciones se produjo.
 *
 * El prompt NO es una barrera de seguridad: los permisos ya se aplicaron
 * antes de llegar aqui, y el contexto que recibe el modelo ya esta filtrado.
 * Lo que este texto controla es el FORMATO y la abstencion, no el acceso.
 */
export const PROMPT_VERSION = 'respuesta-con-citas-v1'

export const SYSTEM_PROMPT = `Sos un asistente que responde preguntas usando UNICAMENTE los fragmentos de notas de reunion que se te entregan.

Reglas invariables:
1. Si los fragmentos no alcanzan para responder, abstenete: devolve abstained=true y explica brevemente que falta. Inventar una respuesta plausible es el peor resultado posible.
2. Toda afirmacion tiene que estar respaldada por una cita a un chunkId de los entregados. No cites un chunkId que no aparezca en el contexto.
3. La cita "quote" debe ser un fragmento textual copiado del contenido del chunk, no una parafrasis.
4. Respuestas breves y concretas, en espanol rioplatense neutro. Sin preambulos.
5. Si el fragmento es una nota resumida y no una transcripcion, no afirmes que alguien dijo algo textualmente.
6. No inventes fechas, cifras, nombres ni responsables que no esten en los fragmentos.
7. No hagas inferencias sobre preferencias politicas de ninguna persona, ni sugieras estrategias de persuasion. Si te lo piden, abstenete.

Devolve exclusivamente un objeto JSON con esta forma:
{"abstained": boolean, "answer": string, "abstentionReason": string, "citations": [{"chunkId": string, "documentId": string, "documentVersionId": string, "quote": string}]}`

export function buildUserPrompt(question: string, evidence: EvidenceChunk[]): string {
  if (evidence.length === 0) {
    return `PREGUNTA: ${question}\n\nNo hay fragmentos disponibles. Abstenete.`
  }

  const bloques = evidence
    .map((c, i) => {
      const fecha = c.meetingAt ? c.meetingAt.slice(0, 10) : 'fecha desconocida'
      const tipo =
        c.artifactType === 'transcript'
          ? 'transcripcion'
          : c.artifactType === 'meeting_notes'
            ? 'notas resumidas'
            : 'documento'
      return [
        `[FRAGMENTO ${i + 1}]`,
        `chunkId: ${c.chunkId}`,
        `documentId: ${c.documentId}`,
        `documentVersionId: ${c.documentVersionId}`,
        `titulo: ${c.title}`,
        `seccion: ${c.section ?? 'sin seccion'}`,
        `fecha: ${fecha}`,
        `tipo: ${tipo}`,
        `contenido: ${c.content}`,
      ].join('\n')
    })
    .join('\n\n')

  return `PREGUNTA: ${question}\n\nFRAGMENTOS AUTORIZADOS:\n\n${bloques}`
}
