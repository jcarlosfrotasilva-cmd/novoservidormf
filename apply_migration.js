const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    console.log('Aplicando migração...');
    
    await pool.query(`
      ALTER TABLE licenca_premio_certidoes 
      ADD COLUMN IF NOT EXISTS eh_ultima BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS proximo_periodo_inicial DATE;
    `);
    console.log('✅ Colunas adicionadas em licenca_premio_certidoes');

    await pool.query(`
      ALTER TABLE evolucao_funcional 
      ADD COLUMN IF NOT EXISTS eh_ultima BOOLEAN DEFAULT false;
    `);
    console.log('✅ Coluna adicionada em evolucao_funcional');

    console.log('✅ Migração concluída com sucesso!');
    await pool.end();
  } catch (err) {
    console.error('Erro:', err.message);
    process.exit(1);
  }
}

run();
