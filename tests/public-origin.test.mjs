import assert from "node:assert/strict";
import test from "node:test";
import { publicOrigin } from "../app/public-origin.ts";

test("origem pública usa os cabeçalhos do proxy da Hostinger", () => {
  const request = new Request("http://0.0.0.0:3000/api/auth/logout", {
    headers: {
      host: "0.0.0.0:3000",
      "x-forwarded-host": "mapa.exemplo.com.br",
      "x-forwarded-proto": "https",
    },
  });
  assert.equal(publicOrigin(request), "https://mapa.exemplo.com.br");
});

test("origem pública ignora host encaminhado inválido", () => {
  const request = new Request("https://mapa.exemplo.com.br/api/auth/logout", {
    headers: { "x-forwarded-host": "exemplo.com/rota-injetada" },
  });
  assert.equal(publicOrigin(request), "https://mapa.exemplo.com.br");
});

test("origem pública não derruba o painel quando a URL interna do proxy é inválida", () => {
  const request = {
    url: "url-interna-inválida",
    headers: new Headers({
      host: "mapa.exemplo.com.br",
      "x-forwarded-proto": "https",
    }),
  };
  assert.equal(publicOrigin(request), "https://mapa.exemplo.com.br");
});
