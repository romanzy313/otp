import { Elysia } from 'elysia';
import { html } from '@elysiajs/html';
import { trailingSlashPlugin } from './plugins/trailingSlashPlugin';
import staticPlugin from '@elysiajs/static';
import { otpHandler } from './otpRoutes';
import { index } from './routes';
import { RootLayout } from './templates/RootLayout';

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
  .get('/', () => (
    <RootLayout title="@romanzy/otp example">
      <h1>@romanzy/otp and htmx example</h1>

      <div>
        To see how login is done go to <a href="/otp/">test page</a>
      </div>
    </RootLayout>
  ))
  .use(otpHandler)
  .listen(8080, (server) => {
    console.log(`Listening on http://localhost:${server.port}`);
  });
