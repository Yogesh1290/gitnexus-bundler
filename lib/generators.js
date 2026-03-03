import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

export const generateGitNexusManifest = async (cwd, outputFile) => {
  const manifestPath = path.join(cwd, 'gitnexus.json');

  // Try to grab project name from package.json automatically
  let projectName = path.basename(cwd);
  try {
    const pkg = await fs.readJson(path.join(cwd, 'package.json'));
    if (pkg.name) projectName = pkg.name;
  } catch (e) { }

  const manifest = {
    name: projectName,
    type: "dynamic",
    bundleUrl: `https://<YOUR_CLOUDFLARE_PROJECT>.pages.dev/${projectName}.cjs`
  };

  await fs.writeJson(manifestPath, manifest, { spaces: 4 });
  console.log(chalk.green(`  -> Generated gitnexus.json manifest.`));
  console.log(chalk.yellow(`     ⚠️  Action required: Update bundleUrl in gitnexus.json`));
  console.log(chalk.cyan(`     Recommended: Host on Cloudflare Pages (free, unlimited bandwidth)`));
  console.log(chalk.cyan(`     Guide: pages.cloudflare.com → Create project → Upload assets`));
};
