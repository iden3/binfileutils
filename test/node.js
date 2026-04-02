// binfileutils/test/node.js
import { describe, it, expect } from "vitest";
import os from "os";
import path from "path";
import {
    createBinFile,
    readBinFile,
    startWriteSection,
    endWriteSection,
    startReadUniqueSection,
    endReadSection,
} from "../src/binfileutils.js";

describe("binfileutils node round-trip (tmp file)", () => {
    it("writes and reads a section via tmp file", async () => {
        const tmpPath = path.join(os.tmpdir(), `binfileutils_test_${Date.now()}.bin`);
        const payload = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05]);

        // Write
        const wfd = await createBinFile(tmpPath, "test", 1, 1);
        await startWriteSection(wfd, 1);
        await wfd.write(payload);
        await endWriteSection(wfd);
        await wfd.close();

        // Read
        const { fd, sections } = await readBinFile(tmpPath, "test", 1);
        await startReadUniqueSection(fd, sections, 1);
        const result = await fd.read(payload.length);
        await endReadSection(fd);
        await fd.close();

        expect(Array.from(result)).toEqual(Array.from(payload));
    });
});
