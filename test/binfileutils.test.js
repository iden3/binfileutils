import * as binFileUtils from "../src/binfileutils.js";
import path from "path";
import assert from "assert";
import fs from "fs";

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

describe("Bin file utils tests", function () {
    this.timeout(60000);

    const fileName = path.join("test", "test.bin");
    const fileType = "test";

    it("creates and fills a bin file using bin format 1 and reads the same content from the file", async () => {
        const nSections = getRandomValue();
        let sections = createRandomSections(nSections);

        //Write bin file
        const fileVersion = 1 | 0x10000000;

        let file = await binFileUtils.createBinFile(fileName, fileType, fileVersion, nSections, 1 << 22, 1 << 24);

        for (let i = 0; i < sections.length; i++) {
            await binFileUtils.startWriteSection(file, sections[i].id);
            for (let j = 0; j < sections[i].values.length; j++) {
                await file.writeULE32(sections[i].values[j]);
            }
            await binFileUtils.endWriteSection(file);
        }
        await file.close();

        assert(fs.existsSync(fileName));

        //Read bin file
        let [readFile, readSections] = await binFileUtils.readBinFile(fileName, "test", fileVersion, 1 << 22, 1 << 24);
        let sections2 = [];

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
            sections2.push(section);
            sectionIdx = (sectionIdx + 1) % nSections;
        }

        sections2 = sections2.sort((e1, e2) => e1.id - e2.id);

        assert.deepEqual(sections, sections2);

        await fs.promises.unlink(fileName);
    });

    it("creates and fills a bin file using bin format 2 and reads the same content from the file", async () => {
        const nSections = getRandomValue();
        let sections = createRandomSections(nSections);

        //Write bin file
        const fileVersion = 1 | 0x10000000;

        let file = await binFileUtils.createBinFile(fileName, fileType, fileVersion, nSections, 1 << 22, 1 << 24);

        for (let i = 0; i < sections.length; i++) {
            await binFileUtils.startWriteSection(file, sections[i].id);
            for (let j = 0; j < sections[i].values.length; j++) {
                await file.writeULE32(sections[i].values[j]);
            }
            await binFileUtils.endWriteSection(file);
        }
        await file.close();

        assert(fs.existsSync(fileName));

        //Read bin file
        let [readFile, readSections] = await binFileUtils.readBinFile(fileName, "test", fileVersion, 1 << 22, 1 << 24);
        let sections2 = [];

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
            sections2.push(section);
            sectionIdx = (sectionIdx + 1) % nSections;
        }

        sections2 = sections2.sort((e1, e2) => e1.id - e2.id);

        assert.deepEqual(sections, sections2);

        await fs.promises.unlink(fileName);
    });


});