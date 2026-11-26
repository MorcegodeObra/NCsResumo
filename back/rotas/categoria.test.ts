import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { contexto, cookie, importarFixture, prepararRotas, requisicao } from "@/back/testes/rotas";
import { arquivar, concluir, historico, importar, marcar } from "@/back/servidor/repositorio";
import { gerarXlsx } from "@/compartilhado/testes/planilha";
import { importar as lerCarga } from "@/front/planilha/importar";
import { lerPlanilha } from "@/front/planilha/ler";
import { PUT } from "./categoria";

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
const definir = async (corpo: unknown, papel: Papel | null = "equipe", codigo = "100002") =>
  PUT(requisicao(`/api/pacotes/${codigo}/categoria`, { method: "PUT", corpo, cookie: papel ? await cookie(papel) : undefined }), contexto(codigo));
const categoria = async (r: Response) => (await r.json()).pacote.categoria;

describe("/api/pacotes/:codigo/categoria", () => {
  it("401 sem sessão, 404, e 400 sem nome ou com categoria inválida", async () => {
    expect((await definir({ autor: "Ana", categoria: "projeto" }, null)).status).toBe(401);
    expect((await definir({ autor: "Ana", categoria: "projeto" }, "equipe", "777")).status).toBe(404);
    expect((await definir({ categoria: "projeto" })).status).toBe(400);
    expect((await definir({ autor: "Ana", categoria: "outra" })).status).toBe(400);
    expect((await definir({ autor: "Ana" })).status).toBe(400);
  });

  it("a equipe dá e tira a categoria, com o nome no histórico; o mesmo valor não gera evento", async () => {
    expect(await categoria(await definir({ autor: "Ana", categoria: "recorrente" }))).toBe("recorrente");
    await definir({ autor: "Ana", categoria: "recorrente" });
    expect(await categoria(await definir({ autor: "João", categoria: "projeto" }, "dono"))).toBe("projeto");
    expect(await categoria(await definir({ autor: "Ana", categoria: null }))).toBeNull();
    const evs = (await historico(banco, "100002")).filter((e) => e.tipo === "categoria_mudou");
    expect(evs.map((e) => [e.autor, e.detalhe])).toEqual([
      ["Ana", { antes: "projeto", depois: null }],
      ["João", { antes: "recorrente", depois: "projeto" }],
      ["Ana", { antes: null, depois: "recorrente" }],
    ]);
  });

  it("reimportar e marcar NCs mantêm a categoria; concluir pelo dono a tira", async () => {
    await definir({ autor: "Ana", categoria: "recorrente" });
    await importar(banco, "Maria", lerCarga(lerPlanilha(gerarXlsx())));
    expect((await marcar(banco, "100002", "Ana", ["9102", "9103", "9104"])).categoria).toBe("recorrente");
    expect((await concluir(banco, "100002")).categoria).toBeNull();
    expect((await definir({ autor: "Ana", categoria: "projeto" })).status).toBe(409);
  });

  it("409 em card arquivado", async () => {
    await arquivar(banco, "100001");
    expect((await definir({ autor: "Ana", categoria: "projeto" }, "equipe", "100001")).status).toBe(409);
  });
});
