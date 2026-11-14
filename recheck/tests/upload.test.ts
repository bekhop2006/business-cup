import { describe, expect, it } from "vitest";
import { sniffUploadType } from "@/lib/schemas/upload";

const bytes = (...values: number[]) => new Uint8Array(values);
const text = (value: string) => new TextEncoder().encode(value);

describe("sniffUploadType", () => {
  it("recognises PDFs and the supported image formats by their first bytes", () => {
    expect(sniffUploadType(text("%PDF-1.7"))).toBe("application/pdf");
    expect(sniffUploadType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(sniffUploadType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d))).toBe("image/png");
    expect(sniffUploadType(text("RIFF\0\0\0\0WEBPVP8 "))).toBe("image/webp");
  });

  it("rejects anything else, whatever its name", () => {
    expect(sniffUploadType(text("<html>"))).toBeNull();
    expect(sniffUploadType(text("RIFF\0\0\0\0WAVEfmt "))).toBeNull();
    expect(sniffUploadType(new Uint8Array())).toBeNull();
  });
});
