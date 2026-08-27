export const logger = {
  info: (msg: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[NYAYAI ${timestamp}] INFO: ${msg}`, meta ? JSON.stringify(meta) : '');
  },
  warn: (msg: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    console.warn(`[NYAYAI ${timestamp}] WARN: ${msg}`, meta ? JSON.stringify(meta) : '');
  },
  error: (msg: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    console.error(`[NYAYAI ${timestamp}] ERROR: ${msg}`, meta ? JSON.stringify(meta) : '');
  }
};
