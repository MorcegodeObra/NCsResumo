import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { contexto, cookie, importarFixture, prepararRotas, requisicao } from "@/back/testes/rotas";
import { PUT } from "./ajustes";

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

const put = async (corpo: unknown, papel: "equipe" | "dono" | null = "equipe", codigo = "100001") =>
  PUT(requisicao(`/api/pacotes/${codigo}/ajustes`, { method: "PUT", corpo, cookie: papel ? await cookie(papel) : undefined }), contexto(codigo));

describe("PUT /api/pacotes/:codigo/ajustes", () => {
  it("401 sem sessão; 404 para pacote inexistente", async () => {
    expect((await put({ autor: "Ana", pacote: { equipes: "X" } }, null)).status).toBe(401);
    expect((await put({ autor: "Ana", pacote: { equipes: "X" } }, "equipe", "777")).status).toBe(404);
  });
  it.each([
    ["sem autor", { pacote: { equipes: "X" } }],
    ["nada mudou", { autor: "Ana" }],
    ["campo desconhecido", { autor: "Ana", pacote: { codigo: "1" } }],
    ["campo que não é texto", { autor: "Ana", pacote: { equipes: 1 } }],
    ["texto longo demais", { autor: "Ana", pacote: { bloco: "x".repeat(121) } }],
    ["prazo inexistente", { autor: "Ana", pacote: { prazo: "2026-02-31" } }],
    ["pacote não é objeto", { autor: "Ana", pacote: ["x"] }],
    ["ncs não é lista", { autor: "Ana", ncs: {} }],
    ["NC sem id", { autor: "Ana", ncs: [{ descricao: "x" }] }],
    ["NC repetida", { autor: "Ana", ncs: [{ id: "9001", descricao: "x" }, { id: "9001", sublocal: "y" }] }],
  ])("400: %s", async (_, corpo) => expect((await put(corpo)).status).toBe(400));

  it("equipe e dono editam; devolve o pacote editado", async () => {
    const r = await put({ autor: "Ana", pacote: { equipes: " Alfa  Construções ", prazo: "2026-12-01" }, ncs: [{ id: "9001", sublocal: "AP 7" }] });
    expect(r.status).toBe(200);
    const { pacote } = await r.json();
    expect(pacote).toMatchObject({ equipes: "Alfa Construções", prazo: "2026-12-01" });
    expect(pacote.ncs.find((n: any) => n.id === "9001").sublocal).toBe("AP 7");
    expect((await put({ autor: "Dono", pacote: { tarefa: "Reboco" } }, "dono")).status).toBe(200);
  });
});
