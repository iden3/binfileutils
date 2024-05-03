import {ok} from 'node:assert';

import * as binFileUtils from "../src/binfileutils.js";

describe('readBinFile', function() {
  it('should read a valid binfile' , async function() {
    const result = await binFileUtils.readBinFile('test/valid.bin', "zkey", 2);
    ok(result);
  });

  it('should fail to read an invalid binfile' , async function() {
    let hadError;

    try {
      await binFileUtils.readBinFile('test/invalid.bin', "zkey", 2);
    } catch(error) {
      if(error.message.match(/Invalid pointer/)) {
        hadError = true;
      }
    }

    ok(hadError);
  });
});
