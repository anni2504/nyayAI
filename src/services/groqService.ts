// Client-Side AI Service Adapter (Delegates to NYAYAI Express Backend API)

import { sendClientChatMessage, sendAdvocateAIChat } from './api';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function generateLegalResponse(
  messages: AIMessage[],
  roleType: 'CLIENT' | 'ADVOCATE'
): Promise<string> {
  const lastMsg = messages[messages.length - 1]?.content || '';

  if (roleType === 'CLIENT') {
    const res = await sendClientChatMessage('case-1', lastMsg);
    return res.reply;
  } else {
    const res = await sendAdvocateAIChat('drafting', lastMsg);
    return res.output;
  }
}
