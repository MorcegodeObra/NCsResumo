"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import CartaoNC from "@/components/CartaoNC";
import { lerPDF } from "@/lib/pdf";
import { cabecalho, classificar, paginasDeNC } from "@/lib/classify";
import { extrairLocal } from "@/lib/extrairLocal";
import { agruparEmCartoes, aplicarRegraFiscalizacao, limitarLinhas, linhasSemIA } from "@/lib/agrupar";
import { baixar, cartoesParaCSV, cartoesParaTexto, resumoCompleto } from "@/lib/exportar";
import type { Cartao, Documento } from "@/lib/types";

interface PDFEntrada {
  nome: string;
  buffer: ArrayBuffer;
}

async function expandir(arquivos: File[]): Promise<PDFEntrada[]> {
  const saida: PDFEntrada[] = [];
  for (const f of arquivos) {
    const nome = f.name.toLowerCase();
    if (nome.endsWith(".zip")) {
      const zip = await JSZip.loadAsync(await f.arrayBuffer());
      for (const [caminho, entrada] of Object.entries(zip.files)) {
        if (entrada.dir || caminho.startsWith("__MACOSX") || !caminho.toLowerCase().endsWith(".pdf")) continue;
        saida.push({ nome: caminho.split("/").pop() || caminho, buffer: await entrada.async("arraybuffer") });
      }
    } else if (nome.endsWith(".pdf")) {
      saida.push({ nome: f.name, buffer: await f.arrayBuffer() });
    }
  }
  return saida;
}

async function emLote<T>(tarefas: (() => Promise<T>)[], simultaneas: number): Promise<T[]> {
  const resultados: T[] = new Array(tarefas.length);
  let proxima = 0;
  const trabalhador = async () => {
    while (proxima < tarefas.length) {
      const i = proxima++;
      resultados[i] = await tarefas[i]();
    }
  };
  await Promise.all(Array.from({ length: Math.min(simultaneas, tarefas.length) }, trabalhador));
  return resultados;
}

async function lerFicha(i: number, p: PDFEntrada): Promise<Documento> {
  try {
    const paginas = await lerPDF(p.buffer);
    const info = classificar(paginas[0]?.texto ?? "", paginas.map((x) => x.texto).join(" "));
    const base: Documento = { id: `d${i}`, arquivo: p.nome, status: "ok", ...info, ncs: [], resumo: [] };
    const ncPaginas = paginasDeNC(paginas);
    if (!ncPaginas.length) return base;
    const r = extrairLocal(cabecalho(paginas), ncPaginas, p.nome);
    return { ...base, bloco: r.bloco, pavimento: r.pavimento, sublocal: r.sublocal, equipe: r.equipe, ncs: r.ncs };
  } catch (e) {
    return {
      id: `d${i}`, arquivo: p.nome, status: "erro", ncs: [], resumo: [],
      erro: e instanceof Error ? e.message : "Erro ao ler o arquivo.",
    };
  }
}

