
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

// Configuração otimizada para Supabase Pooler (Supavisor)
// Usando parâmetros separados em vez de connectionString
// DESABILITANDO PREPARED STATEMENTS para evitar problemas com Pooler
export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    host: 'aws-0-sa-east-1.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    user: 'postgres.suuzyqiheohzfigswieo',
    password: 'JoCa1506Sijklm',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: { rejectUnauthorized: false },
    options: '-c statement_timeout=30000',
  });
// Monkey patch para desabilitar prepared statements
const originalQuery = pool.query.bind(pool);
(pool as any).query = function(queryConfig: any, values?: any[], callback?: any) {
  // Se for um prepared statement (tem name), converte para query simples
  if (queryConfig && typeof queryConfig === 'object' && queryConfig.name) {
    const { name, ...rest } = queryConfig;
    return originalQuery(rest, values || [], callback);
  }
  return originalQuery(queryConfig, values || [], callback);
};

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool, {
  logger: process.env.NODE_ENV === "development",
});

// Função helper para executar queries com retry
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 100
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Só faz retry para erros de conexão ou timeout
      if (
        error.code === 'ECONNRESET' ||
        error.code === 'ETIMEDOUT' ||
        error.code === '57P01' || // admin_shutdown
        error.code === '57P02' || // crash_shutdown
        error.code === '08006' || // connection_failure
        error.message?.includes('Connection terminated') ||
        error.message?.includes('timeout')
      ) {
        console.log(`[withRetry] Tentativa ${attempt}/${maxRetries} falhou, tentando novamente em ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
        continue;
      }
      
      // Para outros erros, não faz retry
      throw error;
    }
  }
  
  throw lastError;
}
