import path from 'path';
export const EMBEDDING_MODEL = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
export const EMBEDDING_DIMENSIONS = 384;
let extractor: Promise<any> | undefined;
let queue: Promise<unknown> = Promise.resolve();
// Native import is retained because the server compiles to CommonJS.
const importESM = new Function('specifier', 'return import(specifier)') as (name: string) => Promise<any>;
export async function embed(texts: string[]): Promise<number[][]> {
  const run = queue.then(async () => {
    extractor ??= importESM('@huggingface/transformers').then(async ({ pipeline, env }) => {
      env.cacheDir = path.resolve(__dirname, '../../.cache/embeddings');
      return pipeline('feature-extraction', EMBEDDING_MODEL, { dtype: 'q8', device: 'cpu' });
    }).catch(error => { extractor = undefined; throw error; });
    const model = await extractor;
    const rows: number[][] = [];
    for (const text of texts) {
      const result = await model(text, { pooling: 'mean', normalize: true, truncation: true });
      const vector = Array.from(result.data) as number[];
      if (vector.length !== EMBEDDING_DIMENSIONS || vector.some(n => !Number.isFinite(n))) throw new Error('Invalid local embedding');
      rows.push(vector);
    }
    return rows;
  });
  queue = run.catch(() => undefined);
  return run;
}
