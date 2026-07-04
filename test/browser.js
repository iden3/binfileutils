// binfileutils/test/browser.js
import { describe, it, expect } from "vitest";
import {
    createBinFile,
    readBinFile,
    startWriteSection,
    endWriteSection,
    startReadUniqueSection,
    endReadSection,
} from "../src/binfileutils.js";

// In browser, fastfile.createOverride receives a non-string opts object
// and creates an in-memory file. After writing, opts.data holds the bytes.
// fastfile.readExisting accepts a Uint8Array directly, creating a read-only
// in-memory fd.
describe("binfileutils in-memory round-trip (browser-compatible)", () => {
    it("writes and reads a section using in-memory storage", async () => {
        const payload = new Uint8Array([0xAA, 0xBB, 0xCC, 0xDD, 0xEE]);

        // Use a plain object (not a string) as the file path — fastfile treats
        // non-string, non-Uint8Array values as raw opts and creates a mem file.
        const memOpts = { type: "mem", initialSize: 4096 };

        // Write
        const wfd = await createBinFile(memOpts, "test", 1, 1);
        await startWriteSection(wfd, 1);
        await wfd.write(payload);
        await endWriteSection(wfd);
        const writtenBytes = wfd.o.data.slice(0, wfd.pos);
        await wfd.close();

        // Read — pass Uint8Array; fastfile browser wraps it as a read-only mem fd
        const { fd, sections } = await readBinFile(writtenBytes, "test", 1);
        await startReadUniqueSection(fd, sections, 1);
        const result = await fd.read(payload.length);
        await endReadSection(fd);
        await fd.close();

        expect(Array.from(result)).toEqual(Array.from(payload));
    });
});
