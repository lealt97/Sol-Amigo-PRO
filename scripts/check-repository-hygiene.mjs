import { access, readdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');

const forbiddenRootPatterns = [
  /^fix_.*\.py$/,
  /^patch_.*\.py$/,
  /^check_.*\.cjs$/,
  /^get_.*\.cjs$/,
  /^test-.*\.cjs$/,
];

const forbiddenPaths = [
  '.github/workflows/apply-capa12-original.yml',
];

const rootEntries = await readdir(repositoryRoot, { withFileTypes: true });
const violations = rootEntries
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .filter((name) => forbiddenRootPatterns.some((pattern) => pattern.test(name)));

for (const relativePath of forbiddenPaths) {
  try {
    await access(path.join(repositoryRoot, relativePath), constants.F_OK);
    violations.push(relativePath);
  } catch {
    // O caminho não existe, como esperado.
  }
}

if (violations.length > 0) {
  console.error('Arquivos temporários ou obsoletos encontrados no repositório:');
  for (const violation of violations.sort()) {
    console.error(`- ${violation}`);
  }
  console.error('Mova ferramentas reutilizáveis para scripts/ com documentação ou remova-as antes do commit.');
  process.exit(1);
}

console.log('Higiene do repositório aprovada.');