export default function Pagina() {
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [progresso, setProgresso] = useState("");
  const [aviso, setAviso] = useState("");
  const [pronto, setPronto] = useState(false);
  const [semNC, setSemNC] = useState(0);
  const [soFiscal, setSoFiscal] = useState(false);
  const [usarIA, setUsarIA] = useState(false);
  const [senha, setSenha] = useState("");
  const [arrastando, setArrastando] = useState(false);
  const [copiado, setCopiado] = useState("");
  const [fora, setFora] = useState<Set<string>>(new Set());
  const [aptos, setAptos] = useState<Record<string, string>>({});
  const senhaRef = useRef("");

  useEffect(() => {
    const salva = sessionStorage.getItem("senha-nc") || "";
    setSenha(salva);
    senhaRef.current = salva;
  }, []);
  const mudarSenha = (v: string) => {
    setSenha(v);
    senhaRef.current = v;
    sessionStorage.setItem("senha-nc", v);
  };

  async function pedirResumoIA(c: Cartao): Promise<string[] | null> {
    for (let tentativa = 0; tentativa < 2; tentativa++) {
      try {
        const r = await fetch("/api/resumir", {
          method: "POST",
          headers: { "content-type": "application/json", "x-senha": senhaRef.current },
          body: JSON.stringify({
            servico: c.servico,
            titulo: c.titulo,
            ncs: c.ncs.map((n) => ({ item: n.item, descricao: n.descricao, local: n.local })),
          }),
        });
        const j = await r.json().catch(() => ({}));
        if (r.ok && j.linhas?.length) return j.linhas;
        if (r.status === 401) throw new Error("Senha incorreta ou ausente (a IA foi ignorada).");
      } catch (e) {
        if (e instanceof Error && e.message.startsWith("Senha")) throw e;
      }
      await new Promise((ok) => setTimeout(ok, 2500));
    }
    return null;
  }

  async function resumir() {
    if (!arquivos.length || ocupado) return;
    setOcupado(true);
    setAviso("");
    setPronto(false);
    setCartoes([]);
    setFora(new Set());
    setAptos({});
    try {
      setProgresso("Abrindo arquivos…");
      const pdfs = await expandir(arquivos);
      if (!pdfs.length) {
        setAviso("Nenhum PDF encontrado. Escolha arquivos .pdf ou um .zip com PDFs.");
        return;
      }
      let feitos = 0;
      const docs = await emLote(
        pdfs.map((p, i) => async () => {
          const d = await lerFicha(i, p);
          setProgresso(`Lendo as fichas… ${++feitos}/${pdfs.length}`);
          return d;
        }),
        3
      );
      const base = agruparEmCartoes(docs).map((c) => ({ ...c, linhas: linhasSemIA(c.ncs) }));
      setCartoes(base);
      setSemNC(docs.filter((d) => d.status === "ok" && d.ncs.length === 0).length);
      setPronto(true);
      const erros = docs.filter((d) => d.status === "erro");
      if (erros.length) setAviso(`${erros.length} arquivo(s) não puderam ser lidos: ${erros.map((e) => e.arquivo).join(", ")}`);

      if (usarIA) {
        let i = 0;
        for (const c of base) {
          setProgresso(`Resumindo com IA… ${++i}/${base.length}`);
          try {
            const linhas = await pedirResumoIA(c);
            if (linhas) setCartoes((atual) => atual.map((x) => (x.chave === c.chave ? { ...x, linhas: limitarLinhas(linhas) } : x)));
          } catch (e) {
            setAviso(e instanceof Error ? e.message : "Erro na IA.");
            break;
          }
        }
      }
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setProgresso("");
      setOcupado(false);
    }
  }

  const visiveis = useMemo(() => (soFiscal ? aplicarRegraFiscalizacao(cartoes) : cartoes), [cartoes, soFiscal]);
  const comApto = useMemo(
    () =>
      visiveis.map((c) => {
        const v = (aptos[c.chave] || "").trim();
        if (!c.precisaApto || !v) return c;
        const nome = /^\d+$/.test(v) ? `AP ${v.padStart(2, "0")}` : v.toUpperCase();
        return { ...c, titulo: `${c.titulo} · ${nome}` };
      }),
    [visiveis, aptos]
  );
  const daQualidade = comApto.filter((c) => c.origem === "fvs");
  const daFiscal = comApto.filter((c) => c.origem === "fiscalizacao");
  const selecionados = comApto.filter((c) => !fora.has(c.chave));
  const alternar = (chave: string) =>
    setFora((atual) => {
      const novo = new Set(atual);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });
  const completo = useMemo(() => resumoCompleto(comApto), [comApto]);

  const copiar = async (rotulo: string, texto: string) => {
    await navigator.clipboard.writeText(texto);
    setCopiado(rotulo);
    setTimeout(() => setCopiado(""), 1800);
  };
  const escolher = (lista: FileList | File[] | null) => {
    const f = [...(lista || [])].filter((x) => /\.(pdf|zip)$/i.test(x.name));
    if (f.length) {
      setArquivos(f);
      setPronto(false);
      setCartoes([]);
      setFora(new Set());
      setAptos({});
      setAviso("");
    }
  };

  const item = (c: Cartao) => (
    <div key={c.chave} className={`item ${fora.has(c.chave) ? "fora" : ""}`}>
      <label className="marca no-print">
        <input type="checkbox" checked={!fora.has(c.chave)} onChange={() => alternar(c.chave)} /> Imprimir este card
      </label>
      {c.precisaApto && (
        <div className="apto no-print">
          <small>Arquivo: {c.arquivos.join(", ")}</small>
          <input
            value={aptos[c.chave] || ""}
            onChange={(e) => setAptos((atual) => ({ ...atual, [c.chave]: e.target.value }))}
            placeholder="Digite o apartamento (ex.: 3 ou AP 03)"
          />
        </div>
      )}
      <CartaoNC c={c} />
    </div>
  );

  return (
    <main className="largo">
      <div className="duas">
        <aside className="col esquerda no-print">
          <h1>Resumo de não conformidades</h1>
          <p className="sub">Envie as fichas FVS e de fiscalização e receba o resumo pronto para montar os cards do quadro.</p>

          <label
            className={`passo caixa ${arrastando ? "ativo" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
            onDragLeave={() => setArrastando(false)}
            onDrop={(e) => { e.preventDefault(); setArrastando(false); escolher(e.dataTransfer.files); }}
          >
            <input type="file" accept=".pdf,.zip,application/pdf,application/zip" multiple disabled={ocupado}
              onChange={(e) => { escolher(e.target.files); e.target.value = ""; }} />
            <span className="botao grande">1. Escolher PDF ou ZIP</span>
            <small>
              {arquivos.length
                ? `${arquivos.length} arquivo(s): ${arquivos.map((a) => a.name).join(", ").slice(0, 120)}`
                : "Aceita vários PDFs ou um .zip com as fichas. Toque aqui ou arraste os arquivos."}
            </small>
          </label>

          <div className="passo">
            <button className="botao grande destaque" disabled={!arquivos.length || ocupado} onClick={resumir}>
              {ocupado ? progresso || "Processando…" : "2. Fazer o resumo"}
            </button>
          </div>

          <div className="opcoes">
            <h3>Opções</h3>
            <label>
              <input type="checkbox" checked={soFiscal} onChange={(e) => setSoFiscal(e.target.checked)} /> Se o serviço tem
              fiscalização, ignorar a FVS dele
            </label>
            <label>
              <input type="checkbox" checked={usarIA} disabled={ocupado} onChange={(e) => setUsarIA(e.target.checked)} />{" "}
              Melhorar o resumo dos cards com IA (precisa da chave no servidor)
            </label>
            <label className="senha">
              Senha de acesso (só para a IA)
              <input type="password" value={senha} onChange={(e) => mudarSenha(e.target.value)} placeholder="se o site pedir" />
            </label>
          </div>

          {aviso && <p className="aviso">{aviso}</p>}
        </aside>

        <section className="col direita">
          {!pronto && (
            <div className="espera no-print">
              <p>Os resumos vão aparecer aqui, depois que você escolher os arquivos e clicar em "Fazer o resumo".</p>
            </div>
          )}

          {pronto && visiveis.length > 0 && (
            <>
              <div className="no-print">
                <h2>Cards para o quadro</h2>
                <p className="cinza">
                  Alvenaria sai em um card por apartamento; os outros serviços, em um card só. Desmarque os que não quer
                  imprimir. {selecionados.length} de {visiveis.length} marcados.
                </p>
                <div className="botoes">
                  <button className="botao" onClick={() => setFora(new Set())}>Marcar todos</button>
                  <button className="botao" onClick={() => setFora(new Set(visiveis.map((c) => c.chave)))}>Desmarcar todos</button>
                </div>
                <div className="botoes">
                  <button className="botao" disabled={!selecionados.length} onClick={() => copiar("cards", cartoesParaTexto(selecionados))}>
                    {copiado === "cards" ? "Copiado!" : "Copiar marcados"}
                  </button>
                  <button className="botao" disabled={!selecionados.length} onClick={() => baixar("ncs.csv", cartoesParaCSV(selecionados), "text/csv;charset=utf-8")}>
                    Baixar CSV
                  </button>
                  <button className="botao destaque" disabled={!selecionados.length} onClick={() => window.print()}>
                    Imprimir marcados
                  </button>
                </div>
              </div>
              {daQualidade.length > 0 && (
                <>
                  <h3 className="secao">FVS (qualidade) · {daQualidade.length} card(s)</h3>
                  <div className="grade">{daQualidade.map(item)}</div>
                </>
              )}
              {daFiscal.length > 0 && (
                <>
                  <h3 className="secao">Fiscalização · {daFiscal.length} card(s)</h3>
                  <div className="grade">{daFiscal.map(item)}</div>
                </>
              )}
            </>
          )}

          {pronto && (
            <div className="no-print completo">
              <h2>Resumo completo (texto)</h2>
              <p className="cinza">Todas as NCs, com tipo, prazo e responsável.</p>
              {completo ? (
                <>
                  <textarea readOnly value={completo} rows={14} />
                  <div className="botoes">
                    <button className="botao" onClick={() => copiar("completo", completo)}>
                      {copiado === "completo" ? "Copiado!" : "Copiar texto"}
                    </button>
                  </div>
                </>
              ) : (
                <p className="vazio">Nenhuma NC encontrada nos documentos.</p>
              )}
              {semNC > 0 && <p className="cinza">{semNC} ficha(s) sem NC (nada a tratar).</p>}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
