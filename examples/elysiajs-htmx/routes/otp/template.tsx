import type { OtpResult } from '@romanzy/otp';

export const OtpForm: Component<OtpResult> = ({ token, data, meta, error }) => {
  const inputEnabled = !meta.isExpired && meta.canAttempt;
  return (
    <form id={data.id} class="otp__form" hx-post={`solve/`} hx-swap="outerHTML">
      <small>Token {token}</small>
      {error && <div style="color: red; padding: 1rem">{error}</div>}

      <h3>Please complete otp for {data.account}</h3>
      <div class="otp__input">
        <input
          name="solution"
          placeholder="otp code"
          value=""
          disabled={!inputEnabled}
          minlength="4"
          maxlength="4"
          autofocus="true"
        ></input>
      </div>
      {/* dont show to not pressure the user */}
      <div>Attempts remanining {data.attemptsRemaining}</div>
      {/* in case of the event, also need to disable and clear the input */}
      <div
        class={`otp__expiry otp__toggle ${meta.isExpired ? 'disable' : ''}`}
        hx-on:expired="this.classList.add('disable')"
      >
        <div class="otp__expiry__enabled otp__toggle__enabled ">
          Time remanining:
          <span class="otp__expiry__timer">
            <otp-countdown data-expiry={data.expiresAt}></otp-countdown>
          </span>
        </div>
        <div class="otp__expiry__disabled  otp__toggle__disabled">
          Otp code has expired, please request a new one
        </div>
      </div>

      <div
        class={`otp__expiry otp__toggle otp__toggle ${
          meta.canResend ? 'disable' : ''
        }`}
        data-can-resend={meta.canResend}
        hx-on:expired="this.classList.add('disable')"
      >
        <div class="otp__resend__fresh otp__toggle__enabled">
          You can request new code in
          <span class="otp__resend__timer">
            <otp-countdown data-expiry={data.resendAt}></otp-countdown>
          </span>
        </div>
        <div class="otp__resend__stale otp__toggle__disabled">
          <a href="" hx-post={`resend/`} hx-target={`form[id='${data.id}']`}>
            Request new code
          </a>
        </div>
      </div>

      <div class="otp__submit">
        {/* TODO, make this button disabled if input is incorrect */}
        <button type="submit">Submit</button>
      </div>
    </form>
  );
};

export const OtpPage: Component<OtpResult> = ({ token, data, meta, error }) => {
  return (
    <>
      <OtpForm token={token} data={data} meta={meta} error={error}></OtpForm>
      <script src="/public/otp-countdown.js?v=1" type="module"></script>
      <link href="/public/otp-styles.css?v=1" rel="stylesheet" />
    </>
  );
};
