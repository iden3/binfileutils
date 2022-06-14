
import  { Scalar, BigBuffer } from "ffjavascript";
import * as fastFile from "fastfile";

const BIN_FORMAT_1 = 0x00000000;
const BIN_FORMAT_2 = 0x10000000;

export async function readBinFile(fileName, type, maxVersion, cacheSize, pageSize) {

    const fd = await fastFile.readExisting(fileName, cacheSize, pageSize);

    const b = await fd.read(4);
    let readedType = "";
    for (let i=0; i<4; i++) readedType += String.fromCharCode(b[i]);

    if (readedType !== type) throw new Error(fileName + ": Invalid File format");

    let v = await fd.readULE32();

    let [version, binVersion] = decodeVersion(v);

    if (version > maxVersion) throw new Error("Version not supported");

    let sections = [];

    if(BIN_FORMAT_1 === binVersion) {
        await readBinFileV1();
    } else {
        await readBinFileV2();
    }

    fd.binVersion = binVersion;

    return [fd, sections];

    async function readBinFileV1() {
        const nSections = await fd.readULE32();

        // Scan sections
        for (let i = 0; i < nSections; i++) {
            let ht = await fd.readULE32();
            let hl = await fd.readULE64();
            if (typeof sections[ht] == "undefined") sections[ht] = [];
            sections[ht].push({
                p: fd.pos,
                size: hl
            });
            fd.pos += hl;
        }
    }

    async function readBinFileV2() {
        //Reserved sections table size
        const nReservedSections = await fd.readULE32();

        //Get sections
        for (let i = 0; i < nReservedSections; i++) {
            //Section id
            let sectionId = await fd.readULE32();
            //Section size
            let sectionSize = await fd.readULE64();
            //Offset
            let sectionOffset = await fd.readULE64();
            if (sectionId !== 0) {
                if (sections[sectionId] === undefined) sections[sectionId] = [];
                sections[sectionId].push({
                    p: sectionOffset,
                    size: sectionSize,
                });
            }
        }
    }
}

export async function createBinFile(fileName, type, version, nSections, cacheSize, pageSize) {
    const fd = await fastFile.createOverride(fileName, cacheSize, pageSize);

    const buff = new Uint8Array(4);
    for (let i=0; i<4; i++) buff[i] = type.charCodeAt(i);
    await fd.write(buff, 0); // Magic "r1cs"

    await fd.writeULE32(version); // Version

    let [fileVersion, binVersion] = decodeVersion(version);

    if(BIN_FORMAT_1 === binVersion) {
        await fd.writeULE32(nSections); // Number of Sections
    } else {
        let nReservedSections = Math.ceil(nSections / 256) * 256;
        await fd.writeULE32(nReservedSections); // Number of reserved sections

        fd.pSectionsTable = fd.pos;
        for (let i = 0; i < nReservedSections; i++) {
            await fd.writeULE32(0); // Section type
            await fd.writeULE64(0); // Section size
            await fd.writeULE64(0); // Absolute offset
        }
    }

    fd.binVersion = binVersion;

    return fd;
}

export async function startWriteSection(fd, idSection) {
    if (typeof fd.writingSection !== "undefined") throw new Error("Already writing a section");

    if(BIN_FORMAT_1 === fd.binVersion) {
        await fd.writeULE32(idSection); // Header type
        fd.writingSection = {
            pSectionSize: fd.pos
        };
        await fd.writeULE64(0); // Temporally set to 0 length
    } else {
        fd.writingSection = {
            pSectionSize: fd.pos
        };
        const currentPos = fd.pos;
        fd.pos = fd.pSectionsTable;
        await fd.writeULE32(idSection); // Section type
        await fd.writeULE64(0); // Section size, temporally set to 0
        await fd.writeULE64(currentPos); // Absolute offset
        fd.pos = currentPos;
    }
}

