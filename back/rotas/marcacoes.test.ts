import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { contexto, cookie, importarFixture, prepararRotas, requisicao } from "@/back/testes/rotas";
import { DELETE, POST } from "./marcacoes";

let banco: Awaited<ReturnType<typeof prepararRotas>>;
beforeEach(async () => {
  banco = await prepararRotas();
  await importarFixture(banco);
});
afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  await banco.fechar();
});

const chamar = async (
  rota: typeof POST,
  corpo: unknown,
  { codigo = "100002", logado = true, texto }: { codigo?: string; logado?: boolean; texto?: string } = {},
) =>
  rota(
    requisicao(`/api/pacotes/${codigo}/marcacoes`, { method: "POST", corpo, texto, cookie: logado ? await cookie("equipe") : undefined }),
    contexto(codigo),
  );

describe("/api/pacotes/:codigo/marcacoes", () => {
  it.each([["POST", POST], ["DELETE", DELETE]] as const)("%s: 401, 400 e 404", async (_, rota) => {
    const ok = { autor: "Ana", ncs: ["9102"] };
    expect((await chamar(rota, ok, { logado: false })).status).toBe(401);
    expect((await chamar(rota, { ncs: ["9102"] })).status).toBe(400);
    expect((await chamar(rota, { autor: "Ana", ncs: [] })).status).toBe(400);
    expect((await chamar(rota, undefined, { texto: "{" })).status).toBe(400);
    expect((await chamar(rota, ok, { codigo: "777" })).status).toBe(404);
    expect((await chamar(rota, ok, { codigo: "abc" })).status).toBe(404);
  });

  it("corpo grande demais: 413", async () => {
    expect((await chamar(POST, { autor: "Ana", ncs: ["x".repeat(300_000)] })).status).toBe(413);
  });

  it("POST marca e DELETE desmarca; os dois devolvem o pacote", async () => {
    const r = await chamar(POST, { autor: "Ana", ncs: ["9102"] });
    expect(r.status).toBe(200);
    expect((await r.json()).pacote.ncs.find((n: any) => n.id === "9102")).toMatchObject({ situacao: "corrigida", marcadaPor: "Ana" });
    const d = await chamar(DELETE, { autor: "Ana", ncs: ["9102"] });
    expect((await d.json()).pacote.ncs.find((n: any) => n.id === "9102").situacao).toBe("aberta");
  });
});
