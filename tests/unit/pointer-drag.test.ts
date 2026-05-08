import { describe, expect, it, vi } from "vitest";
import { createPointerDrag } from "../../src/lib/ui/pointer-drag";

describe("createPointerDrag", () => {
  it("registra pointermove y pointerup en window al iniciar", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const drag = createPointerDrag({ onMove: () => {}, getPointerId: () => 1 });

    drag.start();

    const events = addSpy.mock.calls.map((c) => c[0]);
    expect(events).toContain("pointermove");
    expect(events).toContain("pointerup");
    addSpy.mockRestore();
    drag.dispose();
  });

  it("elimina los listeners en dispose() incluso durante un arrastre activo", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const drag = createPointerDrag({ onMove: () => {}, getPointerId: () => 1 });

    drag.start();
    // Simulamos desmontaje del componente con el drag aun activo.
    drag.dispose();

    const events = removeSpy.mock.calls.map((c) => c[0]);
    expect(events).toContain("pointermove");
    expect(events).toContain("pointerup");
    removeSpy.mockRestore();
  });

  it("invoca onMove con la posicion del puntero durante el arrastre", () => {
    const onMove = vi.fn();
    const drag = createPointerDrag({ onMove, getPointerId: () => 1 });
    drag.start();

    const event = new PointerEvent("pointermove", { clientX: 123, clientY: 45 });
    window.dispatchEvent(event);

    expect(onMove).toHaveBeenCalledWith(123, 45);
    drag.dispose();
  });

  it("dispose es idempotente: llamarlo dos veces no lanza", () => {
    const drag = createPointerDrag({ onMove: () => {}, getPointerId: () => 1 });
    drag.start();
    drag.dispose();
    expect(() => drag.dispose()).not.toThrow();
  });

  it("pointerup automatico tambien limpia los listeners sin necesidad de dispose", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const drag = createPointerDrag({ onMove: () => {}, getPointerId: () => 1 });
    drag.start();

    window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1 }));

    const events = removeSpy.mock.calls.map((c) => c[0]);
    expect(events).toContain("pointermove");
    expect(events).toContain("pointerup");
    removeSpy.mockRestore();
    drag.dispose();
  });
});
