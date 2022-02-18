import { indexObject } from './indexing';
import { load } from './loading';
import { applyMutations } from './mutate';

async function main() {
  const tree = await load(process.argv[2] ?? '.');
  const mutations = indexObject(tree);
  await applyMutations(mutations);
}

main().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
