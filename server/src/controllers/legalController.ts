// Phase 9 legal-corpus / retrieval / RAG controllers.
import type { NextFunction, Request, Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { LegalStack } from '../services/legalService.js';
import type { LegalSearchRequest, LegalRagResponse } from '../types/legalTypes.js';
import { VdbError } from '../services/vdbClient.js';
import { logger } from '../utils/logger.js';

let stack: LegalStack | null = null;

export function getLegalStack(): LegalStack {
  if (!stack) stack = new LegalStack();
  return stack;
}

function asyncHandler(
  fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req as AuthenticatedRequest, res, next).catch(next);
  };
}

function handleVdbError(res: Response, err: unknown): boolean {
  if (err instanceof VdbError) {
    logger.warn(`Legal endpoint blocked: ${err.message}`);
    res.status(503).json({ status: 'error', error: err.message, code: 'vector_db_unavailable' });
    return true;
  }
  return false;
}

/** GET /legal/health and /legal/corpus/status */
export const handleLegalStatus = asyncHandler(async (_req, res) => {
  const s = await getLegalStack().status();
  res.status(s.status === 'ok' ? 200 : 200).json(s);
});

/** POST /legal/corpus/ingest  (ADVOCATE only) */
export const handleLegalIngest = asyncHandler(async (req, res) => {
  const { scope = 'prefix', key, prefix, keys, country, dryRun = false, config } = req.body || {};
  if (!['one', 'prefix', 'all', 'selected'].includes(scope)) {
    return res.status(400).json({ status: 'error', error: `invalid scope '${scope}'; expected one of one|prefix|all|selected` });
  }
  const stats = await getLegalStack().ingest({
    scope,
    key,
    prefix,
    keys,
    country,
    dryRun: !!dryRun,
    config: config && typeof config === 'object' ? config : undefined
  });
  res.status(stats.status === 'error' ? 400 : 200).json(stats);
});

/** POST /legal/corpus/reindex  (ADVOCATE only) */
export const handleLegalReindex = asyncHandler(async (_req, res) => {
  try {
    const result = await getLegalStack().reindex();
    const status = await getLegalStack().status();
    res.status(200).json({ status: 'ok', rebuilt: result, vectors: status.vdb.vectors ?? 0 });
  } catch (err: unknown) {
    if (handleVdbError(res, err)) return;
    throw err;
  }
});

/** GET /legal/documents */
export const handleLegalDocuments = asyncHandler(async (_req, res) => {
  const stack = getLegalStack();
  await stack.manifest.load();
  const docs = stack.manifest.allDocuments();
  const chunks = stack.manifest.stats().chunks;
  res.status(200).json({ status: 'ok', documents: docs, documentsCount: docs.length, chunks });
});

/** POST /legal/search */
export const handleLegalSearch = asyncHandler(async (req, res) => {
  const body: LegalSearchRequest = (req.body || {}) as LegalSearchRequest;
  if (!body.query || !body.query.trim()) {
    return res.status(400).json({ status: 'error', error: 'query is required' });
  }
  try {
    const result = await getLegalStack().retrieval.retrieve(body);
    res.status(200).json(result);
  } catch (err: unknown) {
    if (handleVdbError(res, err)) return;
    res.status(400).json({ status: 'error', error: (err as Error).message });
  }
});

/** POST /legal/rag */
export const handleLegalRag = asyncHandler(async (req, res) => {
  const { question, topK, filters, provider, ef, index, maxEvidence } = req.body || {};
  if (!question || !question.trim()) {
    return res.status(400).json({ status: 'error', error: 'question is required' });
  }
  try {
    const result: LegalRagResponse = await getLegalStack().rag.ask(question, {
      topK,
      filters,
      provider,
      ef,
      index,
      maxEvidence
    });
    res.status(200).json(result);
  } catch (err: unknown) {
    if (handleVdbError(res, err)) return;
    res.status(400).json({ status: 'error', error: (err as Error).message });
  }
});

/** POST /legal/advocate-cases */
export const handleLegalAdvocateCases = asyncHandler(async (req, res) => {
  const { query, filters, topK } = req.body || {};
  if (!query || !query.trim()) {
    return res.status(400).json({ status: 'error', error: 'query is required' });
  }
  try {
    const result = await getLegalStack().retrieval.retrieveAdvocateCases(query, filters, topK || 20);
    res.status(200).json(result);
  } catch (err: unknown) {
    if (handleVdbError(res, err)) return;
    res.status(400).json({ status: 'error', error: (err as Error).message });
  }
});

export { VdbError };