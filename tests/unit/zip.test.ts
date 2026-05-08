import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { buildOutputName, buildZipBlob } from "../../src/lib/zip";
import type { FileItem } from "../../src/lib/watermark/types";

function makeItem(name: string, mime: string, content = "x"): FileItem {
  const file = new File([content], name, { type: mime });
  const resultBlob = new Blob([content + "-watermarked"], { type: mime });
  return {
    id: name,
    file,
    type: mime === "application/pdf" ? "pdf" : "image",
    previewUrl: "blob:mock",
    status: "done",
    resultBlob,
  };
}

describe("buildOutputName", () => {
  it("sufija el nombre con -watermarked y conserva la extension", () => {
    const item = makeItem("dni-frente.png", "image/png");
    expect(buildOutputName(item)).toBe("dni-frente-watermarked.png");
  });

  it("acepta nombres con varios puntos", () => {
    const item = makeItem("contrato.v2.pdf", "application/pdf");
    expect(buildOutputName(item)).toBe("contrato.v2-watermarked.pdf");
  });

  it("usa el MIME para deducir la extension si no la trae el nombre", () => {
    const file = new File(["x"], "sinext", { type: "image/png" });
    const item: FileItem = {
      id: "1",
      file,
      type: "image",
      previewUrl: "blob:mock",
      status: "done",
      resultBlob: new Blob(["x"], { type: "image/png" }),
    };
    expect(buildOutputName(item)).toBe("sinext-watermarked.png");
  });
});

describe("buildZipBlob", () => {
  it("genera un Blob ZIP con cada archivo dentro", async () => {
    const items = [
      makeItem("a.png", "image/png", "uno"),
      makeItem("b.pdf", "application/pdf", "dos"),
    ];
    const blob = await buildZipBlob(items);
    expect(blob.size).toBeGreaterThan(0);
    const buffer = await blob.arrayBuffer();
    const zip = await JSZip.loadAsync(buffer);
    const names = Object.keys(zip.files);
    expect(names).toContain("a-watermarked.png");
    expect(names).toContain("b-watermarked.pdf");
  });

  it("ignora items sin resultBlob", async () => {
    const file = new File(["x"], "fail.png", { type: "image/png" });
    const items: FileItem[] = [
      { id: "1", file, type: "image", previewUrl: "blob:mock", status: "error" },
      makeItem("ok.png", "image/png"),
    ];
    const blob = await buildZipBlob(items);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const names = Object.keys(zip.files);
    expect(names).toEqual(["ok-watermarked.png"]);
  });
});
