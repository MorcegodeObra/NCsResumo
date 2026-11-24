import "server-only";
// Acesso ao banco (data-model.md). Toda mudança gera evento; a importação não toca em
// marcacoes nem comentarios (Princípio V).
import { situacaoNC } from "@/lib/dominio/situacao";
import { montarVisao } from "@/lib/dominio/visao";
import type { CargaImportacao, ComentarioVisao, Contagens, EventoVisao, LinhaCard, NCImportada, PacoteVisao } from "@/lib/dominio/tipos";
import type { Banco, Consultor } from "./banco";
import { ErroHttp } from "./http";

const AUTOR_IMPORTACAO = "importação";
const AUTOR_DONO = "dono";
const TRAVA_IMPORTACAO = 4242_0001;

// Formatos de saída fixos, iguais no Postgres e no PGlite.
const ISO_UTC = (col: string) => `to_char(${col} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
const COLUNAS_NC = `id, codigo_pacote, id_item, item, origem, tipo, descricao, sublocal,
  to_char(prazo, 'YYYY-MM-DD') AS prazo, to_char(data_correcao, 'YYYY-MM-DD') AS data_correcao,
  situacao_item, to_char(ultima_inspecao, 'YYYY-MM-DD"T"HH24:MI:SS') AS ultima_inspecao`;

type LinhaNC = {
  id: string; codigo_pacote: string; id_item: string; item: string; origem: "fvs" | "fiscalizacao"; tipo: string;
  descricao: string; sublocal: string; prazo: string | null; data_correcao: string | null; situacao_item: string;
  ultima_inspecao: string | null;
};
const paraNC = (l: LinhaNC): NCImportada => ({
  id: l.id, codigoPacote: l.codigo_pacote, idItem: l.id_item, item: l.item, origem: l.origem, tipo: l.tipo,
  descricao: l.descricao, sublocal: l.sublocal, prazo: l.prazo, dataCorrecao: l.data_correcao,
  situacaoItem: l.situacao_item, ultimaInspecao: l.ultima_inspecao,
});

type Evento = { codigo: string; idNc: string | null; tipo: string; detalhe: object; autor: string };
async function gravarEventos(tx: Consultor, evs: Evento[]) {
  if (!evs.length) return;
  await tx.consulta(
    `INSERT INTO eventos (codigo_pacote, id_nc, tipo, detalhe, autor)
     SELECT c, i, t, d::jsonb, a FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[]) AS e(c, i, t, d, a)`,
    [evs.map((e) => e.codigo), evs.map((e) => e.idNc), evs.map((e) => e.tipo), evs.map((e) => JSON.stringify(e.detalhe)), evs.map((e) => e.autor)],
  );
}

/** Importação diária, tudo ou nada (data-model.md, "Transições de importação"). */
export async function importar(banco: Banco, autor: string, carga: CargaImportacao): Promise<Contagens> {
  return banco.transacao(async (tx) => {
    await tx.consulta(`SELECT pg_advisory_xact_lock(${TRAVA_IMPORTACAO})`);

    const pacotesAntes = new Map(
      (await tx.consulta<{ codigo: string; saiu: boolean }>("SELECT codigo, saiu_em IS NOT NULL AS saiu FROM pacotes")).map((p) => [p.codigo, p.saiu]),
    );
    const marcadas = new Set((await tx.consulta<{ id_nc: string }>("SELECT id_nc FROM marcacoes")).map((m) => m.id_nc));
    const ncsAntes = new Map(
      (await tx.consulta<LinhaNC>(`SELECT ${COLUNAS_NC} FROM ncs`)).map((l) => [l.id, situacaoNC(paraNC(l), marcadas.has(l.id))]),
    );

    const ps = carga.pacotes;
    await tx.consulta(
      `INSERT INTO pacotes (codigo, tarefa, bloco, pavimento, equipes)
       SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[])
       ON CONFLICT (codigo) DO UPDATE SET tarefa = excluded.tarefa, bloco = excluded.bloco,
         pavimento = excluded.pavimento, equipes = excluded.equipes, saiu_em = NULL, atualizado_em = now()`,
      [ps.map((p) => p.codigo), ps.map((p) => p.tarefa), ps.map((p) => p.bloco), ps.map((p) => p.pavimento), ps.map((p) => p.equipes)],
    );

    const ns = carga.ncs;
    const col = <K extends keyof NCImportada>(k: K) => ns.map((n) => n[k]);
    await tx.consulta(
      `INSERT INTO ncs (id, codigo_pacote, id_item, item, origem, tipo, descricao, sublocal, prazo, data_correcao, situacao_item, ultima_inspecao)
       SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[],
                            $9::date[], $10::date[], $11::text[], $12::timestamp[])
       ON CONFLICT (id) DO UPDATE SET codigo_pacote = excluded.codigo_pacote, id_item = excluded.id_item, item = excluded.item,
         origem = excluded.origem, tipo = excluded.tipo, descricao = excluded.descricao, sublocal = excluded.sublocal,
         prazo = excluded.prazo, data_correcao = excluded.data_correcao, situacao_item = excluded.situacao_item,
         ultima_inspecao = excluded.ultima_inspecao, atualizado_em = now()`,
      [col("id"), col("codigoPacote"), col("idItem"), col("item"), col("origem"), col("tipo"), col("descricao"), col("sublocal"),
       col("prazo"), col("dataCorrecao"), col("situacaoItem"), col("ultimaInspecao")],
    );

    const saidos = (
      await tx.consulta<{ codigo: string }>(
        "UPDATE pacotes SET saiu_em = now() WHERE saiu_em IS NULL AND NOT (codigo = ANY($1::text[])) RETURNING codigo",
        [ps.map((p) => p.codigo)],
      )
    ).map((p) => p.codigo);

    const evs: Evento[] = [];
    const ev = (codigo: string, tipo: string, idNc: string | null = null, detalhe: object = {}) =>
      evs.push({ codigo, idNc, tipo, detalhe, autor: AUTOR_IMPORTACAO });
    const novos = ps.filter((p) => !pacotesAntes.has(p.codigo));
    const voltaram = ps.filter((p) => pacotesAntes.get(p.codigo) === true);
    novos.forEach((p) => ev(p.codigo, "pacote_entrou"));
    voltaram.forEach((p) => ev(p.codigo, "pacote_voltou"));
    saidos.forEach((c) => ev(c, "pacote_saiu"));
    let ncsNovas = 0;
    let ncsMudaram = 0;
    for (const n of ns) {
      const depois = situacaoNC(n, marcadas.has(n.id));
      const antes = ncsAntes.get(n.id);
      if (antes === undefined) {
        ncsNovas++;
        ev(n.codigoPacote, "nc_entrou", n.id, { situacao: depois });
      } else if (antes !== depois) {
        ncsMudaram++;
        ev(n.codigoPacote, "nc_situacao_mudou", n.id, { antes, depois });
      }
    }
    await gravarEventos(tx, evs);

    const contagens: Contagens = {
      pacotes: ps.length, novos: novos.length, saidos: saidos.length, voltaram: voltaram.length,
      ncs: ns.length, ncsNovas, ncsMudaram,
    };
    await tx.consulta("INSERT INTO importacoes (autor, contagens) VALUES ($1, $2::text::jsonb)", [autor, JSON.stringify(contagens)]);
    return contagens;
  });
}

type LinhaPacote = {
  codigo: string; tarefa: string; bloco: string; pavimento: string; equipes: string; saiu_em: string | null;
  resumo_ia: LinhaCard[] | null; resumo_assinatura: string | null;
};

async function visoes(banco: Consultor, filtro = "", params: unknown[] = []): Promise<PacoteVisao[]> {
  const pacotes = await banco.consulta<LinhaPacote>(
    `SELECT codigo, tarefa, bloco, pavimento, equipes, ${ISO_UTC("saiu_em")} AS saiu_em, resumo_ia, resumo_assinatura FROM pacotes ${filtro}`,
    params,
  );
  const codigos = pacotes.map((p) => p.codigo);
  const ncs = (await banco.consulta<LinhaNC>(`SELECT ${COLUNAS_NC} FROM ncs WHERE codigo_pacote = ANY($1::text[]) ORDER BY id`, [codigos])).map(paraNC);
  const marcacoes = Object.fromEntries(
    (await banco.consulta<{ id_nc: string; autor: string }>(
      "SELECT m.id_nc, m.autor FROM marcacoes m JOIN ncs n ON n.id = m.id_nc WHERE n.codigo_pacote = ANY($1::text[])",
      [codigos],
    )).map((m) => [m.id_nc, m.autor]),
  );
  const comentarios = await banco.consulta<ComentarioVisao & { codigo_pacote: string }>(
    `SELECT codigo_pacote, autor, texto, ${ISO_UTC("em")} AS em FROM comentarios WHERE codigo_pacote = ANY($1::text[]) ORDER BY id`,
    [codigos],
  );
  return pacotes
    .map((p) =>
      montarVisao(
        { codigo: p.codigo, tarefa: p.tarefa, bloco: p.bloco, pavimento: p.pavimento, equipes: p.equipes, saiuEm: p.saiu_em },
        ncs.filter((n) => n.codigoPacote === p.codigo),
        {
          marcacoes,
          comentarios: comentarios.filter((c) => c.codigo_pacote === p.codigo).map(({ autor, texto, em }) => ({ autor, texto, em })),
          resumo: p.resumo_ia && p.resumo_assinatura ? { linhas: p.resumo_ia, assinatura: p.resumo_assinatura } : null,
        },
      ),
    )
    .sort((a, b) => a.bloco.localeCompare(b.bloco, "pt-BR", { numeric: true }) || a.codigo.localeCompare(b.codigo));
}

export const listarPacotes = (banco: Banco) => visoes(banco);

/** Visão de um pacote; 404 se ele não existe. */
export async function buscarPacote(banco: Consultor, codigo: string): Promise<PacoteVisao> {
  const [p] = await visoes(banco, "WHERE codigo = $1", [codigo]);
  if (!p) throw new ErroHttp(404, "Pacote não encontrado.");
  return p;
}

/** Mudança da equipe nas marcações: só gera evento para as linhas que de fato mudaram. */
async function mudarMarcacoes(banco: Banco, codigo: string, autor: string, tipo: string, sql: string, params: unknown[]) {
  return banco.transacao(async (tx) => {
    const mudaram = await tx.consulta<{ id_nc: string }>(sql, params);
    await gravarEventos(tx, mudaram.map((m) => ({ codigo, idNc: m.id_nc, tipo, detalhe: {}, autor })));
    return buscarPacote(tx, codigo);
  });
}

export const marcar = (banco: Banco, codigo: string, autor: string, ncs: string[]) =>
  mudarMarcacoes(
    banco, codigo, autor, "nc_marcada",
    // ORDER BY: duas marcações simultâneas travam as linhas na mesma ordem.
    `INSERT INTO marcacoes (id_nc, autor)
     SELECT id, $3::text FROM ncs WHERE codigo_pacote = $1 AND id = ANY($2::text[]) ORDER BY id
     ON CONFLICT (id_nc) DO NOTHING RETURNING id_nc`,
    [codigo, ncs, autor],
  );

export const desmarcar = (banco: Banco, codigo: string, autor: string, ncs: string[]) =>
  mudarMarcacoes(
    banco, codigo, autor, "nc_desmarcada",
    `DELETE FROM marcacoes m USING ncs n
     WHERE n.id = m.id_nc AND n.codigo_pacote = $1 AND m.id_nc = ANY($2::text[]) RETURNING m.id_nc`,
    [codigo, ncs],
  );

export async function comentar(banco: Banco, codigo: string, autor: string, texto: string): Promise<PacoteVisao> {
  return banco.transacao(async (tx) => {
    await buscarPacote(tx, codigo);
    await tx.consulta("INSERT INTO comentarios (codigo_pacote, autor, texto) VALUES ($1, $2, $3)", [codigo, autor, texto]);
    await gravarEventos(tx, [{ codigo, idNc: null, tipo: "comentario", detalhe: { texto }, autor }]);
    return buscarPacote(tx, codigo);
  });
}

/** Os 200 eventos mais novos; funciona também para pacote excluído (eventos não têm FK). */
export async function historico(banco: Consultor, codigo: string): Promise<EventoVisao[]> {
  const evs = await banco.consulta<EventoVisao>(
    `SELECT tipo, id_nc AS "idNc", detalhe, autor, ${ISO_UTC("em")} AS em FROM eventos WHERE codigo_pacote = $1 ORDER BY id DESC LIMIT 200`,
    [codigo],
  );
  if (!evs.length) throw new ErroHttp(404, "Pacote não encontrado.");
  return evs;
}

/** Grava o resumo da IA, já validado, com a assinatura das NCs que ele cobre. */
export async function salvarResumo(banco: Banco, codigo: string, linhas: LinhaCard[], assinatura: string): Promise<PacoteVisao> {
  return banco.transacao(async (tx) => {
    await tx.consulta(
      "UPDATE pacotes SET resumo_ia = $2::text::jsonb, resumo_assinatura = $3, resumo_em = now() WHERE codigo = $1",
      [codigo, JSON.stringify(linhas), assinatura],
    );
    const pacote = await buscarPacote(tx, codigo);
    await gravarEventos(tx, [{ codigo, idNc: null, tipo: "resumo_ia_gerado", detalhe: { linhas: linhas.length }, autor: AUTOR_DONO }]);
    return pacote;
  });
}

/** Exclusão definitiva: NCs, marcações e comentários vão junto (cascade); os eventos ficam. */
export async function excluirPacote(banco: Banco, codigo: string): Promise<void> {
  await banco.transacao(async (tx) => {
    const [apagado] = await tx.consulta(
      `DELETE FROM pacotes p WHERE codigo = $1
       RETURNING tarefa, bloco, pavimento,
         (SELECT count(*)::int FROM ncs WHERE codigo_pacote = p.codigo) AS ncs,
         (SELECT count(*)::int FROM marcacoes m JOIN ncs n ON n.id = m.id_nc WHERE n.codigo_pacote = p.codigo) AS marcacoes,
         (SELECT count(*)::int FROM comentarios WHERE codigo_pacote = p.codigo) AS comentarios`,
      [codigo],
    );
    if (!apagado) throw new ErroHttp(404, "Pacote não encontrado.");
    await gravarEventos(tx, [{ codigo, idNc: null, tipo: "pacote_excluido", detalhe: apagado, autor: AUTOR_DONO }]);
  });
}
