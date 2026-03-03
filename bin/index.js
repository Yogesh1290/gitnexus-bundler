#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import { runBundler } from '../lib/bundler.js';
import { generateGitNexusManifest, injectGitHubAction } from '../lib/generators.js';

program
    .name('nexus-bundle')
    .description('Universal CLI to compile any Node.js/Express repository into a GitNexus Cloud Bundle')
    .version('1.0.0');

program
    .command('build')
    .description('Bundles a Node.js API into a universal GitNexus bundle')
    .requiredOption('-i, --input <path>', 'Entry point file (e.g., src/server.js)')
    .option('-o, --output <path>', 'Output bundle file', 'gitnexus-bundle.cjs')
    .option('-f, --frontend <command>', 'A frontend build command to run before bundling (e.g., "npm run build")')
    .option('-s, --static <dir>', 'A directory containing static frontend assets to embed (e.g., "out" or "dist")')
    .action(async (options) => {
        try {
            console.log(chalk.blue('🚀 Starting GitNexus Universal Bundler...'));

            const inputPath = path.resolve(process.cwd(), options.input);
            const outputPath = path.resolve(process.cwd(), options.output);

            if (options.frontend) {
                console.log(chalk.yellow(`🛠️ Executing frontend build command: ${options.frontend}`));
                try {
                    execSync(options.frontend, { stdio: 'inherit', cwd: process.cwd() });
                    console.log(chalk.green('✅ Frontend build complete.'));
                } catch (err) {
                    console.error(chalk.red('❌ Frontend build failed.'));
                    process.exit(1);
                }
            }

            if (!fs.existsSync(inputPath)) {
                console.error(chalk.red(`❌ Error: Input file ${inputPath} does not exist.`));
                process.exit(1);
            }

            console.log(chalk.yellow(`📦 Bundling ${options.input} -> ${options.output}...`));
            await runBundler(inputPath, outputPath, options.static);

            console.log(chalk.yellow('📄 Generating gitnexus.json manifest...'));
            await generateGitNexusManifest(process.cwd(), options.output);

            console.log(chalk.yellow('⚙️ Injecting GitHub Actions Release Workflow...'));
            await injectGitHubAction(process.cwd(), options.input, options.frontend, options.static);

            console.log(chalk.green('\n✅ Success! Your repository is now fully GitNexus compatible.'));
            console.log(chalk.gray('Push your code to the main branch to trigger the automatic GitHub release.'));

        } catch (error) {
            console.error(chalk.red('\n❌ Bundling failed:'), error);
            process.exit(1);
        }
    });

program.parse(process.argv);
