-- ============================================================================
-- MIGRAÇÃO: LICENÇA PRÊMIO - ÚLTIMA CERTIDÃO E EDIÇÃO DE FRUIÇÃO
-- ============================================================================
-- Esta migração adiciona suporte para:
-- 1. Marcar a última certidão de licença prêmio
-- 2. Calcular automaticamente o próximo período aquisitivo
-- 3. Editar fruição de licença prêmio
--
-- Instruções:
-- 1. Acesse: https://supabase.com/dashboard/project/lvfzrheblsisqzpbevff/sql
-- 2. Clique em "New query"
-- 3. Cole este SQL abaixo
-- 4. Clique em "Run"
-- ============================================================================

-- Adiciona colunas para Licença Prêmio
ALTER TABLE licenca_premio_certidoes 
ADD COLUMN IF NOT EXISTS eh_ultima BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS proximo_periodo_inicial DATE;

-- Adiciona coluna para Evolução Funcional
ALTER TABLE evolucao_funcional 
ADD COLUMN IF NOT EXISTS eh_ultima BOOLEAN DEFAULT false;

-- ============================================================================
-- RESULTADO ESPERADO:
-- ✅ Coluna 'eh_ultima' adicionada em licenca_premio_certidoes
-- ✅ Coluna 'proximo_periodo_inicial' adicionada em licenca_premio_certidoes
-- ✅ Coluna 'eh_ultima' adicionada em evolucao_funcional
-- ============================================================================
