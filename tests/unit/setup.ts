// Setup mínimo para Vitest en entorno jsdom.

// Polyfill de crypto.randomUUID si jsdom antiguo no lo trae.
if (typeof globalThis.crypto === "undefined") {
  // @ts-expect-error inyeccion controlada para tests
  globalThis.crypto = {};
}

if (typeof globalThis.crypto.randomUUID !== "function") {
  globalThis.crypto.randomUUID = (() => {
    let counter = 0;
    return () => {
      counter += 1;
      return `00000000-0000-4000-8000-${counter.toString().padStart(12, "0")}` as `${string}-${string}-${string}-${string}-${string}`;
    };
  })();
}

// jsdom no implementa Blob.arrayBuffer ni File.arrayBuffer; los polyfilleamos
// usando FileReader, que si esta disponible. Esto solo afecta al entorno de tests.
function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (result instanceof ArrayBuffer) {
        resolve(result);
      } else {
        reject(new Error("FileReader devolvio un tipo inesperado"));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("FileReader fallo"));
    reader.readAsArrayBuffer(blob);
  });
}

if (typeof Blob !== "undefined" && typeof Blob.prototype.arrayBuffer !== "function") {
  Blob.prototype.arrayBuffer = function arrayBuffer(this: Blob): Promise<ArrayBuffer> {
    return blobToArrayBuffer(this);
  };
}

if (typeof File !== "undefined" && typeof File.prototype.arrayBuffer !== "function") {
  File.prototype.arrayBuffer = function arrayBuffer(this: File): Promise<ArrayBuffer> {
    return blobToArrayBuffer(this);
  };
}

// jsdom no implementa URL.createObjectURL/revokeObjectURL. Devolvemos un string
// estable y aceptamos la revocacion como no-op; los tests no consumen el blob.
if (typeof URL.createObjectURL !== "function") {
  let counter = 0;
  URL.createObjectURL = (_blob: Blob): string => {
    counter += 1;
    return `blob:fake/${counter}`;
  };
}
if (typeof URL.revokeObjectURL !== "function") {
  URL.revokeObjectURL = (_url: string): void => {};
}

// jsdom no implementa PointerEvent. Como nuestros tests de drag necesitan
// crear y despachar eventos de tipo pointer, lo aliasamos a MouseEvent con
// las propiedades minimas que usamos (clientX, clientY, pointerId).
if (typeof globalThis.PointerEvent === "undefined") {
  class FakePointerEvent extends MouseEvent {
    readonly pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
    }
  }
  // @ts-expect-error inyeccion controlada para tests
  globalThis.PointerEvent = FakePointerEvent;
}
