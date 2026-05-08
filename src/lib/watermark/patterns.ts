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
import type { Position, WatermarkConfig } from "./types";

export function computePositions(
  width: number,
  height: number,
  config: WatermarkConfig,
): Position[] {
  if (width <= 0 || height <= 0) {
    return [];
  }
  switch (config.pattern) {
    case "single-center":
      return computeSingleCenter(width, height, config);
    case "corner":
      return computeCorner(width, height, config);
    case "diagonal":
      return computeDiagonal(width, height, config);
    case "spiral":
      return computeSpiral(width, height, config);
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
): Position[] {
  const marginX = width * 0.05;
  const marginY = height * 0.05;
  return [
    {
      x: width - marginX,
      y: height - marginY,
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
// Sumamos TRAILING_SPACES caracteres al ancho efectivo para reservar espacio
// al separador implicito que añade getRenderText al renderizar.
function estimateTextWidth(text: string, fontSize: number): number {
  const effectiveLength = Math.max(1, text.length) + TRAILING_SPACES;
  return effectiveLength * fontSize * 0.55;
}

function computeDiagonal(
  width: number,
  height: number,
  config: WatermarkConfig,
): Position[] {
  const positions: Position[] = [];
  const textWidth = estimateTextWidth(config.text, config.fontSize);
  // Rejilla rectangular rotada. La separacion horizontal local (cellWidth) es
  // fija y se calcula a partir del ancho real del texto: dos marcas en la misma
  // fila no pueden estar mas cerca que textWidth + medio fontSize, o se solapan.
  // La separacion vertical local (cellHeight) modula la densidad: density 10
  // apila filas casi pegadas; density 1 las separa varios fontSize.
  const cellWidth = textWidth + config.fontSize * 0.5;
  const verticalFactor = 0.8 + (10 - config.density) * 1.2;
  const cellHeight = Math.max(config.fontSize * 0.8, config.fontSize * verticalFactor);
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
): Position[] {
  const positions: Position[] = [];
  const cx = width / 2;
  const cy = height / 2;
  const maxRadius = Math.min(width, height) / 2 - config.fontSize / 2;
  if (maxRadius <= 0) {
    return [];
  }
  const textWidth = estimateTextWidth(config.text, config.fontSize);
  const turns = config.density * 0.8 + 1.2;
  const totalAngle = turns * 2 * Math.PI;
  // Espiral de Arquimedes: r = a * theta. Resolvemos a tal que en theta=totalAngle, r=maxRadius.
  const a = maxRadius / totalAngle;
  // Separacion objetivo entre marcas consecutivas a lo largo del arco. Modulada
  // por densidad, pero nunca menor que textWidth*0.6 para evitar solapamiento.
  // Density alta empaqueta mas; density baja deja mas aire entre cada marca.
  const densityScale = 1.6 - config.density * 0.1;
  const targetGap = Math.max(textWidth * 0.6, config.fontSize) * densityScale;
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
