import Elysia from 'elysia';

export const trailingSlashPlugin = new Elysia({
  name: 'trailing-slash',
}).onBeforeHandle(({ request }) => {
  const url = request.url;
  // get the path from it
  const [path, query] = url.split('?');

  // console.log("request path", path, "query", query);

  if (!path.endsWith('/') && !path.includes('.')) {
    const newUrl = `${path}/${query ? `?${query}` : ''}`;
    console.log('trailing slash redirect for request', url);

    return new Response('', {
      status: 307,
      headers: {
        Location: newUrl,
      },
    });
  }
});
