/**
 * scripts/map_outline_to_scene.mjs
 * CLI runner to execute outlineToScene pure mapper from Node.js
 */

import fs from 'fs';
import { outlineToScene, validateOutline, validateScene } from '../outline_to_hyperframes.js';

const outlinePath = process.argv[2];
const outputPath = process.argv[3];
const projectId = process.argv[4];

if (!outlinePath) {
  console.error('Usage: node map_outline_to_scene.mjs <outlinePath> [outputPath] [projectId]');
  process.exit(1);
}

try {
  const outlineRaw = JSON.parse(fs.readFileSync(outlinePath, 'utf-8'));
  validateOutline(outlineRaw);
  const scene = outlineToScene(outlineRaw, { projectId: projectId || outlineRaw.projectId || 'sample' });
  validateScene(scene);

  if (outputPath) {
    fs.writeFileSync(outputPath, JSON.stringify(scene, null, 2), 'utf-8');
  } else {
    process.stdout.write(JSON.stringify(scene));
  }
} catch (err) {
  console.error('Mapping failed:', err.message);
  process.exit(1);
}
