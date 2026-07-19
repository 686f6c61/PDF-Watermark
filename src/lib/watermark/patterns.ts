/**
 * Cálculo de posiciones de watermark para los cuatro patrones soportados.
 *
 * Módulo puro: no accede al DOM, no importa Canvas ni pdf-lib. Recibe las
 * dimensiones del lienzo y la configuración, y devuelve un array de
 * coordenadas `{ x, y, rotation }` en el sistema de coordenadas Canvas
 * (origen arriba-izquierda). Cada motor (`image.ts`, `pdf.ts`) traduce
 * esas coordenadas a su propio sistema antes de dibujar.
 *
 * Esta independencia del soporte es lo que garantiza que el preview y el
 * resultado final usen exactamente la misma lógica de posicionamiento.
 * Ver ADR-0004 para la justificación de diseño.
 *
 * @module watermark/patterns
 */
import { REFERENCE_CANVAS_WIDTH, type Position, type WatermarkConfig } from "./types";

// Tamaño real de la marca ya escalada (ver computeImageWatermarkSize). Los
// motores lo conocen tras cargar la imagen de marca y lo pasan para que el
// espaciado y el anclaje de los patrones usen el tamaño real en lugar de la
// estimacion de texto (que con marca de imagen esta vacia y colapsa las
// celdas, produciendo solapamientos).
export type MarkSize = {
  width: number;
  height: number;
};

// Interlineado del texto multi-linea, en multiplo del fontSize efectivo. Lo
// comparten los dos motores (apilado de lineas) y computeDiagonal (altura
// minima de celda para que el bloque completo quepa sin solapar filas).
export const TEXT_LINE_HEIGHT = 1.2;

// Tamaño efectivo del texto para un lienzo concreto. Con relativeSize el
// fontSize configurado se escala proporcionalmente al ancho del lienzo
// respecto a REFERENCE_CANVAS_WIDTH (un A4); sin el, es absoluto y se
// devuelve tal cual. El resultado queda acotado a [1, 1000] para que un
// lienzo diminuto o gigante no produzca tamaños absurdos, y un ancho no
// finito (NaN/Infinity) cae al fontSize absoluto en lugar de propagarse.
export function resolveEffectiveFontSize(
  config: WatermarkConfig,
  canvasWidth: number,
): number {
  if (!config.relativeSize) return config.fontSize;
  const scaled = config.fontSize * (canvasWidth / REFERENCE_CANVAS_WIDTH);
  if (!Number.isFinite(scaled)) return config.fontSize;
  return Math.min(1000, Math.max(1, scaled));
}

