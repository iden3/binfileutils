// binfileutils/vite.config.js
import { defineConfig } from "vite";
import { builtinModules } from "module";
import { readFileSync } from "fs";
import { resolve } from "path";
import { playwright } from "@vitest/browser-playwright";

const pkg = JSON.parse(readFileSync(resolve("package.json"), "utf-8"));

export default defineConfig(({ mode }) => {
    if (mode === "browser") {
        return {
            build: {
                lib: {
                    entry: "./src/binfileutils.js",
                    name: "binfileutils",
                    formats: ["es"],
                    fileName: () => "browser.esm.js",
                },
                outDir: "build/browser",
                emptyOutDir: true,
                rollupOptions: {
                    external: ["ffjavascript"],
                },
            },
            resolve: { conditions: ["browser"] },
        };
    }

    // Node (default)
    const external = [
        ...builtinModules,
        ...Object.keys(pkg.dependencies || {}),
    ];
    const isExternal = (id) =>
        external.includes(id) || external.some((e) => id.startsWith(e + "/"));

    return {
        build: {
            lib: {
                entry: "./src/binfileutils.js",
                formats: ["cjs"],
                fileName: () => "main.cjs",
            },
            minify: false,
            outDir: "build",
            emptyOutDir: false,
            rollupOptions: {
                external: isExternal,
            },
        },
        test: {
            projects: [
                {
                    test: {
                        name: "node-esm",
                        include: ["test/**/*.js"],
                        environment: "node",
                        globals: true,
                        testTimeout: 60_000,
                    },
                },
                {
                    resolve: { conditions: ["browser"] },
                    test: {
                        name: "browser",
                        include: ["test/browser.js"],
                        globals: true,
                        testTimeout: 60_000,
                        browser: {
                            provider: playwright(),
                            enabled: true,
                            headless: true,
                            instances: [{ browser: "chromium" }],
                        },
                    },
                },
            ],
        },
    };
});
