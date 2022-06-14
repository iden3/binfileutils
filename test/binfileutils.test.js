import * as binFileUtils from "../src/binfileutils.js";
import path from "path";
import fs from "fs";
import assert from "assert";

import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const expect = chai.expect;

function getRandomValue(higher = 10) {
    return Math.floor((Math.random() * higher) + 1);
}

function createRandomSections(nSections) {
    let sections = Array(nSections);

    //Create random sections data
    let currentSectionId = 1;
    for (let i = 0; i < nSections; i++) {
        let section = {};
        section.id = currentSectionId;
        section.values = [];

        const nElements = getRandomValue(10);
        for (let j = 0; j < nElements; j++) {
            const value = getRandomValue();
            section.values.push(value);
        }

        currentSectionId += getRandomValue();
        sections[i] = section;
    }
    return sections;
}

async function createBinFile(fileName, fileType, fileVersion, nSections, sections) {
    let file = await binFileUtils.createBinFile(fileName, fileType, fileVersion, nSections, 1 << 22, 1 << 24);

    for (let i = 0; i < sections.length; i++) {
        await binFileUtils.startWriteSection(file, sections[i].id);
        for (let j = 0; j < sections[i].values.length; j++) {
            await file.writeULE32(sections[i].values[j]);
        }
        await binFileUtils.endWriteSection(file);
    }
    await file.close();
}

async function readBinFile(fileName, fileType, fileVersion, nSections, sections) {
    let res = [];
    let [readFile, readSections] = await binFileUtils.readBinFile(fileName, fileType, fileVersion, 1 << 22, 1 << 24);

    let sectionIdx = getRandomValue(nSections) - 1;

    for (let i = 0; i < nSections; i++) {
        let section = {};
        section.id = sections[sectionIdx].id;
        section.values = [];

        await binFileUtils.startReadUniqueSection(readFile, readSections, section.id);
        for (let j = 0; j < sections[sectionIdx].values.length; j++) {
            section.values.push(await readFile.readULE32());
        }
        await binFileUtils.endReadSection(readFile);
        res.push(section);
        sectionIdx = (sectionIdx + 1) % nSections;
    }
    await readFile.close();

    return res.sort((e1, e2) => e1.id - e2.id);
}

describe("Bin file utils tests", function () {
    this.timeout(60000);

    const fileName = path.join("test", "test.bin");
    const fileType = "test";

    it("creates a bin file using bin format 1 and reads the same content from the file", async () => {
        const nSections = getRandomValue();
        const sections = createRandomSections(nSections);

        //Write bin file
        const fileVersion = 1;
        await createBinFile(fileName, fileType, fileVersion, nSections, sections);
        assert(fs.existsSync(fileName));

        //Read bin file
        const readSections = await readBinFile(fileName, fileType, fileVersion, nSections, sections);

        assert.deepEqual(sections, readSections);

        await fs.promises.unlink(fileName);
    });

    it("creates a bin file using bin format 2 and reads the same content from the file", async () => {
        const nSections = getRandomValue();
        let sections = createRandomSections(nSections);

        //Write bin file
        const fileVersion = 1 | 0x10000000;
        await createBinFile(fileName, fileType, fileVersion, nSections, sections);
        assert(fs.existsSync(fileName));

        //Read bin file
        const readSections = await readBinFile(fileName, fileType, fileVersion, nSections, sections);

        assert.deepEqual(sections, readSections);

        await fs.promises.unlink(fileName);
    });

    it("throws an error when trying to write a section while already writing a section or close a section while not writing a section", async () => {
        const fileVersion = 1 | 0x10000000;
        let nSections = 0;
        let file = await binFileUtils.createBinFile(fileName, fileType, fileVersion, nSections, 1 << 22, 1 << 24);

        await binFileUtils.startWriteSection(file, 1);
        await expect(binFileUtils.startWriteSection(file, 2)).to.be.rejected;
        await binFileUtils.endWriteSection(file);
        await expect(binFileUtils.endWriteSection(file)).to.be.rejected;

        file.close();
        await fs.promises.unlink(fileName);
    });

    it("throws an error when trying to read a wrong type file or max version", async () => {
        const nSections = getRandomValue();
        let sections = createRandomSections(nSections);

        //Write bin file
        const fileVersion = 1 | 0x10000000;
        await createBinFile(fileName, fileType, fileVersion, nSections, sections);
        assert(fs.existsSync(fileName));

        //Read bin file with wrong type
        await expect(readBinFile(fileName, "xxxx", fileVersion, nSections, sections)).to.be.rejected;

        //Read bin file with wrong version
        await expect(readBinFile(fileName, fileType, 0, nSections, sections)).to.be.rejected;

        await fs.promises.unlink(fileName);
    });

    it("throws an error when closing a non-reading section, when already reading a section, when end reads a section while not read all the section or when section is missing ", async () => {
        const nSections = getRandomValue();
        let sections = createRandomSections(nSections);

        //Write bin file
        const fileVersion = 1 | 0x10000000;
        await createBinFile(fileName, fileType, fileVersion, nSections, sections);

        let [readFile, readSections] = await binFileUtils.readBinFile(fileName, fileType, fileVersion, 1 << 22, 1 << 24);

        await expect(binFileUtils.endReadSection(readFile)).to.be.rejected;

        await binFileUtils.startReadUniqueSection(readFile, readSections, sections[0].id);
        await expect(binFileUtils.startReadUniqueSection(readFile, readSections, sections[0].id)).to.be.rejected;

        await expect(binFileUtils.endReadSection(readFile)).to.be.rejected;
        await binFileUtils.endReadSection(readFile, true);

        await expect(binFileUtils.startReadUniqueSection(readFile, readSections, 1000000)).to.be.rejected;

        await fs.promises.unlink(fileName);
    });

});