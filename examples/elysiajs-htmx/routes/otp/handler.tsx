import Elysia, { t } from 'elysia';
import { OtpError } from '@romanzy/otp';
import { OtpForm, OtpPage } from './template';
import { RootLayout } from '../../templates/RootLayout';
import { otpService } from '../../otpService';

export const otpHandler = new Elysia({
  prefix: '/otp',
})
  .error('OtpError', OtpError)
  .onError(({ code, error }) => {
    switch (code) {
      case 'OtpError':
        return (
          <div>
            Fatal error detected. Type: {error.message}, cause: {error.cause}
          </div>
        );
      default:
        break;
    }
  })
  .get('/', async ({ cookie }) => {
    return (
      <RootLayout title="Confirm OTP page">
        <h1>Auth status</h1>
        <div>{cookie.auth.value || 'not logged in'}</div>

        <h3>Start otp</h3>
        <form hx-post="start/" hx-boost>
          <input name="account" placeholder="enter account"></input>
          <button type="submit">Start</button>
        </form>
      </RootLayout>
    );
  })
  .post(
    '/start/',
    async ({ body, set }) => {
      // validate its an email or phone
      const account = body.account.toLowerCase();

      const { token } = await otpService.issue(account, { locale: 'en' });

      // full browser redirect
      set.headers['HX-Location'] = `/otp/${token}/`;
    },
    {
      body: t.Object({
        account: t.String(),
      }),
    }
  )
  .get(
    '/:token/',
    async ({ params, set }) => {
      try {
        const {
          token,
          data: value,
          error,
          meta,
        } = await otpService.getTokenInformation(params.token);

        return (
          <RootLayout title="Confirm OTP page">
            <OtpPage
              token={token}
              data={value}
              meta={meta}
              error={error}
            ></OtpPage>
          </RootLayout>
        );
      } catch (error: unknown) {
        if (error instanceof OtpError) {
          if (error.message == 'BAD_REQUEST') set.status = 400;
          else if (error.message == 'INTERNAL_ERROR') set.status = 500;

          return (
            <RootLayout title="Confirm OTP page">
              {error.message == 'INTERNAL_ERROR' && (
                <div>Internal server error. Cause: {error.cause}</div>
              )}
              {error.message == 'BAD_REQUEST' && (
                <div>Bad request. Cause: {error.cause}</div>
              )}
            </RootLayout>
          );
        }
      }
    },
    {
      params: t.Object({
        token: t.String(),
      }),
    }
  )
  .post(
    '/:token/solve/',
    async ({ body, params, set, cookie }) => {
      const {
        token,
        data: value,
        meta,
        error,
      } = await otpService.check(params.token, body.solution);

      if (!meta.isSolved) {
        // dont forget to change url for next request
        set.headers['HX-Replace-Url'] = `/otp/${token}/`;
        return (
          <OtpForm
            token={token}
            data={value}
            meta={meta}
            error={error}
          ></OtpForm>
        );
      }

      // invalidate right away
      await otpService.invalidateToken(token);

      cookie.auth.set({
        value: value.account,
        path: '/',
      });

      // client side redirect, page is fully refreshed
      set.headers['HX-Redirect'] = '/otp/';

      return;
    },
    {
      body: t.Object({
        solution: t.String(),
      }),
      params: t.Object({
        token: t.String(),
      }),
    }
  )
  .post(
    '/:token/resend/',
    async ({ params, set }) => {
      // need to parse out the username from the token

      const {
        token,
        data: value,
        meta,
        error,
      } = await otpService.resend(params.token, {
        locale: 'en',
      });

      set.headers['HX-Replace-Url'] = `/otp/${token}/`;
      return (
        <OtpForm token={token} data={value} meta={meta} error={error}></OtpForm>
      );
    },
    {
      params: t.Object({
        token: t.String(),
      }),
    }
  );
