import esbuild from 'esbuild';
import chalk from 'chalk';
import { builtinModules } from 'module';
import fs from 'fs-extra';
import path from 'path';

export const runBundler = async (inputPath, outputPath, staticDir) => {
    try {
        // Node built-in modules — esbuild must never try to bundle these
        const externalModules = builtinModules;

        // Add common problematic enterprise polyfills to externals
        const safeExternals = [
            ...externalModules,
            'react-native',
            'react-native-fs',
            'react-native-fetch-blob',
            'xlsx',
            'cptable',
            'jszip',
            'sqlite3'
        ];

        await esbuild.build({
            entryPoints: [inputPath],
            bundle: true,
            platform: 'node',
            format: 'cjs', // CRITICAL: Forces CommonJS to fix 'Dynamic require' ESM WebContainer bugs
            outfile: outputPath,
            minify: true,
            external: safeExternals,
        });

        if (staticDir) {
            const fullStaticDir = path.resolve(process.cwd(), staticDir);
            if (fs.existsSync(fullStaticDir)) {
                console.log(chalk.cyan(`🗜️  Compressing and embedding static directory: ${staticDir}`));
                const files = [];
                const walk = (dir) => {
                    for (const file of fs.readdirSync(dir)) {
                        const filePath = path.join(dir, file);
                        if (fs.statSync(filePath).isDirectory()) {
                            walk(filePath);
                        } else {
                            files.push(filePath);
                        }
                    }
                };
                walk(fullStaticDir);

                const vfs = {};
                for (const file of files) {
                    const relativePath = path.relative(process.cwd(), file).replace(/\\/g, '/');
                    vfs[relativePath] = fs.readFileSync(file, 'base64');
                }

                const extractionScript = `
// --- NEXUS VFS AUTO-EXTRACTION ---
const _fs = require('fs');
const _path = require('path');
const _vfs = ${JSON.stringify(vfs)};
for (const [filepath, base64] of Object.entries(_vfs)) {
    const fullPath = _path.join(process.cwd(), filepath);
    _fs.mkdirSync(_path.dirname(fullPath), { recursive: true });
    _fs.writeFileSync(fullPath, Buffer.from(base64, 'base64'));
}
// ----------------------------------
`;
                const currentBundle = await fs.readFile(outputPath, 'utf-8');
                await fs.writeFile(outputPath, extractionScript + '\n' + currentBundle);
                console.log(chalk.green(`✅ Embedded ${files.length} static assets from ${staticDir} directly into the executable.`));
            } else {
                console.warn(chalk.yellow(`⚠️ Static directory ${staticDir} not found, skipping VFS embedding.`));
            }
        }

    } catch (error) {
        console.error(chalk.red('Failed to compile the GitNexus bundle:'));
        throw error;
    }
};
