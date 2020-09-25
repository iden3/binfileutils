import resolve from "rollup-plugin-node-resolve";
import commonJS from "rollup-plugin-commonjs";

export default {
    input: "./src/binfileutils.js",
    output: {
        file: "build/main.cjs",
        format: "cjs",
    },
    external: [
        "ffjavascript",
        "fastfile"
    ],
    plugins: [
        resolve({ preferBuiltins: true }),
        commonJS({
            preserveSymlinks: true
        }),
    ]
};

