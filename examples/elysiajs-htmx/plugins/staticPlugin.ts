/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NotFoundError, Elysia } from 'elysia';

import { readdir, stat } from 'fs/promises';
import { resolve, resolve as resolveFn, join } from 'path';

const listFiles = async (dir: string): Promise<string[]> => {
  const files = await readdir(dir);

  const all = await Promise.all(
    files.map(async (name) => {
      const file = dir + '/' + name;
      const stats = await stat(file);

      return stats && stats.isDirectory()
        ? await listFiles(file)
        : [resolve(dir, file)];
    })
  );

  return all.flat();
};

export const staticPlugin = async <Prefix extends string = '/prefix'>(
  {
    assets = 'public',
    prefix = '/public' as Prefix,
    staticLimit = 1024,
    alwaysStatic = false,
    ignorePatterns = ['.DS_Store', '.git', '.env'],
    noExtension = false,
    resolve = resolveFn,
    headers = {},
  }: {
    /**
     * @default "public"
     *
     * Asset path to expose as public path
     */
    assets?: string;
    /**
     * @default '/public'
     *
     * Path prefix to create virtual mount path for the static directory
     */
    prefix?: Prefix;
    /**
     * @default 1024
     *
     * If total files exceed this number,
     * file will be handled via wildcard instead of static route
     * to reduce memory usage
     */
    staticLimit?: number;
    /**
     * @default false
     *
     * If set to true, file will always use static path instead
     */
    alwaysStatic?: boolean;
    /**
     * @default [] `Array<string | RegExp>`
     *
     * Array of file to ignore publication.
     * If one of the patters is matched,
     * file will not be exposed.
     */
    ignorePatterns?: Array<string | RegExp>;
    /**
     * Indicate if file extension is required
     *
     * Only works if `alwaysStatic` is set to true
     */
    noExtension?: boolean;
    /**
     * Nodejs resolve function
     */
    resolve?: (...pathSegments: string[]) => string;
    /**
     * Set headers
     */
    headers?: Record<string, string> | undefined;
  } = {
    assets: 'public',
    prefix: '/public' as Prefix,
    staticLimit: 1024,
    alwaysStatic: process.env.NODE_ENV === 'production',
    ignorePatterns: [],
    noExtension: false,
    resolve: resolveFn,
    headers: {},
  }
) => {
  if (prefix === '/') prefix = '' as Prefix;

  const shouldIgnore = (file: string) => {
    if (!ignorePatterns.length) return false;

    return ignorePatterns.find((pattern) => {
      if (typeof pattern === 'string') return pattern.includes(file);
      else return pattern.test(file);
    });
  };

  const app = new Elysia({
    name: 'static',
    seed: {
      assets,
      prefix,
      staticLimit,
      alwaysStatic,
      ignorePatterns,
      noExtension,
      resolve: resolve.toString(),
    },
  });

  if (
    alwaysStatic
    // ||
    // (process.env.ENV === 'production' && files.length <= staticLimit)
  ) {
    const files = await listFiles(resolveFn(assets));

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file || shouldIgnore(file)) continue;

      const response = Object.keys(headers).length
        ? () =>
            new Response(Bun.file(file), {
              headers,
            })
        : () => new Response(Bun.file(file));

      let fileName = file.replace(resolve(), '').replace(`${assets}/`, '');

      if (noExtension) {
        const temp = fileName.split('.');
        temp.splice(-1);

        fileName = temp.join('.');
      }

      app.get(join(prefix, fileName), response);
    }
  } else {
    if (
      // @ts-ignore
      !app.routes.find(
        ({ method, path }) => path === `${prefix}/*` && method === 'GET'
      )
    )
      app
        .onError(() => {
          //
        })
        .get(`${prefix}/*`, async ({ params }) => {
          const file = `${assets}/${(params as any)['*']}`;

          if (shouldIgnore(file)) throw new NotFoundError();

          return stat(file)
            .then(
              (status) =>
                new Response(Bun.file(file), {
                  headers,
                })
            )
            .catch((error) => {
              throw new NotFoundError();
            });
        });
  }

  return app;
};

export default staticPlugin;
