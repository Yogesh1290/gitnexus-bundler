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
    const match = gitRemote.match(/github\.com[:/]([\w-]+)\/([\w-]+)(?:\.git)?/);
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
