import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      // "server-only" lança erro fora do bundle do servidor; nos testes ele não faz nada.
      "server-only": fileURLToPath(new URL("./back/testes/vazio.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules/**", ".next/**"],
    // Cada teste de banco sobe um PGlite; com todos os núcleos ocupados, o padrão de 5 s estoura.
    // Um worker por núcleo chegou a 5 GB e o sistema matava o VS Code por falta de memória.
    maxWorkers: 2,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
