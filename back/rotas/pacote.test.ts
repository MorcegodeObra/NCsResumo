import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { contexto, cookie, importarFixture, prepararRotas, requisicao } from "@/back/testes/rotas";
import { DELETE } from "./pacote";

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

const apagar = async (papel: "equipe" | "dono" | null, codigo = "100002") =>
  DELETE(requisicao(`/api/pacotes/${codigo}`, { method: "DELETE", cookie: papel ? await cookie(papel) : undefined }), contexto(codigo));
const codigos = async () => (await banco.consulta<{ codigo: string }>("SELECT codigo FROM pacotes ORDER BY codigo")).map((p) => p.codigo);

describe("DELETE /api/pacotes/:codigo", () => {
  it("401 sem sessão e 403 para a equipe, sem apagar nada", async () => {
    expect((await apagar(null)).status).toBe(401);
    expect((await apagar("equipe")).status).toBe(403);
    expect(await codigos()).toEqual(["100001", "100002"]);
  });
  it("404 para pacote inexistente", async () => {
    expect((await apagar("dono", "777")).status).toBe(404);
  });
  it("dono: 200 e o pacote some", async () => {
    const r = await apagar("dono");
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
    expect(await codigos()).toEqual(["100001"]);
  });
});
