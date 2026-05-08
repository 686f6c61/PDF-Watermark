import { describe, expect, it } from "vitest";
import { computePositions, getRenderText } from "../../src/lib/watermark/patterns";
import { DEFAULT_CONFIG, type WatermarkConfig } from "../../src/lib/watermark/types";

function configWith(overrides: Partial<WatermarkConfig>): WatermarkConfig {
  return { ...DEFAULT_CONFIG, text: "Confidencial", ...overrides };
}

describe("computePositions", () => {
  describe("single-center", () => {
    it("devuelve exactamente una posicion en el centro geometrico", () => {
      const positions = computePositions(800, 600, configWith({ pattern: "single-center" }));
      expect(positions).toHaveLength(1);
      const first = positions[0]!;
      expect(first.x).toBe(400);
      expect(first.y).toBe(300);
    });

    it("aplica la rotacion configurada", () => {
      const positions = computePositions(
        800,
        600,
        configWith({ pattern: "single-center", rotation: 45 }),
      );
      expect(positions[0]!.rotation).toBe(45);
    });

    it("devuelve una posicion incluso con dimensiones pequeñas", () => {
      const positions = computePositions(50, 50, configWith({ pattern: "single-center" }));
      expect(positions).toHaveLength(1);
      expect(positions[0]!.x).toBe(25);
      expect(positions[0]!.y).toBe(25);
    });

    it("respeta customPosition cuando se proporciona en coordenadas normalizadas", () => {
      const positions = computePositions(
        1000,
        800,
        configWith({
          pattern: "single-center",
          customPosition: { x: 0.25, y: 0.75 },
        }),
      );
      expect(positions).toHaveLength(1);
      expect(positions[0]!.x).toBe(250);
      expect(positions[0]!.y).toBe(600);
    });

    it("ignora customPosition null o undefined y vuelve al centro", () => {
      const sin = computePositions(
        1000,
        800,
        configWith({ pattern: "single-center", customPosition: null }),
      );
      expect(sin[0]!.x).toBe(500);
      expect(sin[0]!.y).toBe(400);

      const sinClave = computePositions(
        1000,
        800,
        configWith({ pattern: "single-center" }),
      );
      expect(sinClave[0]!.x).toBe(500);
      expect(sinClave[0]!.y).toBe(400);
    });

    it("clampa customPosition fuera del rango [0,1] al borde mas cercano", () => {
      const fuera = computePositions(
        1000,
        800,
        configWith({
          pattern: "single-center",
          customPosition: { x: 1.5, y: -0.2 },
        }),
      );
      expect(fuera[0]!.x).toBe(1000);
      expect(fuera[0]!.y).toBe(0);
    });

    it("customPosition mantiene la rotacion configurada", () => {
      const positions = computePositions(
        1000,
        800,
        configWith({
          pattern: "single-center",
          rotation: -25,
          customPosition: { x: 0.5, y: 0.5 },
        }),
      );
      expect(positions[0]!.rotation).toBe(-25);
    });

    it("customPosition no afecta a otros patrones (solo aplica a single-center)", () => {
      const conPos = computePositions(
        1000,
        800,
        configWith({
          pattern: "corner",
          customPosition: { x: 0.1, y: 0.1 },
        }),
      );
      const sinPos = computePositions(
        1000,
        800,
        configWith({ pattern: "corner" }),
      );
      expect(conPos).toEqual(sinPos);
    });
  });

  describe("corner", () => {
    it("devuelve una sola posicion en la esquina inferior derecha", () => {
      const positions = computePositions(800, 600, configWith({ pattern: "corner" }));
      expect(positions).toHaveLength(1);
    });

    it("respeta un margen del 5 por ciento respecto al borde", () => {
      const width = 1000;
      const height = 800;
      const positions = computePositions(width, height, configWith({ pattern: "corner" }));
      const first = positions[0]!;
      const expectedX = width - width * 0.05;
      const expectedY = height - height * 0.05;
      expect(first.x).toBe(expectedX);
      expect(first.y).toBe(expectedY);
    });

    it("respeta la rotacion configurada", () => {
      const positions = computePositions(
        800,
        600,
        configWith({ pattern: "corner", rotation: -15 }),
      );
      expect(positions[0]!.rotation).toBe(-15);
    });
  });

  describe("diagonal", () => {
    it("devuelve mas de una posicion en una pagina razonable", () => {
      const positions = computePositions(
        800,
        600,
        configWith({ pattern: "diagonal", density: 5, fontSize: 48 }),
      );
      expect(positions.length).toBeGreaterThan(1);
    });

    it("a mayor densidad mas posiciones", () => {
      const sparse = computePositions(
        800,
        600,
        configWith({ pattern: "diagonal", density: 1, fontSize: 48 }),
      );
      const dense = computePositions(
        800,
        600,
        configWith({ pattern: "diagonal", density: 10, fontSize: 48 }),
      );
      expect(dense.length).toBeGreaterThan(sparse.length);
    });

    it("todas las posiciones aplican la rotacion configurada", () => {
      const rotation = -30;
      const positions = computePositions(
        800,
        600,
        configWith({ pattern: "diagonal", rotation, density: 4 }),
      );
      expect(positions.length).toBeGreaterThan(0);
      for (const p of positions) {
        expect(p.rotation).toBe(rotation);
      }
    });

    it("todas las posiciones caen dentro de la caja delimitadora", () => {
      const width = 1200;
      const height = 900;
      const positions = computePositions(
        width,
        height,
        configWith({ pattern: "diagonal", density: 4 }),
      );
      // tolerancia para overflow inevitable de la rejilla rotada
      const margin = 200;
      for (const p of positions) {
        expect(p.x).toBeGreaterThanOrEqual(-margin);
        expect(p.x).toBeLessThanOrEqual(width + margin);
        expect(p.y).toBeGreaterThanOrEqual(-margin);
        expect(p.y).toBeLessThanOrEqual(height + margin);
      }
    });

    it("es determinista", () => {
      const a = computePositions(800, 600, configWith({ pattern: "diagonal", density: 5 }));
      const b = computePositions(800, 600, configWith({ pattern: "diagonal", density: 5 }));
      expect(a).toEqual(b);
    });

    it("con texto largo y density alta no produce solapamiento horizontal", () => {
      // Reproduce el bug reportado: texto de 30 chars a fontSize 48 sobre 1500x1700.
      // Tras desrotar las posiciones, dos marcas consecutivas en una misma fila deben
      // estar separadas al menos lo que mide el texto, o se solaparan visualmente.
      const text = "destinado a enaguar el enagua";
      const fontSize = 48;
      const rotation = -30;
      const positions = computePositions(
        1500,
        1700,
        configWith({ pattern: "diagonal", density: 10, fontSize, rotation, text }),
      );
      const textWidth = text.length * fontSize * 0.55;

      // Desrotamos respecto al centro del lienzo y agrupamos por fila (tolerancia 1 px).
      const cx = 1500 / 2;
      const cy = 1700 / 2;
      const angle = (-rotation * Math.PI) / 180;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const local = positions.map((p) => {
        const dx = p.x - cx;
        const dy = p.y - cy;
        return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
      });
      const rows = new Map<number, number[]>();
      for (const point of local) {
        const key = Math.round(point.y);
        const bucket = rows.get(key) ?? [];
        bucket.push(point.x);
        rows.set(key, bucket);
      }
      let minGap = Number.POSITIVE_INFINITY;
      for (const xs of rows.values()) {
        if (xs.length < 2) continue;
        xs.sort((a, b) => a - b);
        for (let i = 1; i < xs.length; i += 1) {
          const gap = xs[i]! - xs[i - 1]!;
          if (gap < minGap) minGap = gap;
        }
      }
      expect(minGap).toBeGreaterThanOrEqual(textWidth);
    });

    it("density 1 produce muchas menos posiciones que density 10 sobre la misma imagen", () => {
      const config = configWith({
        pattern: "diagonal",
        fontSize: 48,
        text: "destinado a enaguar el enagua",
      });
      const sparse = computePositions(1500, 1700, { ...config, density: 1 });
      const dense = computePositions(1500, 1700, { ...config, density: 10 });
      expect(dense.length).toBeGreaterThanOrEqual(sparse.length * 4);
    });

    it("density 4 (default) sobre 1500x1700 produce entre 8 y 25 posiciones para texto de 30 chars a fontSize 48", () => {
      const positions = computePositions(
        1500,
        1700,
        configWith({
          pattern: "diagonal",
          density: 4,
          fontSize: 48,
          rotation: -30,
          text: "destinado a enaguar el enagua",
        }),
      );
      expect(positions.length).toBeGreaterThanOrEqual(8);
      expect(positions.length).toBeLessThanOrEqual(25);
    });
  });

  describe("spiral", () => {
    it("devuelve varias posiciones en forma de espiral", () => {
      const positions = computePositions(
        800,
        600,
        configWith({ pattern: "spiral", density: 4 }),
      );
      expect(positions.length).toBeGreaterThan(3);
    });

    it("la primera posicion arranca en el centro o muy cerca", () => {
      const width = 800;
      const height = 600;
      const positions = computePositions(
        width,
        height,
        configWith({ pattern: "spiral", density: 4 }),
      );
      const first = positions[0]!;
      const cx = width / 2;
      const cy = height / 2;
      expect(Math.abs(first.x - cx)).toBeLessThan(40);
      expect(Math.abs(first.y - cy)).toBeLessThan(40);
    });

    it("las rotaciones son tangenciales y varian a lo largo de la espiral", () => {
      const positions = computePositions(
        800,
        600,
        configWith({ pattern: "spiral", density: 5 }),
      );
      const rotations = new Set(positions.map((p) => Math.round(p.rotation)));
      expect(rotations.size).toBeGreaterThan(3);
    });

    it("a mayor densidad mas vueltas y por tanto mas posiciones", () => {
      const low = computePositions(
        800,
        600,
        configWith({ pattern: "spiral", density: 1 }),
      );
      const high = computePositions(
        800,
        600,
        configWith({ pattern: "spiral", density: 10 }),
      );
      expect(high.length).toBeGreaterThan(low.length);
    });

    it("es determinista", () => {
      const a = computePositions(800, 600, configWith({ pattern: "spiral", density: 6 }));
      const b = computePositions(800, 600, configWith({ pattern: "spiral", density: 6 }));
      expect(a).toEqual(b);
    });

    it("bug A: con density 4 y fontSize 48 sobre 1500x1500 la primera posicion esta exactamente en el centro", () => {
      // El primer punto de la espiral arquimediana es theta=0 -> r=0, asi que
      // debe quedar en (cx, cy) sin rastro de offset.
      const positions = computePositions(
        1500,
        1500,
        configWith({ pattern: "spiral", density: 4, fontSize: 48, text: "Confiden" }),
      );
      expect(positions.length).toBeGreaterThan(0);
      expect(positions[0]!.x).toBe(750);
      expect(positions[0]!.y).toBe(750);
    });

    it("bug A: ningun par de posiciones consecutivas tiene un salto angular mayor que maxStep", () => {
      // El paso angular maximo evita el agujero visible cerca del centro.
      // Calculamos el angulo respecto al centro para cada posicion y verificamos
      // que la diferencia consecutiva no excede maxStep + epsilon.
      const width = 1500;
      const height = 1500;
      const positions = computePositions(
        width,
        height,
        configWith({ pattern: "spiral", density: 4, fontSize: 48, text: "Confiden" }),
      );
      const cx = width / 2;
      const cy = height / 2;
      const maxStep = Math.PI / 4;
      const epsilon = 1e-6;
      // Saltamos la primera comparacion: theta=0 inicial donde el angulo no esta definido.
      for (let i = 1; i < positions.length - 1; i += 1) {
        const a = positions[i]!;
        const b = positions[i + 1]!;
        const thetaA = Math.atan2(a.y - cy, a.x - cx);
        const thetaB = Math.atan2(b.y - cy, b.x - cx);
        // Diferencia minima en circulo (modulo 2pi).
        let delta = Math.abs(thetaB - thetaA);
        if (delta > Math.PI) delta = 2 * Math.PI - delta;
        expect(delta).toBeLessThanOrEqual(maxStep + epsilon);
      }
    });

    it("bug A: con texto largo y density 4 sobre 1000x1000 produce al menos 8 posiciones dentro de un radio de 200 px", () => {
      // Garantia de densidad cerca del centro: la espiral arranca densa.
      const width = 1000;
      const height = 1000;
      const longText = "a".repeat(60);
      const positions = computePositions(
        width,
        height,
        configWith({ pattern: "spiral", density: 4, fontSize: 48, text: longText }),
      );
      const cx = width / 2;
      const cy = height / 2;
      const inner = positions.filter((p) => Math.hypot(p.x - cx, p.y - cy) <= 200);
      expect(inner.length).toBeGreaterThanOrEqual(8);
    });

    it("posiciones consecutivas estan separadas al menos textWidth*0.6 cuando el radio lo permite", () => {
      // Para texto largo, el paso angular debe abrirse lo suficiente para no solapar.
      const text = "destinado a enaguar el enagua";
      const fontSize = 48;
      const positions = computePositions(
        1500,
        1700,
        configWith({ pattern: "spiral", density: 4, fontSize, text }),
      );
      const textWidth = text.length * fontSize * 0.55;
      const minGap = textWidth * 0.6;
      const cx = 1500 / 2;
      const cy = 1700 / 2;
      // Solo evaluamos pares cuyo radio admita geometricamente la separacion
      // solicitada (cerca del origen, y bajo el cap angular maxStep=pi/4 del bug A,
      // no se puede separar dos puntos textWidth*0.6 px). El radio minimo viable es
      // minGap / (2 * sin(maxStep/2)).
      const maxStep = Math.PI / 4;
      const minRadius = minGap / (2 * Math.sin(maxStep / 2));
      for (let i = 1; i < positions.length; i += 1) {
        const a = positions[i - 1]!;
        const b = positions[i]!;
        const ra = Math.hypot(a.x - cx, a.y - cy);
        const rb = Math.hypot(b.x - cx, b.y - cy);
        const radius = Math.min(ra, rb);
        if (radius < minRadius) continue;
        const distance = Math.hypot(b.x - a.x, b.y - a.y);
        expect(distance).toBeGreaterThanOrEqual(minGap);
      }
    });
  });

  describe("getRenderText", () => {
    it("añade un espacio implicito al final del texto", () => {
      expect(getRenderText("hola")).toBe("hola ");
    });

    it("añade el espacio incluso si el texto ya termina en espacio", () => {
      // El motor renderiza siempre text + ' ' sin recortar; preservamos lo del usuario.
      expect(getRenderText("hola ")).toBe("hola  ");
    });

    it("devuelve un solo espacio para cadena vacia", () => {
      expect(getRenderText("")).toBe(" ");
    });
  });

  describe("regresion bug B: separacion entre marcas adyacentes", () => {
    // La heuristica de ancho debe contar un caracter extra (espacio implicito)
    // para evitar que dos marcas consecutivas se vean como una sola palabra.
    it("la separacion horizontal en diagonal cubre text.length + 1 caracteres", () => {
      const text = "AB";
      const fontSize = 48;
      const rotation = 0; // sin rotacion para comparar X directamente
      const positions = computePositions(
        2000,
        2000,
        configWith({ pattern: "diagonal", density: 10, fontSize, rotation, text }),
      );
      // Agrupamos por fila (Y exacta) y medimos el menor gap entre X consecutivas.
      const rows = new Map<number, number[]>();
      for (const p of positions) {
        const key = Math.round(p.y);
        const bucket = rows.get(key) ?? [];
        bucket.push(p.x);
        rows.set(key, bucket);
      }
      let minGap = Number.POSITIVE_INFINITY;
      for (const xs of rows.values()) {
        if (xs.length < 2) continue;
        xs.sort((a, b) => a - b);
        for (let i = 1; i < xs.length; i += 1) {
          const gap = xs[i]! - xs[i - 1]!;
          if (gap < minGap) minGap = gap;
        }
      }
      const expectedMin = (text.length + 1) * fontSize * 0.55;
      expect(minGap).toBeGreaterThanOrEqual(expectedMin);
    });
  });

  describe("casos limite", () => {
    it("devuelve array vacio si las dimensiones son cero o negativas", () => {
      expect(computePositions(0, 600, configWith({}))).toEqual([]);
      expect(computePositions(800, 0, configWith({}))).toEqual([]);
      expect(computePositions(-1, 600, configWith({}))).toEqual([]);
    });

    it("no lanza con fontSize muy grande respecto al lienzo", () => {
      expect(() =>
        computePositions(100, 100, configWith({ pattern: "diagonal", fontSize: 120 })),
      ).not.toThrow();
    });
  });
});
