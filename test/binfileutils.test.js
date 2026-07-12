import assert from "assert";
import fs from "fs";
import path from "path";
import os from "os";
import http from "http";
import * as bfu from "../src/binfileutils.js";

// This repo had ZERO tests of any kind before this file: `npm test` ran mocha
// against an empty glob. Every byte this library parses (magic string,
// version, the section table) sits upstream of every zkey/ptau/wtns/r1cs file
// snarkjs reads, so a regression here silently corrupts every downstream
// consumer with nothing to catch it.
describe("binfileutils", function () {
    this.timeout(30000);

    // Most tests use an in-memory file (fastfile's {type:"mem"} backend) so
    // they run fast and need no cleanup; a couple of malformed/truncated-file
    // tests use a real temp file to exercise the on-disk (osfile) backend,
    // since that's the path that matters for actual zkey/ptau/wtns files.
    function memFile() {
        return { type: "mem" };
    }

    async function writeSimpleFile(sectionsData, opts) {
        const o = opts || memFile();
        const fd = await bfu.createBinFile(o, "test", 1, sectionsData.length, 1 << 20, 1 << 14);
        for (const { id, data } of sectionsData) {
            await bfu.startWriteSection(fd, id);
            if (data.length > 0) await fd.write(data);
            await bfu.endWriteSection(fd);
        }
        await fd.close();
        return fd.o;
    }

    it("round-trips a multi-section file written then read back", async () => {
        const o = await writeSimpleFile([
            { id: 1, data: new Uint8Array([1, 2, 3, 4]) },
            { id: 2, data: new Uint8Array([5, 6, 7]) },
        ]);

        const { fd, sections } = await bfu.readBinFile(o, "test", 1, 1 << 20, 1 << 14);
        const s1 = await bfu.readSection(fd, sections, 1);
        const s2 = await bfu.readSection(fd, sections, 2);
        assert.deepStrictEqual(Array.from(s1), [1, 2, 3, 4]);
        assert.deepStrictEqual(Array.from(s2), [5, 6, 7]);
        await fd.close();
    });

    it("rejects a file with the wrong magic string", async () => {
        const o = await writeSimpleFile([{ id: 1, data: new Uint8Array([1]) }]);
        await assert.rejects(
            () => bfu.readBinFile(o, "nope", 1, 1 << 20, 1 << 14),
            /Invalid File format/
        );
    });

    it("rejects a file with an unsupported (too new) version", async () => {
        const o = await writeSimpleFile([{ id: 1, data: new Uint8Array([1]) }]);
        // File was written with version 1; maxVersion 0 is too old to accept it.
        await assert.rejects(
            () => bfu.readBinFile(o, "test", 0, 1 << 20, 1 << 14),
            /Version not supported/
        );
    });

    it("startReadUniqueSection rejects a missing section id", async () => {
        const o = await writeSimpleFile([{ id: 1, data: new Uint8Array([1]) }]);
        const { fd, sections } = await bfu.readBinFile(o, "test", 1, 1 << 20, 1 << 14);
        await assert.rejects(
            () => bfu.startReadUniqueSection(fd, sections, 99),
            /Missing section 99/
        );
        await fd.close();
    });

    it("startReadUniqueSection rejects a duplicated section id", async () => {
        const fd = await bfu.createBinFile(memFile(), "test", 1, 2, 1 << 20, 1 << 14);
        await bfu.startWriteSection(fd, 1);
        await fd.write(new Uint8Array([1]));
        await bfu.endWriteSection(fd);
        await bfu.startWriteSection(fd, 1); // same id written twice
        await fd.write(new Uint8Array([2]));
        await bfu.endWriteSection(fd);
        await fd.close();

        const { fd: fd2, sections } = await bfu.readBinFile(fd.o, "test", 1, 1 << 20, 1 << 14);
        assert.strictEqual(sections[1].length, 2);
        await assert.rejects(
            () => bfu.startReadUniqueSection(fd2, sections, 1),
            /Section Duplicated 1/
        );
        await fd2.close();
    });

    it("endReadSection rejects when fewer bytes were read than the section declares", async () => {
        const o = await writeSimpleFile([{ id: 1, data: new Uint8Array([1, 2, 3]) }]);
        const { fd, sections } = await bfu.readBinFile(o, "test", 1, 1 << 20, 1 << 14);
        await bfu.startReadUniqueSection(fd, sections, 1);
        await fd.read(1); // only consume 1 of the 3 declared bytes
        await assert.rejects(
            () => bfu.endReadSection(fd),
            /Invalid section size reading/
        );
        await fd.close();
    });

    it("endReadSection with noCheck=true does not enforce the size match", async () => {
        const o = await writeSimpleFile([{ id: 1, data: new Uint8Array([1, 2, 3]) }]);
        const { fd, sections } = await bfu.readBinFile(o, "test", 1, 1 << 20, 1 << 14);
        await bfu.startReadUniqueSection(fd, sections, 1);
        await fd.read(1);
        await assert.doesNotReject(() => bfu.endReadSection(fd, true));
        await fd.close();
    });

    it("handles a zero-length section without error", async () => {
        const o = await writeSimpleFile([
            { id: 1, data: new Uint8Array(0) },
            { id: 2, data: new Uint8Array([9, 9, 9]) },
        ]);
        const { fd, sections } = await bfu.readBinFile(o, "test", 1, 1 << 20, 1 << 14);
        assert.strictEqual(sections[1][0].size, 0);
        const s1 = await bfu.readSection(fd, sections, 1);
        assert.strictEqual(s1.length, 0);
        const s2 = await bfu.readSection(fd, sections, 2);
        assert.deepStrictEqual(Array.from(s2), [9, 9, 9]);
        await fd.close();
    });

    it("readSection rejects a length that overruns the section's declared bounds", async () => {
        const o = await writeSimpleFile([{ id: 1, data: new Uint8Array([1, 2, 3]) }]);
        const { fd, sections } = await bfu.readBinFile(o, "test", 1, 1 << 20, 1 << 14);
        await assert.rejects(
            () => bfu.readSection(fd, sections, 1, 0, 100),
            /Reading out of the range of the section/
        );
        await fd.close();
    });

    it("copySection produces a byte-identical section in the destination file", async () => {
        const o = await writeSimpleFile([{ id: 1, data: new Uint8Array([10, 20, 30, 40, 50]) }]);
        const { fd: fdFrom, sections: secFrom } = await bfu.readBinFile(o, "test", 1, 1 << 20, 1 << 14);
        const fdTo = await bfu.createBinFile(memFile(), "test", 1, 1, 1 << 20, 1 << 14);
        await bfu.copySection(fdFrom, secFrom, fdTo, 1);
        await fdTo.close();
        await fdFrom.close();

        const { fd: fdCheck, sections: secCheck } = await bfu.readBinFile(fdTo.o, "test", 1, 1 << 20, 1 << 14);
        const copied = await bfu.readSection(fdCheck, secCheck, 1);
        assert.deepStrictEqual(Array.from(copied), [10, 20, 30, 40, 50]);
        await fdCheck.close();
    });

    it("sectionIsEqual returns true for identical sections and false for differing ones", async () => {
        const oA = await writeSimpleFile([{ id: 1, data: new Uint8Array([1, 2, 3]) }]);
        const oBequal = await writeSimpleFile([{ id: 1, data: new Uint8Array([1, 2, 3]) }]);
        const oBdiff = await writeSimpleFile([{ id: 1, data: new Uint8Array([1, 2, 4]) }]);

        const rA1 = await bfu.readBinFile(oA, "test", 1, 1 << 20, 1 << 14);
        const rBequal = await bfu.readBinFile(oBequal, "test", 1, 1 << 20, 1 << 14);
        assert.strictEqual(
            await bfu.sectionIsEqual(rA1.fd, rA1.sections, rBequal.fd, rBequal.sections, 1),
            true
        );
        await rA1.fd.close();
        await rBequal.fd.close();

        const rA2 = await bfu.readBinFile(oA, "test", 1, 1 << 20, 1 << 14);
        const rBdiff = await bfu.readBinFile(oBdiff, "test", 1, 1 << 20, 1 << 14);
        assert.strictEqual(
            await bfu.sectionIsEqual(rA2.fd, rA2.sections, rBdiff.fd, rBdiff.sections, 1),
            false
        );
        await rA2.fd.close();
        await rBdiff.fd.close();
    });

    it("writeBigInt/readBigInt round-trip a value spanning multiple 8-byte limbs", async () => {
        const value = 123456789012345678901234567890n;
        const fd = await bfu.createBinFile(memFile(), "test", 1, 1, 1 << 20, 1 << 14);
        await bfu.startWriteSection(fd, 1);
        await bfu.writeBigInt(fd, value, 32);
        await bfu.endWriteSection(fd);
        await fd.close();

        const { fd: fd2, sections } = await bfu.readBinFile(fd.o, "test", 1, 1 << 20, 1 << 14);
        await bfu.startReadUniqueSection(fd2, sections, 1);
        const readBack = await bfu.readBigInt(fd2, 32);
        assert.strictEqual(readBack, value);
        await bfu.endReadSection(fd2);
        await fd2.close();
    });

    // On-disk (osfile) regression: a section whose declared size exceeds what
    // the file actually contains (a truncated/corrupted zkey/ptau/wtns) must
    // fail loudly or degrade safely -- not silently hand back misplaced or
    // stale data. This exercises the real disk-backed path, not the in-memory
    // one, since that's what a corrupted file on disk actually looks like.
    it("readSection on a truncated on-disk file does not silently corrupt the returned buffer", async () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "binfileutils-test-"));
        const filePath = path.join(tmpDir, "truncated.bin");
        try {
            const fd = await bfu.createBinFile(filePath, "test", 1, 1, 1 << 20, 1 << 14);
            await bfu.startWriteSection(fd, 1);
            await fd.write(new Uint8Array(2000).fill(0xAB));
            await bfu.endWriteSection(fd);
            await fd.close();

            const fullSize = fs.statSync(filePath).size;
            const fh = fs.openSync(filePath, "r+");
            fs.ftruncateSync(fh, fullSize - 1000); // corrupt: chop off the last 1000 bytes
            fs.closeSync(fh);

            const { fd: fd2, sections } = await bfu.readBinFile(filePath, "test", 1, 1 << 20, 1 << 14);
            const declaredSize = sections[1][0].size;
            assert.strictEqual(declaredSize, 2000);

            let buff, threw = false;
            try {
                buff = await bfu.readSection(fd2, sections, 1);
            } catch {
                threw = true;
            }
            await fd2.close();

            if (!threw) {
                // If it didn't throw, the real bytes that DO exist on disk must
                // appear at the START of the buffer (not shifted to some other
                // offset), and only bytes past the actual file end may be zero.
                assert.strictEqual(buff.length, declaredSize);
                for (let i = 0; i < 1000; i++) {
                    assert.strictEqual(buff[i], 0xAB, `expected real data at index ${i}, the file's actual content`);
                }
            }
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    // End-to-end over HTTP: readBinFile with a URL must parse the header and
    // serve section reads via Range requests (fastfile's http backend) --
    // the path a browser prover takes for a zkey hosted on a CDN. A server
    // without range support must still work via the buffer-it-all fallback.
    describe("reading a bin file from a URL", function () {
        function serve(data, withRanges) {
            const log = { requests: [] };
            const server = http.createServer((req, res) => {
                log.requests.push(req.headers.range || null);
                const m = withRanges && req.headers.range ?
                    /^bytes=(\d+)-(\d+)$/.exec(req.headers.range) : null;
                if (m) {
                    const start = parseInt(m[1]);
                    const end = Math.min(parseInt(m[2]), data.length - 1);
                    const body = Buffer.from(data.slice(start, end + 1));
                    res.writeHead(206, {
                        "Content-Range": `bytes ${start}-${end}/${data.length}`,
                        "Content-Length": body.length,
                        "ETag": "\"v1\"",
                    });
                    res.end(body);
                } else {
                    res.writeHead(200, { "Content-Length": data.length });
                    res.end(Buffer.from(data));
                }
            });
            return new Promise((resolve) => {
                server.listen(0, "127.0.0.1", () => resolve({
                    url: `http://127.0.0.1:${server.address().port}/file.bin`,
                    log,
                    close: () => new Promise((r) => server.close(r)),
                }));
            });
        }

        async function roundTrip(withRanges) {
            const big = new Uint8Array(200000);
            for (let i = 0; i < big.length; i++) big[i] = (i * 7 + 3) & 0xFF;
            const o = await writeSimpleFile([
                { id: 1, data: new Uint8Array([9, 8, 7]) },
                { id: 2, data: big },
            ]);
            const srv = await serve(o.data, withRanges);
            try {
                const { fd, sections } = await bfu.readBinFile(srv.url, "test", 1);
                assert.strictEqual(sections[2][0].size, big.length);
                const s1 = await bfu.readSection(fd, sections, 1);
                const s2 = await bfu.readSection(fd, sections, 2);
                assert.deepStrictEqual(Array.from(s1), [9, 8, 7]);
                assert.deepStrictEqual(Buffer.from(s2), Buffer.from(big));
                // partial section read (what a streaming multiexp issues)
                const part = await bfu.readSection(fd, sections, 2, 1000, 5000);
                assert.deepStrictEqual(Buffer.from(part), Buffer.from(big.slice(1000, 6000)));
                await fd.close();
                return srv.log;
            } finally {
                await srv.close();
            }
        }

        it("streams header and sections via Range requests", async () => {
            const log = await roundTrip(true);
            for (const r of log.requests) assert.ok(r, "expected only Range requests");
        });

        it("falls back to full buffering when the server lacks Range support", async () => {
            const log = await roundTrip(false);
            assert.strictEqual(log.requests.length, 1);
        });
    });
});
