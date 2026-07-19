import { describe, expect, it } from "vitest";
import { parsePageRanges } from "../../src/lib/page-ranges";

describe("parsePageRanges", () => {
  it("parsea una pagina suelta", () => {
    expect(parsePageRanges("3", 10)).toEqual([3]);
  });

  it("parsea varias paginas separadas por comas y las ordena", () => {
    expect(parsePageRanges("5, 1, 3", 10)).toEqual([1, 3, 5]);
  });

  it("parsea un rango cerrado con ambos extremos incluidos", () => {
    expect(parsePageRanges("3-5", 10)).toEqual([3, 4, 5]);
  });

  it("parsea un rango abierto hasta la ultima pagina", () => {
    expect(parsePageRanges("8-", 10)).toEqual([8, 9, 10]);
  });

  it("mezcla paginas y rangos", () => {
    expect(parsePageRanges("1, 3-5, 8-", 9)).toEqual([1, 3, 4, 5, 8, 9]);
  });

  it("tolera espacios alrededor de numeros, comas y guiones", () => {
    expect(parsePageRanges("  1 ,  3 - 5 , 8 -  ", 9)).toEqual([1, 3, 4, 5, 8, 9]);
  });

  it("elimina duplicados y solapes entre rangos", () => {
    expect(parsePageRanges("1-4, 3-6, 4, 4-4", 10)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("acepta un rango de una sola pagina (n-n)", () => {
    expect(parsePageRanges("4-4", 10)).toEqual([4]);
  });

  it("acepta el documento entero con 1-N", () => {
    expect(parsePageRanges("1-3", 3)).toEqual([1, 2, 3]);
  });

  it("devuelve null si una pagina es menor que 1", () => {
    expect(parsePageRanges("0", 10)).toBeNull();
    expect(parsePageRanges("0-3", 10)).toBeNull();
  });

  it("devuelve null si una pagina supera el total", () => {
    expect(parsePageRanges("11", 10)).toBeNull();
    expect(parsePageRanges("8-11", 10)).toBeNull();
  });

  it("devuelve null si el rango va al reves", () => {
    expect(parsePageRanges("5-3", 10)).toBeNull();
  });

  it("devuelve null ante sintaxis invalida", () => {
    expect(parsePageRanges("abc", 10)).toBeNull();
    expect(parsePageRanges("1,,3", 10)).toBeNull();
    expect(parsePageRanges("1,", 10)).toBeNull();
    expect(parsePageRanges(",1", 10)).toBeNull();
    expect(parsePageRanges("-3", 10)).toBeNull();
    expect(parsePageRanges("3--5", 10)).toBeNull();
    expect(parsePageRanges("3.5", 10)).toBeNull();
    expect(parsePageRanges("1 2", 10)).toBeNull();
  });

  it("devuelve null con entrada vacia o solo espacios", () => {
    expect(parsePageRanges("", 10)).toBeNull();
    expect(parsePageRanges("   ", 10)).toBeNull();
  });

  it("devuelve null si el documento no tiene paginas validas", () => {
    expect(parsePageRanges("1", 0)).toBeNull();
    expect(parsePageRanges("1", -3)).toBeNull();
  });

  it("un trozo invalido invalida todo el parseo, no solo ese trozo", () => {
    expect(parsePageRanges("1, 2, 99", 10)).toBeNull();
    expect(parsePageRanges("1, 2, xyz", 10)).toBeNull();
  });
});