export function computePositions(
  width: number,
  height: number,
  config: WatermarkConfig,
  markSize?: MarkSize,
): Position[] {
  if (width <= 0 || height <= 0) {
    return [];
  }
  switch (config.pattern) {
    case "single-center":
      return computeSingleCenter(width, height, config);
    case "corner":
      return computeCorner(width, height, config, markSize);
    case "diagonal":
      return computeDiagonal(width, height, config, markSize);
    case "spiral":
      return computeSpiral(width, height, config, markSize);
    default:
      return [];
  }
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function computeSingleCenter(
  width: number,
  height: number,
  config: WatermarkConfig,
): Position[] {
  const custom = config.customPosition;
  if (custom) {
    return [
      {
        x: clamp01(custom.x) * width,
        y: clamp01(custom.y) * height,
        rotation: config.rotation,
      },
    ];
  }
  return [
    {
      x: width / 2,
      y: height / 2,
      rotation: config.rotation,
    },
  ];
}

function computeCorner(
  width: number,
  height: number,
  config: WatermarkConfig,
  markSize?: MarkSize,
): Position[] {
  const marginX = width * 0.05;
  const marginY = height * 0.05;
  // La posicion es el CENTRO de la marca. Con marca de imagen la desplazamos
  // hacia dentro la mitad de su tamaño: si no, una marca grande queda mas de
  // la mitad fuera del lienzo y apenas se ve en la esquina.
  const insetX = markSize ? markSize.width / 2 : 0;
  const insetY = markSize ? markSize.height / 2 : 0;
  return [
    {
      x: width - marginX - insetX,
      y: height - marginY - insetY,
      rotation: config.rotation,
    },
  ];
}

// Espacios extra contados al estimar el ancho del texto y aplicados en el
// render real (ver getRenderText). Garantizan que dos marcas adyacentes
// nunca se vean pegadas como una sola palabra ("WatermarkWatermark").
const TRAILING_SPACES = 1;

// Texto tal y como debe enviarse al motor de render (Canvas o pdf-lib).
// Añadir el espacio aqui mantiene coherencia entre el ancho estimado y el
// ancho dibujado, sin que cada motor tenga que recordar la convencion.
export function getRenderText(text: string): string {
  return text + " ".repeat(TRAILING_SPACES);
}

// Heuristica de medida de texto sin acceder al DOM ni a metricas reales.
// Suficientemente buena para Helvetica/sans-serif: ancho medio glifo ~ 0.55em.
// Courier (mono) es monoespaciada y avanza exactamente 0.6em por glifo, asi
// que ajustamos el factor por familia para que el espaciado case con el
// render real (ver FONT_BY_FAMILY en pdf.ts). Con texto multi-linea el ancho
// del bloque es el de la linea MAS LARGA. Sumamos TRAILING_SPACES caracteres
// al ancho efectivo para reservar espacio al separador implicito que añade
// getRenderText al renderizar.
export function estimateTextWidth(
  text: string,
  fontSize: number,
  fontFamily: WatermarkConfig["fontFamily"],
): number {
  const factor = fontFamily === "mono" ? 0.6 : 0.55;
  const longestLine = Math.max(1, ...text.split("\n").map((line) => line.length));
  const effectiveLength = longestLine + TRAILING_SPACES;
  return effectiveLength * fontSize * factor;
}

function computeDiagonal(
  width: number,
  height: number,
  config: WatermarkConfig,
  markSize?: MarkSize,
): Position[] {
  const positions: Position[] = [];
  // Ancho real de la marca: con marca de imagen el texto esta vacio y la
  // estimacion colapsaria la celda (~1.6 fontSize), solapando marcas que en
  // realidad miden mucho mas. Los motores pasan markSize en ese caso.
  const markWidth = markSize?.width ?? estimateTextWidth(config.text, config.fontSize, config.fontFamily);
  // Rejilla rectangular rotada. La separacion horizontal local (cellWidth) es
  // fija y se calcula a partir del ancho real de la marca. Con texto basta
  // medio fontSize de hueco (la convencion del espacio final, TRAILING_SPACES,
  // ya separa palabras). Con marca de imagen el hueco es de UNA marca completa:
  // entre dos logos siempre cabe un segundo logo, igual que entre dos palabras
  // hay un espacio — un hueco menor los encadena visualmente en una franja.
  const cellWidth = markSize
    ? markWidth * 2
    : markWidth + config.fontSize * 0.5;
  const verticalFactor = 0.8 + (10 - config.density) * 1.2;
  // Separacion vertical (cellHeight): modula la densidad. Con texto, el
  // termino de densidad usa fontSize como unidad; con marca de imagen usa la
  // altura real de la marca (un logo bajo y apaisado no debe heredar el
  // ritmo vertical de un texto de 48 px). Suelo: dos alturas de marca.
  // Con texto multi-linea la celda debe cubrir el bloque completo (~1.2em por
  // linea, el mismo interlineado del render) o las filas se solapan.
  const lineCount = config.text.split("\n").length;
  const cellHeight = markSize
    ? markSize.height * Math.max(2, verticalFactor)
    : Math.max(
        config.fontSize * 0.8 + config.fontSize * TEXT_LINE_HEIGHT * lineCount,
        config.fontSize * verticalFactor,
      );
  if (cellWidth <= 0 || cellHeight <= 0) {
    return [];
  }
  const cx = width / 2;
  const cy = height / 2;
  const angle = (config.rotation * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  // Cubrimos la diagonal del lienzo para garantizar cobertura tras rotar.
  const diagonal = Math.sqrt(width * width + height * height);
  const halfDiag = diagonal / 2;
  const cols = Math.ceil((diagonal + cellWidth) / cellWidth);
  const rows = Math.ceil((diagonal + cellHeight) / cellHeight);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const localX = -halfDiag + col * cellWidth;
      const localY = -halfDiag + row * cellHeight;
      const rotatedX = localX * cos - localY * sin + cx;
      const rotatedY = localX * sin + localY * cos + cy;
      // Filtramos posiciones claramente fuera de la pagina con margen.
      const margin = 50;
      if (
        rotatedX < -margin ||
        rotatedX > width + margin ||
        rotatedY < -margin ||
        rotatedY > height + margin
      ) {
        continue;
      }
      positions.push({
        x: rotatedX,
        y: rotatedY,
        rotation: config.rotation,
      });
    }
  }
  return positions;
}

