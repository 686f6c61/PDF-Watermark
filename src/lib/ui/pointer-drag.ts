// Helper de drag con pointer events que garantiza la limpieza de listeners
// incluso si el componente se desmonta durante un arrastre activo.
// Sin este helper, los listeners de window quedaban huerfanos al desaparecer
// el contenedor que llamaba a setPointerCapture (issue de leak).

export type PointerDragOptions = {
  onMove: (clientX: number, clientY: number) => void;
  // pointerId es opcional; si no se conoce de antemano, devolvemos null y
  // el helper se vincula al primer pointerdown emitido por start().
  getPointerId?: () => number | null;
  // Capturador opcional para liberar pointerCapture en pointerup.
  releaseCapture?: (pointerId: number) => void;
};

export type PointerDragHandle = {
  start: () => void;
  dispose: () => void;
};

export function createPointerDrag(options: PointerDragOptions): PointerDragHandle {
  let active = false;
  let disposed = false;
  let activePointerId: number | null = null;

  function handleMove(ev: PointerEvent) {
    options.onMove(ev.clientX, ev.clientY);
  }

  function handleUp(ev: PointerEvent) {
    if (activePointerId !== null && options.releaseCapture) {
      try {
        options.releaseCapture(ev.pointerId);
      } catch {
        // Si el contenedor ya no existe, ignoramos.
      }
    }
    teardownListeners();
  }

  function teardownListeners() {
    if (!active) return;
    window.removeEventListener("pointermove", handleMove);
    window.removeEventListener("pointerup", handleUp);
    window.removeEventListener("pointercancel", handleUp);
    active = false;
    activePointerId = null;
  }

  return {
    start() {
      if (disposed || active) return;
      active = true;
      activePointerId = options.getPointerId ? options.getPointerId() : null;
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("pointercancel", handleUp);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      teardownListeners();
    },
  };
}
