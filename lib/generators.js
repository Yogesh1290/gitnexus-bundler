import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { execSync } from 'child_process';

export const generateGitNexusManifest = async (cwd, outputFile) => {
  const manifestPath = path.join(cwd, 'gitnexus.json');

  // Try to grab project name from package.json automatically
  let projectName = path.basename(cwd);
  try {
    const pkg = await fs.readJson(path.join(cwd, 'package.json'));
    if (pkg.name) projectName = pkg.name;
  } catch (e) { }

  let gitUsername = '<YOUR_GITHUB_USERNAME>';
  let gitRepo = '<YOUR_REPO_NAME>';

  try {
    const gitRemote = execSync('git config --get remote.origin.url', { cwd, encoding: 'utf-8' }).trim();
    // Parse strings like git@github.com:User/repo.git or https://github.com/User/repo.git
    const match = gitRemote.match(/github\.com[:/]([\\w-]+)\/([\\w-]+)(?:\\.git)?/);
    if (match) {
      gitUsername = match[1];
      gitRepo = match[2];
    }
  } catch (e) {
    // Fails silently if git is not initialized or remote is not set
  }

  const manifest = {
    name: projectName,
    type: "dynamic",
    bundleUrl: `https://github.com/${gitUsername}/${gitRepo}/releases/download/latest/gitnexus-bundle.cjs`
  };

  await fs.writeJson(manifestPath, manifest, { spaces: 4 });
  console.log(chalk.green(`  -> Generated gitnexus.json manifest.`));

  if (gitUsername === '<YOUR_GITHUB_USERNAME>') {
    console.log(chalk.yellow(`     (Remember to replace <YOUR_GITHUB_USERNAME> and <YOUR_REPO_NAME> in gitnexus.json)`));
  } else {
    console.log(chalk.green(`     (Auto-detected GitHub repo: ${gitUsername}/${gitRepo})`));
  }
};

export const injectGitHubAction = async (cwd, inputPath = 'src/server.js', frontendCmd = null, staticDir = null) => {
  const workflowDir = path.join(cwd, '.github', 'workflows');
  await fs.ensureDir(workflowDir);

  const workflowPath = path.join(workflowDir, 'gitnexus-release.yml');
  const workflowCode = `name: Build and Release GitNexus Bundle

on:
  push:
    branches:
      - main
      - master

jobs:
  build-and-release:
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - name: Checkout Source Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Dependencies
        run: npm install

${frontendCmd ? `      - name: Build Frontend UI
        run: ${frontendCmd}
` : ''}
      - name: Build GitNexus Bundle
        run: npx esbuild ${inputPath} --bundle --platform=node --format=cjs --outfile=gitnexus-bundle.cjs --minify --external:react-native --external:react-native-fs --external:react-native-fetch-blob --external:xlsx --external:cptable --external:jszip --external:sqlite3
${staticDir ? `
      - name: Inject Virtual File System
        run: |
          cat << 'EOF' > nexus-embed.cjs
          const fs = require('fs');
          const path = require('path');
          const out = '${staticDir}';
          if(!fs.existsSync(out)) process.exit(0);
          const files = [];
          const walk = d => {
            for(const f of fs.readdirSync(d)){
              const fp = path.join(d,f);
              if(fs.statSync(fp).isDirectory()) walk(fp); else files.push(fp);
            }
          };
          walk(out);
          const vfs = {};
          for(const f of files) vfs[path.relative(process.cwd(), f).replace(/\\\\/g, '/')] = fs.readFileSync(f, 'base64');
          const script = '\\n// --- NEXUS VFS AUTO-EXTRACTION ---\\nconst _fs = require("fs");\\nconst _path = require("path");\\nconst _vfs = ' + JSON.stringify(vfs) + ';\\nfor(const [p, b] of Object.entries(_vfs)){\\n  const fp = _path.join(process.cwd(), p);\\n  _fs.mkdirSync(_path.dirname(fp), {recursive: true});\\n  _fs.writeFileSync(fp, Buffer.from(b, "base64"));\\n}\\n// ----------------------------------\\n';
          fs.writeFileSync('gitnexus-bundle.cjs', script + fs.readFileSync('gitnexus-bundle.cjs', 'utf-8'));
          EOF
          node nexus-embed.cjs
` : ''}

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: latest
          name: Latest GitNexus Bundle
          files: gitnexus-bundle.cjs
          make_latest: true
`;

  await fs.writeFile(workflowPath, workflowCode);
  console.log(chalk.green(`  -> Injected .github/workflows/gitnexus-release.yml`));
};
