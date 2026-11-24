import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, GET, POST } from "./sessao";

beforeEach(() => {
  vi.stubEnv("SENHA_EQUIPE", "senha-equipe");
  vi.stubEnv("SENHA_DONO", "senha-dono");
  vi.stubEnv("SEGREDO_SESSAO", "s".repeat(40));
});
afterEach(() => vi.unstubAllEnvs());

const post = (corpo: unknown) =>
  POST(new NextRequest("http://localhost/api/sessao", { method: "POST", body: JSON.stringify(corpo) }));
const cookieDe = (r: Response) => r.headers.get("set-cookie") ?? "";

describe("POST /api/sessao", () => {
  it("senha da equipe: 200, papel e cookie HttpOnly/Secure/SameSite=Lax de 12 h", async () => {
    const r = await post({ senha: "senha-equipe" });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ papel: "equipe" });
    const c = cookieDe(r);
    expect(c).toMatch(/^sessao=equipe\./);
    expect(c).toMatch(/HttpOnly/i);
    expect(c).toMatch(/Secure/i);
    expect(c).toMatch(/SameSite=lax/i);
    expect(c).toMatch(/Max-Age=43200/);
  });
  it("senha do dono: papel dono", async () => {
    expect(await (await post({ senha: "senha-dono" })).json()).toEqual({ papel: "dono" });
  });
  it("senha errada: 401 sem cookie", async () => {
    const r = await post({ senha: "errada" });
    expect(r.status).toBe(401);
    expect((await r.json()).erro).toBeTruthy();
    expect(cookieDe(r)).toBe("");
  });
  it("corpo inválido: 400", async () => {
    const r = await POST(new NextRequest("http://localhost/api/sessao", { method: "POST", body: "{" }));
    expect(r.status).toBe(400);
  });
  it("configuração incompleta: 500 com a mensagem do contrato", async () => {
    vi.stubEnv("SEGREDO_SESSAO", "");
    const r = await post({ senha: "senha-equipe" });
    expect(r.status).toBe(500);
    expect(await r.json()).toEqual({ erro: "Acesso não configurado no servidor." });
  });
});

describe("GET e DELETE /api/sessao", () => {
  it("GET sem cookie: 401; com cookie: papel", async () => {
    expect((await GET(new NextRequest("http://localhost/api/sessao"))).status).toBe(401);
    const login = await post({ senha: "senha-dono" });
    const valor = cookieDe(login).split(";")[0];
    const r = await GET(new NextRequest("http://localhost/api/sessao", { headers: { cookie: valor } }));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ papel: "dono" });
  });
  it("DELETE apaga o cookie", async () => {
    const r = await DELETE();
    expect(r.status).toBe(200);
    expect(cookieDe(r)).toMatch(/sessao=;/);
    expect(cookieDe(r)).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);
  });
});
