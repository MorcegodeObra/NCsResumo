import { expect, it } from "vitest";
import { dataBR, dataHoraBR } from "./datas";

it("dataBR: aaaa-mm-dd ou instante ISO → dd/mm/aaaa no fuso da obra", () => {
  expect(dataBR("2026-10-21")).toBe("21/10/2026");
  expect(dataBR("2026-11-20T13:00:00Z")).toBe("20/11/2026");
  expect(dataBR("2026-11-21T01:00:00Z")).toBe("20/11/2026"); // 22h em Brasília
  expect(dataBR(null)).toBe("");
});

it("dataHoraBR: instante ISO → dd/mm/aaaa hh:mm no fuso da obra", () => {
  expect(dataHoraBR("2026-11-20T13:05:00Z")).toBe("20/11/2026 10:05");
});