export async function endWriteSection(fd) {
    if (typeof fd.writingSection === "undefined") throw new Error("Not writing a section");

    if(BIN_FORMAT_1 === fd.binVersion) {
        const sectionSize = fd.pos - fd.writingSection.pSectionSize - 8;
        const oldPos = fd.pos;
        fd.pos = fd.writingSection.pSectionSize;
        await fd.writeULE64(sectionSize);
        fd.pos = oldPos;
        delete fd.writingSection;
    } else {
        const sectionSize = fd.pos - fd.writingSection.pSectionSize;
        const currentPos = fd.pos;
        fd.pos = fd.pSectionsTable + 4;
        await fd.writeULE64(sectionSize); // Section size
        fd.pos = currentPos;
        fd.pSectionsTable += 20;
        delete fd.writingSection;
    }
}

export async function startReadUniqueSection(fd, sections, idSection) {
    if (typeof fd.readingSection !== "undefined") throw new Error("Already reading a section");
    if (!sections[idSection])  throw new Error(fd.fileName + ": Missing section "+ idSection );
    if (sections[idSection].length>1) throw new Error(fd.fileName +": Section Duplicated " +idSection);

    fd.pos = sections[idSection][0].p;

    fd.readingSection = sections[idSection][0];
}

export async function endReadSection(fd, noCheck) {
    if (typeof fd.readingSection === "undefined") throw new Error("Not reading a section");
    if (!noCheck) {
        if (fd.pos-fd.readingSection.p !=  fd.readingSection.size) throw new Error("Invalid section size reading");
    }
    delete fd.readingSection;
}

export async function writeBigInt(fd, n, n8, pos) {
    const buff = new Uint8Array(n8);
    Scalar.toRprLE(buff, 0, n, n8);
    await fd.write(buff, pos);
}

export async function readBigInt(fd, n8, pos) {
    const buff = await fd.read(n8, pos);
    return Scalar.fromRprLE(buff, 0, n8);
}

export async function copySection(fdFrom, sections, fdTo, sectionId, size) {
    if (typeof size === "undefined") {
        size = sections[sectionId][0].size;
    }
    const chunkSize = fdFrom.pageSize;
    await startReadUniqueSection(fdFrom, sections, sectionId);
    await startWriteSection(fdTo, sectionId);
    for (let p=0; p<size; p+=chunkSize) {
        const l = Math.min(size -p, chunkSize);
        const buff = await fdFrom.read(l);
        await fdTo.write(buff);
    }
    await endWriteSection(fdTo);
    await endReadSection(fdFrom, size != sections[sectionId][0].size);

}

export async function readSection(fd, sections, idSection, offset, length) {

    offset = (typeof offset === "undefined") ? 0 : offset;
    length = (typeof length === "undefined") ? sections[idSection][0].size - offset : length;

    if (offset + length > sections[idSection][0].size) {
        throw new Error("Reading out of the range of the section");
    }

    let buff;
    if (length < (1 << 30) ) {
        buff = new Uint8Array(length);
    } else {
        buff = new BigBuffer(length);
    }

    await fd.readToBuffer(buff, 0, length, sections[idSection][0].p + offset);
    return buff;
}

export async function sectionIsEqual(fd1, sections1, fd2, sections2, idSection) {
    const MAX_BUFF_SIZE = fd1.pageSize * 16;
    await startReadUniqueSection(fd1, sections1, idSection);
    await startReadUniqueSection(fd2, sections2, idSection);
    if (sections1[idSection][0].size != sections2[idSection][0].size) return false;
    const totalBytes=sections1[idSection][0].size;
    for (let i=0; i<totalBytes; i+= MAX_BUFF_SIZE) {
        const n = Math.min(totalBytes-i, MAX_BUFF_SIZE);
        const buff1 = await fd1.read(n);
        const buff2 = await fd2.read(n);
        for (let j=0; j<n; j++) if (buff1[j] != buff2[j]) return false;
    }
    await endReadSection(fd1);
    await endReadSection(fd2);
    return true;
}

function decodeVersion(encodedVersion) {
    let binVersion = encodedVersion & BIN_FORMAT_2;

    let version;
    if(BIN_FORMAT_2 === binVersion) {
        version = encodedVersion - BIN_FORMAT_2;
    }

    return [version, binVersion];
}