import "server-only";
// Acesso ao banco (data-model.md). Toda mudança gera evento; a importação não toca em
// marcacoes, resolucao nem ajustes (Princípio V).
import { situacaoNC } from "@/back/dominio/situacao";
import { montarVisao } from "@/back/dominio/visao";
import type { AjustesPacote, CampoPacote, Categoria, CargaImportacao, Contagens, EventoVisao, LinhaCard, NCImportada, PacoteVisao } from "@/compartilhado/dominio/tipos";
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
    await derrubarConclusoes(tx, [...pacotesAntes.keys()], AUTOR_IMPORTACAO);

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
  resolucao: string; concluido_em: string | null; concluido_ncs: string[];
  arquivado_em: string | null; arquivado_ncs: string[]; urgente: boolean; categoria: Categoria | null;
  ajustes: Partial<Record<CampoPacote, string>>;
};

async function visoes(banco: Consultor, filtro = "", params: unknown[] = []): Promise<PacoteVisao[]> {
  const pacotes = await banco.consulta<LinhaPacote>(
    `SELECT codigo, tarefa, bloco, pavimento, equipes, ${ISO_UTC("saiu_em")} AS saiu_em, resumo_ia, resumo_assinatura, resolucao,
       ${ISO_UTC("concluido_em")} AS concluido_em, concluido_ncs, ${ISO_UTC("arquivado_em")} AS arquivado_em, arquivado_ncs, urgente,
       categoria, ajustes FROM pacotes ${filtro}`,
    params,
  );
  const codigos = pacotes.map((p) => p.codigo);
  const ncs = (
    await banco.consulta<LinhaNC & { ajustes: { descricao?: string; sublocal?: string }; arquivada_em: string | null; criada_em: string }>(
      `SELECT ${COLUNAS_NC}, ajustes, ${ISO_UTC("arquivada_em")} AS arquivada_em, ${ISO_UTC("criada_em")} AS criada_em
       FROM ncs WHERE codigo_pacote = ANY($1::text[]) ORDER BY id`,
      [codigos],
    )
  ).map((l) => ({ ...paraNC(l), ...l.ajustes, arquivadaEm: l.arquivada_em, criadaEm: l.criada_em }));
  const arquivadas = Object.fromEntries(ncs.filter((n) => n.arquivadaEm).map((n) => [n.id, n.arquivadaEm!]));
  const criadas = Object.fromEntries(ncs.map((n) => [n.id, n.criadaEm]));
  const marcacoes = Object.fromEntries(
    (await banco.consulta<{ id_nc: string; autor: string }>(
      "SELECT m.id_nc, m.autor FROM marcacoes m JOIN ncs n ON n.id = m.id_nc WHERE n.codigo_pacote = ANY($1::text[])",
      [codigos],
    )).map((m) => [m.id_nc, m.autor]),
  );
  return pacotes
    .map(({ ajustes: { prazo, ...ajustes }, ...p }) =>
      montarVisao(
        { codigo: p.codigo, tarefa: p.tarefa, bloco: p.bloco, pavimento: p.pavimento, equipes: p.equipes, saiuEm: p.saiu_em, ...ajustes },
        ncs.filter((n) => n.codigoPacote === p.codigo),
        {
          marcacoes,
          resolucao: p.resolucao,
          prazo,
          conclusao: p.concluido_em ? { em: p.concluido_em, ncs: p.concluido_ncs } : null,
          arquivo: p.arquivado_em ? { em: p.arquivado_em, ncs: p.arquivado_ncs } : null,
          arquivadas,
          criadas,
          urgente: p.urgente,
          categoria: p.categoria,
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

async function apagarConclusao(tx: Consultor, codigo: string, autor: string) {
  const apagadas = await tx.consulta(
    "UPDATE pacotes SET concluido_em = NULL, concluido_ncs = '[]'::jsonb WHERE codigo = $1 AND concluido_em IS NOT NULL RETURNING codigo",
    [codigo],
  );
  if (apagadas.length) await gravarEventos(tx, [{ codigo, idNc: null, tipo: "pacote_reaberto", detalhe: {}, autor }]);
}

async function apagarArquivo(tx: Consultor, codigo: string, autor: string) {
  const apagados = await tx.consulta(
    "UPDATE pacotes SET arquivado_em = NULL, arquivado_ncs = '[]'::jsonb WHERE codigo = $1 AND arquivado_em IS NOT NULL RETURNING codigo",
    [codigo],
  );
  if (apagados.length) await gravarEventos(tx, [{ codigo, idNc: null, tipo: "pacote_desarquivado", detalhe: {}, autor }]);
}

/** Apaga a conclusão e o arquivo do dono que deixaram de valer; senão voltariam sozinhos quando as NCs mudassem de novo. */
async function derrubarConclusoes(tx: Consultor, codigos: string[], autor: string) {
  for (const p of await visoes(tx, "WHERE (concluido_em IS NOT NULL OR arquivado_em IS NOT NULL) AND codigo = ANY($1::text[])", [codigos])) {
    if (p.coluna !== "concluido") await apagarConclusao(tx, p.codigo, autor);
    if (!p.arquivadoEm) await apagarArquivo(tx, p.codigo, autor);
  }
}

/** Conclusão dada pelo dono; só de um pacote em Corrigido. */
export async function concluir(banco: Banco, codigo: string): Promise<PacoteVisao> {
  return banco.transacao(async (tx) => {
    await tx.consulta("SELECT 1 FROM pacotes WHERE codigo = $1 FOR UPDATE", [codigo]);
    const p = await buscarPacote(tx, codigo);
    if (p.coluna !== "corrigido") throw new ErroHttp(409, "Só um pacote em Corrigido pode ser concluído. Atualize a página.");
    await tx.consulta("UPDATE pacotes SET concluido_em = now(), concluido_ncs = $2::text::jsonb, urgente = false, categoria = NULL WHERE codigo = $1", [
      codigo,
      JSON.stringify(p.ncs.map((n) => n.id)),
    ]);
    await gravarEventos(tx, [{ codigo, idNc: null, tipo: "pacote_concluido", detalhe: {}, autor: AUTOR_DONO }]);
    return buscarPacote(tx, codigo);
  });
}

/** Desfaz a conclusão do dono; sem ela, não muda nada. */
export const reabrir = (banco: Banco, codigo: string): Promise<PacoteVisao> =>
  banco.transacao(async (tx) => {
    await apagarConclusao(tx, codigo, AUTOR_DONO);
    return buscarPacote(tx, codigo);
  });

/** Urgência dada pelo dono; o mesmo valor não gera evento. */
export async function definirUrgencia(banco: Banco, codigo: string, urgente: boolean): Promise<PacoteVisao> {
  return banco.transacao(async (tx) => {
    const [l] = await tx.consulta<{ urgente: boolean }>("SELECT urgente FROM pacotes WHERE codigo = $1 FOR UPDATE", [codigo]);
    const p = await buscarPacote(tx, codigo);
    if (urgente && (p.arquivadoEm || p.coluna === "concluido"))
      throw new ErroHttp(409, "Card arquivado ou concluído não pode ser urgente. Atualize a página.");
    if (l.urgente !== urgente) {
      await tx.consulta("UPDATE pacotes SET urgente = $2 WHERE codigo = $1", [codigo, urgente]);
      await gravarEventos(tx, [{ codigo, idNc: null, tipo: urgente ? "pacote_urgente" : "pacote_nao_urgente", detalhe: {}, autor: AUTOR_DONO }]);
    }
    return buscarPacote(tx, codigo);
  });
}

/** Categoria dada pela equipe ou pelo dono (specs/006); o mesmo valor não gera evento. */
export async function definirCategoria(banco: Banco, codigo: string, autor: string, depois: Categoria | null): Promise<PacoteVisao> {
  return banco.transacao(async (tx) => {
    const [l] = await tx.consulta<{ categoria: Categoria | null }>("SELECT categoria FROM pacotes WHERE codigo = $1 FOR UPDATE", [codigo]);
    const p = await buscarPacote(tx, codigo);
    if (depois && (p.arquivadoEm || p.coluna === "concluido"))
      throw new ErroHttp(409, "Card arquivado ou concluído não recebe categoria. Atualize a página.");
    if (l.categoria !== depois) {
      await tx.consulta("UPDATE pacotes SET categoria = $2 WHERE codigo = $1", [codigo, depois]);
      await gravarEventos(tx, [{ codigo, idNc: null, tipo: "categoria_mudou", detalhe: { antes: l.categoria, depois }, autor }]);
    }
    return buscarPacote(tx, codigo);
  });
}

/** Arquivo do card pelo dono (specs/005); cobre as NCs visíveis agora e tira a urgência. */
export async function arquivar(banco: Banco, codigo: string): Promise<PacoteVisao> {
  return banco.transacao(async (tx) => {
    await tx.consulta("SELECT 1 FROM pacotes WHERE codigo = $1 FOR UPDATE", [codigo]);
    const p = await buscarPacote(tx, codigo);
    if (p.arquivadoEm) throw new ErroHttp(409, "O card já está arquivado. Atualize a página.");
    if (!p.ncs.length) throw new ErroHttp(409, "O card não tem NC pendente para arquivar.");
    await tx.consulta("UPDATE pacotes SET arquivado_em = now(), arquivado_ncs = $2::text::jsonb, urgente = false WHERE codigo = $1", [
      codigo,
      JSON.stringify(p.ncs.map((n) => n.id)),
    ]);
    await gravarEventos(tx, [{ codigo, idNc: null, tipo: "pacote_arquivado", detalhe: {}, autor: AUTOR_DONO }]);
    return buscarPacote(tx, codigo);
  });
}

/** Desarquiva o card e as NCs dele, para que ele volte de fato ao kanban. */
export async function desarquivar(banco: Banco, codigo: string): Promise<PacoteVisao> {
  return banco.transacao(async (tx) => {
    await tx.consulta("SELECT 1 FROM pacotes WHERE codigo = $1 FOR UPDATE", [codigo]);
    if (!(await buscarPacote(tx, codigo)).arquivadoEm) throw new ErroHttp(409, "O card não está arquivado. Atualize a página.");
    await apagarArquivo(tx, codigo, AUTOR_DONO);
    const soltas = await tx.consulta<{ id: string }>(
      "UPDATE ncs SET arquivada_em = NULL WHERE codigo_pacote = $1 AND arquivada_em IS NOT NULL RETURNING id",
      [codigo],
    );
    await gravarEventos(tx, soltas.map((n) => ({ codigo, idNc: n.id, tipo: "nc_desarquivada", detalhe: {}, autor: AUTOR_DONO })));
    return buscarPacote(tx, codigo);
  });
}

/** Arquivo de uma NC pelo dono: 404 se ela não é do pacote, 409 se não está no estado esperado. */
async function mudarArquivoNc(banco: Banco, codigo: string, id: string, arquivando: boolean): Promise<PacoteVisao> {
  return banco.transacao(async (tx) => {
    await tx.consulta("SELECT 1 FROM pacotes WHERE codigo = $1 FOR UPDATE", [codigo]);
    const p = await buscarPacote(tx, codigo);
    if (!(await tx.consulta("SELECT 1 FROM ncs WHERE id = $1 AND codigo_pacote = $2", [id, codigo])).length)
      throw new ErroHttp(404, "NC não encontrada neste pacote.");
    if (!(arquivando ? p.ncs : p.arquivadas).some((n) => n.id === id))
      throw new ErroHttp(409, arquivando ? "Só uma NC pendente do card pode ser arquivada." : "A NC não está arquivada. Atualize a página.");
    await tx.consulta(`UPDATE ncs SET arquivada_em = ${arquivando ? "now()" : "NULL"} WHERE id = $1`, [id]);
    await gravarEventos(tx, [{ codigo, idNc: id, tipo: arquivando ? "nc_arquivada" : "nc_desarquivada", detalhe: {}, autor: AUTOR_DONO }]);
    await derrubarConclusoes(tx, [codigo], AUTOR_DONO);
    return buscarPacote(tx, codigo);
  });
}
export const arquivarNc = (banco: Banco, codigo: string, id: string) => mudarArquivoNc(banco, codigo, id, true);
export const desarquivarNc = (banco: Banco, codigo: string, id: string) => mudarArquivoNc(banco, codigo, id, false);

/** Mudança da equipe nas marcações: só gera evento para as linhas que de fato mudaram. */
async function mudarMarcacoes(banco: Banco, codigo: string, autor: string, tipo: string, sql: string, params: unknown[]) {
  return banco.transacao(async (tx) => {
    const mudaram = await tx.consulta<{ id_nc: string }>(sql, params);
    await gravarEventos(tx, mudaram.map((m) => ({ codigo, idNc: m.id_nc, tipo, detalhe: {}, autor })));
    await derrubarConclusoes(tx, [codigo], autor);
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

/** Possível resolução, escrita só pelo dono; texto igual ao guardado não gera evento. */
export async function definirResolucao(banco: Banco, codigo: string, depois: string): Promise<PacoteVisao> {
  return banco.transacao(async (tx) => {
    const [p] = await tx.consulta<{ resolucao: string }>("SELECT resolucao FROM pacotes WHERE codigo = $1 FOR UPDATE", [codigo]);
    if (p && p.resolucao !== depois) {
      await tx.consulta("UPDATE pacotes SET resolucao = $2 WHERE codigo = $1", [codigo, depois]);
      await gravarEventos(tx, [{ codigo, idNc: null, tipo: "resolucao_alterada", detalhe: { antes: p.resolucao, depois }, autor: AUTOR_DONO }]);
    }
    return buscarPacote(tx, codigo);
  });
}

/** Edição da equipe por cima da planilha; os eventos são a diferença do que o card mostrava para o que passou a mostrar. */
export async function ajustar(banco: Banco, codigo: string, autor: string, { pacote, ncs }: AjustesPacote): Promise<PacoteVisao> {
  // Vazio vira null, que sai do jsonb: volta a valer a planilha.
  const json = (campos: object) => JSON.stringify(campos, (_, v) => (v === "" ? null : v));
  return banco.transacao(async (tx) => {
    await tx.consulta("SELECT 1 FROM pacotes WHERE codigo = $1 FOR UPDATE", [codigo]);
    const antes = await buscarPacote(tx, codigo);
    if (!ncs.every((n) => antes.ncs.some((a) => a.id === n.id))) throw new ErroHttp(404, "A NC não está mais neste card.");

    await tx.consulta("UPDATE pacotes SET ajustes = jsonb_strip_nulls(ajustes || $2::text::jsonb) WHERE codigo = $1", [codigo, json(pacote)]);
    await tx.consulta(
      `UPDATE ncs SET ajustes = jsonb_strip_nulls(ncs.ajustes || a.campos::jsonb)
       FROM unnest($1::text[], $2::text[]) AS a(id, campos) WHERE ncs.id = a.id`,
      [ncs.map((n) => n.id), ncs.map(({ id: _, ...campos }) => json(campos))],
    );

    const depois = await buscarPacote(tx, codigo);
    const evs: Evento[] = [];
    for (const campo of ["equipes", "tarefa", "bloco", "pavimento", "prazo"] as const)
      if (antes[campo] !== depois[campo])
        evs.push({ codigo, idNc: null, tipo: "pacote_editado", detalhe: { campo, antes: antes[campo], depois: depois[campo] }, autor });
    for (const { id } of ncs) {
      const a = antes.ncs.find((n) => n.id === id)!;
      const d = depois.ncs.find((n) => n.id === id)!;
      for (const campo of ["descricao", "sublocal"] as const)
        if (a[campo] !== d[campo]) evs.push({ codigo, idNc: id, tipo: "nc_editada", detalhe: { campo, antes: a[campo], depois: d[campo] }, autor });
    }
    await gravarEventos(tx, evs);
    return depois;
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

/** Exclusão definitiva: NCs e marcações vão junto (cascade); os eventos ficam, com a resolução apagada. */
export async function excluirPacote(banco: Banco, codigo: string): Promise<void> {
  await banco.transacao(async (tx) => {
    const [apagado] = await tx.consulta(
      `DELETE FROM pacotes p WHERE codigo = $1
       RETURNING tarefa, bloco, pavimento, resolucao,
         (SELECT count(*)::int FROM ncs WHERE codigo_pacote = p.codigo) AS ncs,
         (SELECT count(*)::int FROM marcacoes m JOIN ncs n ON n.id = m.id_nc WHERE n.codigo_pacote = p.codigo) AS marcacoes`,
      [codigo],
    );
    if (!apagado) throw new ErroHttp(404, "Pacote não encontrado.");
    await gravarEventos(tx, [{ codigo, idNc: null, tipo: "pacote_excluido", detalhe: apagado, autor: AUTOR_DONO }]);
  });
}
