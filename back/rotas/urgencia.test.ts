import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { contexto, cookie, importarFixture, prepararRotas, requisicao } from "@/back/testes/rotas";
import { arquivar, concluir, historico, importar, marcar } from "@/back/servidor/repositorio";
import { gerarXlsx } from "@/compartilhado/testes/planilha";
import { importar as lerCarga } from "@/front/planilha/importar";
import { lerPlanilha } from "@/front/planilha/ler";
import { PUT } from "./urgencia";

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

type Papel = "equipe" | "dono";
const definir = async (corpo: unknown, papel: Papel | null = "dono", codigo = "100002") =>
  PUT(requisicao(`/api/pacotes/${codigo}/urgencia`, { method: "PUT", corpo, cookie: papel ? await cookie(papel) : undefined }), contexto(codigo));
const urgente = async (r: Response) => (await r.json()).pacote.urgente;
const tipos = async () => (await historico(banco, "100002")).map((e) => e.tipo).filter((t) => t.includes("urgente"));

describe("/api/pacotes/:codigo/urgencia", () => {
  it("401, 403 para a equipe, 404 e 400 com corpo inválido", async () => {
    expect((await definir({ urgente: true }, null)).status).toBe(401);
    expect((await definir({ urgente: true }, "equipe")).status).toBe(403);
    expect((await definir({ urgente: true }, "dono", "777")).status).toBe(404);
    expect((await definir({ urgente: "sim" })).status).toBe(400);
    expect((await definir({})).status).toBe(400);
  });

  it("marca e desmarca com evento; o mesmo valor não gera evento; reimportar mantém", async () => {
    expect(await urgente(await definir({ urgente: true }))).toBe(true);
    await definir({ urgente: true });
    await importar(banco, "Maria", lerCarga(lerPlanilha(gerarXlsx())));
    expect(await urgente(await definir({ urgente: false }))).toBe(false);
    expect(await tipos()).toEqual(["pacote_nao_urgente", "pacote_urgente"]);
  });

  it("409 em card arquivado ou concluído; arquivar e concluir tiram a urgência", async () => {
    await definir({ urgente: true });
    await arquivar(banco, "100002");
    expect((await definir({ urgente: true })).status).toBe(409);
    await definir({ urgente: true }, "dono", "100001");
    await marcar(banco, "100001", "Ana", ["9001", "9002", "9003", "9004", "9005"]);
    expect((await concluir(banco, "100001")).urgente).toBe(false);
    expect((await definir({ urgente: true }, "dono", "100001")).status).toBe(409);
    const [l] = await banco.consulta<{ n: number }>("SELECT count(*)::int AS n FROM pacotes WHERE urgente");
    expect(l.n).toBe(0);
  });
});
