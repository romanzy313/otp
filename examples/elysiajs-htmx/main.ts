import { Elysia } from 'elysia';
import { html } from '@elysiajs/html';
import { trailingSlashPlugin } from './plugins/trailingSlashPlugin';
import staticPlugin from '@elysiajs/static';
import { otpHandler } from './routes/otp/handler';
import { index } from './routes';

new Elysia()
  .use(
    staticPlugin({
      assets: 'public',
      prefix: '/public',
    })
  )
  .use(
    staticPlugin({
      assets: 'node_modules/htmx.org/dist',
      prefix: '/htmx',
    })
  )
  .use(trailingSlashPlugin)
  .use(html())
  .use(index)
  .use(otpHandler)
  .listen(8080, (server) => {
    console.log(`Listening on http://localhost:${server.port}`);
  });