function computeSpiral(
  width: number,
  height: number,
  config: WatermarkConfig,
  markSize?: MarkSize,
): Position[] {
  const positions: Position[] = [];
  const cx = width / 2;
  const cy = height / 2;
  // Margen de borde: la mitad de la altura real de la marca (con imagen puede
  // ser mucho mayor que fontSize/2) para que la espiral no escupe centros de
  // marca fuera del lienzo.
  const edgeMargin = Math.max(config.fontSize, markSize?.height ?? 0) / 2;
  const maxRadius = Math.min(width, height) / 2 - edgeMargin;
  if (maxRadius <= 0) {
    return [];
  }
  // Con marca de imagen el texto esta vacio: el hueco entre marcas se calcula
  // con el ancho real de la marca (markSize) para no solapar.
  const markWidth = markSize?.width ?? estimateTextWidth(config.text, config.fontSize, config.fontFamily);
  const turns = config.density * 0.8 + 1.2;
  const totalAngle = turns * 2 * Math.PI;
  // Espiral de Arquimedes: r = a * theta. Resolvemos a tal que en theta=totalAngle, r=maxRadius.
  const a = maxRadius / totalAngle;
  // Separacion objetivo entre marcas consecutivas a lo largo del arco. Modulada
  // por densidad. Con texto basta un suelo de textWidth*0.6 (los glifos rotados
  // tangencialmente se encadenan); con marca de imagen el suelo es su ancho
  // completo, porque una marca grafica rotada solapa en cuanto el arco entre
  // centros es menor que su tamaño.
  const densityScale = 1.6 - config.density * 0.1;
  const gapFloor = markSize ? markWidth : markWidth * 0.6;
  const targetGap = Math.max(gapFloor, config.fontSize) * densityScale;
  // Paso angular minimo: limita la densidad cerca del centro donde r es pequeño
  // y un dtheta=targetGap/r explotaria; tambien evita bucles infinitos en r=0.
  const minStep = Math.PI / 12;
  // Paso angular maximo: cap superior para que la espiral no haga saltos de
  // mas de 45 grados cerca del centro. Sin este tope, el primer salto desde
  // theta=0 puede superar media vuelta y dejar un agujero visible (bug A).
  const maxStep = Math.PI / 4;
  let theta = 0;
  while (theta <= totalAngle) {
    const r = a * theta;
    const x = cx + r * Math.cos(theta);
    const y = cy + r * Math.sin(theta);
    // Rotacion tangencial: angulo de la tangente a la espiral.
    // Tangente ~ angulo + 90 grados (en sentido horario para Y hacia abajo).
    const tangent = ((theta + Math.PI / 2) * 180) / Math.PI;
    positions.push({
      x,
      y,
      rotation: ((tangent + 180) % 360) - 180,
    });
    // Para un radio r, longitud de arco ds ~ r*dtheta; despejamos dtheta para
    // recorrer targetGap. Cerca del origen aplicamos minStep como suelo y
    // maxStep como techo para evitar el hueco central descrito en bug A.
    const effectiveR = Math.max(r, config.fontSize);
    const dynamicStep = Math.min(maxStep, Math.max(minStep, targetGap / effectiveR));
    theta += dynamicStep;
  }
  return positions;
}
