import { Request, Response } from 'express';

export function getHealth(req: Request, res: Response) {
  res.status(200).json({
    status: 'ok',
    service: 'NYAYAI Express Backend',
    timestamp: new Date().toISOString()
  });
}

export function getAIHealth(req: Request, res: Response) {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

  res.status(200).json({
    status: 'ok',
    groqConfigured: !!apiKey && apiKey.length > 5,
    model,
    provider: 'Groq Cloud Serverless LLM Engine'
  });
}
