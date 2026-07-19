import { describe, expect, it } from "vitest";
import { applyTextVariables } from "../../src/lib/watermark/text-variables";

describe("applyTextVariables", () => {
  it("sustituye las cuatro variables documentadas", () => {
    expect(
      applyTextVariables("{nombre} · {fecha} · {pagina}/{total}", {
        fecha: "18/07/2026",
        nombre: "informe",
        pagina: "2",
        total: "5",
      }),
    ).toBe("informe · 18/07/2026 · 2/5");
  });

  it("deja literal las variables sin valor en vars", () => {
    // Caso real: en el store solo se resuelve el nivel archivo; {pagina} y
    // {total} deben llegar intactas al motor.
    expect(applyTextVariables("{nombre} pág. {pagina}", { nombre: "doc" })).toBe(
      "doc pág. {pagina}",
    );
  });

  it("deja literal las variables desconocidas", () => {
    expect(applyTextVariables("{foo} y {fecha}", { fecha: "hoy" })).toBe("{foo} y hoy");
  });

  it("sustituye todas las repeticiones de la misma variable", () => {
    expect(applyTextVariables("{pagina} - {pagina} - {pagina}", { pagina: "3" })).toBe(
      "3 - 3 - 3",
    );
  });

  it("devuelve el texto intacto cuando no hay variables", () => {
    expect(applyTextVariables("texto plano", { fecha: "hoy" })).toBe("texto plano");
    expect(applyTextVariables("texto plano", {})).toBe("texto plano");
  });

  it("no sustituye nada con vars vacio", () => {
    expect(applyTextVariables("{fecha} {nombre} {pagina} {total}", {})).toBe(
      "{fecha} {nombre} {pagina} {total}",
    );
  });

  it("sustituye dentro de un texto multi-linea sin tocar los saltos", () => {
    expect(applyTextVariables("{nombre}\n{pagina}", { nombre: "doc", pagina: "1" })).toBe(
      "doc\n1",
    );
  });
});
