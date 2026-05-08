/**
 * Tests del módulo de lote personalizado.
 *
 * Cubre el parseo de la entrada del usuario (textarea o archivo TXT/CSV), la
 * generación de slugs estables a partir de nombres con tildes y caracteres
 * especiales, y la deduplicación con sufijo numérico cuando dos nombres
 * distintos colapsan al mismo slug.
 */
import { describe, expect, it } from "vitest";
import { parseBatchInput, slugify, dedupeSlugs, BATCH_LIMITS } from "../../src/lib/batch";

describe("parseBatchInput", () => {
  it("ignora líneas vacías y comentarios", () => {
    const raw = `# comentario inicial
Juan Pérez

# otro comentario
María Gómez
`;
    const result = parseBatchInput(raw);
    expect(result.names).toEqual(["Juan Pérez", "María Gómez"]);
    expect(result.warnings).toEqual([]);
  });

  it("recorta espacios al principio y al final de cada nombre", () => {
    const raw = "   Juan Pérez   \n\tMaría Gómez\n";
    const result = parseBatchInput(raw);
    expect(result.names).toEqual(["Juan Pérez", "María Gómez"]);
  });

  it("entrada vacía produce names vacío y warning de mínimo", () => {
    const result = parseBatchInput("");
    expect(result.names).toEqual([]);
    expect(result.warnings).toContain("empty");
  });

  it("entrada solo con comentarios produce names vacío", () => {
    const raw = "# uno\n# dos\n";
    const result = parseBatchInput(raw);
    expect(result.names).toEqual([]);
    expect(result.warnings).toContain("empty");
  });

  it("respeta el orden de aparición", () => {
    const raw = "Charlie\nAlpha\nBravo\n";
    const result = parseBatchInput(raw);
    expect(result.names).toEqual(["Charlie", "Alpha", "Bravo"]);
  });

  it("avisa cuando hay duplicados pero conserva la primera aparición", () => {
    const raw = "Juan Pérez\nMaría Gómez\nJuan Pérez\n";
    const result = parseBatchInput(raw);
    expect(result.names).toEqual(["Juan Pérez", "María Gómez"]);
    expect(result.warnings).toContain("duplicates");
  });

  it("detecta duplicados ignorando mayúsculas y espacios sobrantes", () => {
    const raw = "Juan Pérez\n  juan pérez  \n";
    const result = parseBatchInput(raw);
    expect(result.names).toEqual(["Juan Pérez"]);
    expect(result.warnings).toContain("duplicates");
  });

  it("rechaza entradas con más de 50 nombres y avisa con 'too-many'", () => {
    const lines: string[] = [];
    for (let i = 1; i <= 55; i += 1) {
      lines.push(`Nombre ${i}`);
    }
    const result = parseBatchInput(lines.join("\n"));
    expect(result.names).toHaveLength(BATCH_LIMITS.MAX_NAMES);
    expect(result.warnings).toContain("too-many");
  });

  it("filtra nombres con longitud fuera de rango y avisa con 'invalid-length'", () => {
    const tooLong = "x".repeat(BATCH_LIMITS.MAX_NAME_LENGTH + 5);
    const raw = `Juan\n${tooLong}\nMaría\n`;
    const result = parseBatchInput(raw);
    expect(result.names).toEqual(["Juan", "María"]);
    expect(result.warnings).toContain("invalid-length");
  });

  it("ignora líneas de un único carácter? no: las acepta como válidas", () => {
    // El minimo es 1 caracter tras trim, asi que "A" es valido.
    const result = parseBatchInput("A\nB\n");
    expect(result.names).toEqual(["A", "B"]);
    expect(result.warnings).toEqual([]);
  });
});

describe("slugify", () => {
  it("convierte tildes españolas a su forma sin acento", () => {
    expect(slugify("Juan Pérez")).toBe("juan-perez");
    expect(slugify("María Gómez")).toBe("maria-gomez");
    expect(slugify("Antonio García")).toBe("antonio-garcia");
  });

  it("convierte la eñe a 'n'", () => {
    expect(slugify("Niño Pequeño")).toBe("nino-pequeno");
    expect(slugify("España")).toBe("espana");
  });

  it("elimina caracteres especiales y los reemplaza por guiones", () => {
    expect(slugify("Niño @ Casa")).toBe("nino-casa");
    expect(slugify("Juan & María")).toBe("juan-maria");
    expect(slugify("Pérez, Juan")).toBe("perez-juan");
  });

  it("normaliza acentos en mayúsculas", () => {
    expect(slugify("ÁNGEL")).toBe("angel");
    expect(slugify("ÚRSULA")).toBe("ursula");
  });

  it("colapsa varios separadores en uno solo", () => {
    expect(slugify("  Juan   Pérez  ")).toBe("juan-perez");
    expect(slugify("Juan---Pérez")).toBe("juan-perez");
  });

  it("recorta guiones inicial y final", () => {
    expect(slugify("-Juan-")).toBe("juan");
    expect(slugify("--Juan Pérez--")).toBe("juan-perez");
  });

  it("para entradas que no producen ningún carácter válido devuelve string vacío", () => {
    expect(slugify("@@@")).toBe("");
    expect(slugify("   ")).toBe("");
  });

  it("preserva números", () => {
    expect(slugify("Empleado 42")).toBe("empleado-42");
    expect(slugify("Juan Pérez 2")).toBe("juan-perez-2");
  });
});

describe("dedupeSlugs", () => {
  it("conserva slugs únicos sin modificar", () => {
    expect(dedupeSlugs(["juan-perez", "maria-gomez"])).toEqual([
      "juan-perez",
      "maria-gomez",
    ]);
  });

  it("añade sufijo -2 a la segunda colisión", () => {
    expect(dedupeSlugs(["juan-perez", "juan-perez"])).toEqual([
      "juan-perez",
      "juan-perez-2",
    ]);
  });

  it("incrementa el sufijo en colisiones sucesivas", () => {
    expect(dedupeSlugs(["a", "a", "a", "a"])).toEqual(["a", "a-2", "a-3", "a-4"]);
  });

  it("respeta el orden de entrada para colisiones intercaladas", () => {
    expect(dedupeSlugs(["a", "b", "a", "b", "a"])).toEqual([
      "a",
      "b",
      "a-2",
      "b-2",
      "a-3",
    ]);
  });

  it("sustituye un slug vacío por 'sin-nombre' con sufijo si colisiona", () => {
    expect(dedupeSlugs(["", ""])).toEqual(["sin-nombre", "sin-nombre-2"]);
  });
});
