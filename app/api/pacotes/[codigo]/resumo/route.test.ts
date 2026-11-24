import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { contexto, cookie, importarFixture, prepararRotas, requisicao } from "@/tests/rotas";
import { maxDuration, POST } from "./route";

let banco: Awaited<ReturnType<typeof prepararRotas>>;
const ia = vi.fn();
beforeEach(async () => {
  banco = await prepararRotas();
  await importarFixture(banco);
  vi.stubEnv("LLM_API_KEY", "chave");
  vi.spyOn(console, "error").mockImplementation(() => {});
  ia.mockReset();
  vi.stubGlobal("fetch", ia);
});
afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  await banco.fechar();
});

const responder = (conteudo: unknown) => ia.mockResolvedValue(Response.json({ choices: [{ message: { content: JSON.stringify(conteudo) } }] }));
const post = async (papel: "equipe" | "dono" | null, codigo = "100001") =>
  POST(requisicao(`/api/pacotes/${codigo}/resumo`, { method: "POST", cookie: papel ? await cookie(papel) : undefined }), contexto(codigo));
const gravado = () => banco.consulta("SELECT 1 FROM pacotes WHERE resumo_ia IS NOT NULL");

describe("POST /api/pacotes/:codigo/resumo", () => {
  it("401 sem sessão e 403 para a equipe, sem chamar a IA (SC-005)", async () => {
    expect((await post(null)).status).toBe(401);
    expect((await post("equipe")).status).toBe(403);
    expect(ia).not.toHaveBeenCalled();
    expect(maxDuration).toBe(60);
  });

  it("404 para pacote inexistente", async () => {
    expect((await post("dono", "777")).status).toBe(404);
  });

  it("200 com o resumo válido gravado", async () => {
    responder({ linhas: [{ texto: "Esquadro e plano", ncs: ["n1", "n2", "n3", "n4", "n5"] }] });
    const r = await post("dono");
    expect(r.status).toBe(200);
    const corpo = await r.json();
    expect(corpo.aviso).toBeUndefined();
    expect(corpo.pacote).toMatchObject({ resumoIA: true, linhas: [{ texto: "Esquadro e plano (AP 1-2-8, HALL A-B) ×5" }] });
    expect(await gravado()).toHaveLength(1);
  });

  it("resposta que esquece uma NC: 200 com aviso, resumo local e nada gravado", async () => {
    responder({ linhas: [{ texto: "Esquadro", ncs: ["n1", "n2"] }] });
    const r = await post("dono");
    expect(r.status).toBe(200);
    const corpo = await r.json();
    expect(corpo.aviso).toMatch(/O card não mudou/);
    expect(corpo.pacote.resumoIA).toBe(false);
    expect(await gravado()).toEqual([]);
  });

  it("IA fora do ar ou sem chave: 200 com aviso, sem vazar o erro da API", async () => {
    ia.mockResolvedValue(new Response("segredo interno", { status: 500 }));
    const { aviso } = await (await post("dono")).json();
    expect(aviso).toMatch(/O card não mudou/);
    expect(aviso).not.toContain("segredo");
    vi.stubEnv("LLM_API_KEY", "");
    expect((await (await post("dono")).json()).aviso).toMatch(/LLM_API_KEY/);
    expect(await gravado()).toEqual([]);
  });
});
