import Elysia from 'elysia';
import { RootLayout } from '../templates/RootLayout';

export const index = new Elysia().get('/', () => (
  <RootLayout title="@romanzy/otp example">
    <h1>@romanzy/otp and htmx example</h1>

    <div>
      To see how login is done go to <a href="/otp/">test page</a>
    </div>
  </RootLayout>
));
