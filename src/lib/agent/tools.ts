import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { findRelevantChunks } from "@/lib/rag";

export interface AgentToolUrls {
  add(url: string): void;
}

export function buildAgentTools(collectedUrls: AgentToolUrls) {
  return {
    searchExtranjeriaCorpus: tool({
      description:
        "Busca en el corpus oficial de extranjería (BOE / sede.gob.es / SEPE) los fragmentos más relevantes para una consulta. Úsalo siempre antes de responder cualquier afirmación factual.",
      inputSchema: z.object({
        query: z.string().min(1).describe("Consulta en lenguaje natural"),
        k: z.number().int().min(1).max(10).default(5).optional(),
      }),
      execute: async ({ query, k }) => {
        const limit = Math.min(Math.max(k ?? 5, 1), 10);
        const results = await findRelevantChunks(query, limit);
        const chunks = results.map((r) => {
          collectedUrls.add(r.document.url);
          return {
            content: r.content,
            documentId: r.documentId,
            documentTitle: r.document.title,
            documentUrl: r.document.url,
            score: r.similarity,
          };
        });
        return { chunks };
      },
    }),

    listRecentDocumentChanges: tool({
      description:
        "Lista los documentos cuya información oficial ha cambiado recientemente. Úsalo cuando el usuario pregunte por novedades, actualizaciones, cambios o 'lo nuevo' en normativa o residencia.",
      inputSchema: z.object({
        sinceDays: z.number().int().min(1).max(365).default(30).optional(),
      }),
      execute: async ({ sinceDays }) => {
        const days = sinceDays ?? 30;
        if (days < 1 || days > 365) {
          return { error: "sinceDays must be between 1 and 365", documents: [] };
        }
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const docs = await prisma.document.findMany({
          where: { updatedAt: { gte: since } },
          orderBy: { updatedAt: "desc" },
          take: 20,
          select: { id: true, title: true, url: true, updatedAt: true },
        });
        for (const d of docs) collectedUrls.add(d.url);
        return {
          sinceDays: days,
          documents: docs.map((d) => ({
            id: d.id,
            title: d.title,
            url: d.url,
            updatedAt: d.updatedAt.toISOString(),
          })),
        };
      },
    }),

    fetchDocumentDetail: tool({
      description:
        "Devuelve los metadatos completos de un documento por su id, para citar la fuente con título y URL canónicos.",
      inputSchema: z.object({
        documentId: z.string().min(1),
      }),
      execute: async ({ documentId }) => {
        const doc = await prisma.document.findUnique({
          where: { id: documentId },
          select: { id: true, title: true, url: true, updatedAt: true, content: true },
        });
        if (!doc) return { error: "not_found" as const };
        collectedUrls.add(doc.url);
        return {
          id: doc.id,
          title: doc.title,
          url: doc.url,
          updatedAt: doc.updatedAt.toISOString(),
          summary: doc.content.slice(0, 500),
        };
      },
    }),
  };
}
