-- Esquema do MVP (specs/001-mvp-planilha-kanban/data-model.md). Idempotente: pode rodar várias vezes.

-- (a) campos da planilha + (d) resumo da IA
CREATE TABLE IF NOT EXISTS pacotes (
  codigo            text PRIMARY KEY CHECK (codigo ~ '^[0-9]+$'),
  tarefa            text NOT NULL,
  bloco             text NOT NULL,
  pavimento         text NOT NULL,
  equipes           text NOT NULL,
  saiu_em           timestamptz,
  atualizado_em     timestamptz NOT NULL DEFAULT now(),
  resumo_ia         jsonb,
  resumo_assinatura text,
  resumo_em         timestamptz
);

-- (b) possível resolução, escrita só pelo dono; a importação nunca escreve aqui (specs/002)
ALTER TABLE pacotes ADD COLUMN IF NOT EXISTS resolucao text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS ncs (
  id              text PRIMARY KEY,
  codigo_pacote   text NOT NULL REFERENCES pacotes(codigo) ON DELETE CASCADE,
  id_item         text NOT NULL,
  item            text NOT NULL,
  origem          text NOT NULL CHECK (origem IN ('fvs', 'fiscalizacao')),
  tipo            text NOT NULL,
  descricao       text NOT NULL,
  sublocal        text NOT NULL,
  prazo           date,
  data_correcao   date,
  situacao_item   text NOT NULL,
  -- hora local da obra, como vem da planilha (sem fuso)
  ultima_inspecao timestamp,
  atualizado_em   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ncs_codigo_pacote ON ncs (codigo_pacote);

-- (b) acréscimos da equipe; a importação nunca escreve aqui
CREATE TABLE IF NOT EXISTS marcacoes (
  id_nc text PRIMARY KEY REFERENCES ncs(id) ON DELETE CASCADE,
  autor text NOT NULL,
  em    timestamptz NOT NULL DEFAULT now()
);

-- (b) edições da equipe por cima do que veio da planilha; a importação nunca escreve aqui (specs/003)
ALTER TABLE pacotes ADD COLUMN IF NOT EXISTS ajustes jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE ncs     ADD COLUMN IF NOT EXISTS ajustes jsonb NOT NULL DEFAULT '{}'::jsonb;

-- (c) histórico; sem FK para sobreviver à exclusão do pacote
CREATE TABLE IF NOT EXISTS eventos (
  id            bigserial PRIMARY KEY,
  codigo_pacote text NOT NULL,
  id_nc         text,
  tipo          text NOT NULL,
  detalhe       jsonb NOT NULL DEFAULT '{}'::jsonb,
  autor         text NOT NULL,
  em            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS eventos_codigo_pacote ON eventos (codigo_pacote, id DESC);

CREATE TABLE IF NOT EXISTS importacoes (
  id        bigserial PRIMARY KEY,
  autor     text NOT NULL,
  em        timestamptz NOT NULL DEFAULT now(),
  contagens jsonb NOT NULL
);
