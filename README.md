# @romanzy/otp

A simple and scalable javascript library to perform OTP code authorization. Works in Node, Deno, and Bun runtimes.

## Benefits:

- Only a single caching server is required
- Almost stateless operation, easy client/server logic
- Very easy to implement in server-side rendered applications

## Installation

```bash
npm install @romanzy/otp
yarn add @romanzy/otp
pnpm install @romanzy/otp
bun install @romanzy/otp
```

## How to use

Create a storage adapter, it must implement `OtpStorage` interface

```ts
export interface OtpStorage {
  set(key: string, value: string, ttl: number): Promise<void>;
  get(key: string): Promise<string | null>;
  invalidate(key: string): Promise<void>;
}
```

Examples will use `MemoryStorage` adapter, which a simple implementation with js `Map()`

Create an instance of `OtpService` in its own module for easy referencing

```ts
import { OtpService, OtpError } from '@romanzy/otp';
import { MemoryStorage } from '@romanzy/otp/storage/MemoryStorage';

type SendArgs = { locale: string };

export const otpService = new OtpService({
  storage: new MemoryStorage(), // write your own storage adapter
  maxAttempts: 3,
  timeToResend: 60 * 1000,
  timeToSolve: 5 * 60 * 1000,
  generateSolution: () => {
    return '1234';
  },
  sendOtp: async (account, solution, args: SendArgs) => {
    // write code to send otp to the user
  },
});
```

Issue a token, route `POST /otp/issue`

```ts
try {
  const { token, data, error, meta } = await otpService.issue(
    body.phone,
    undefined, // custom data to attach to otp
    { locale: 'en' } // args passed to sendOtp
  );

  // redirect to correct page
  set.headers['HX-Location'] = `/otp/${token}/`;
} catch (error: unknown) {
  // Typed error is returned
  if (error instanceof OtpError) {
    if (error.message == 'BAD_REQUEST') set.status = 400;
    else if (error.message == 'INTERNAL_ERROR') set.status = 500;
  }
}
```

Please note that all methods can throw `OtpError` as in issue token example. These functions throw when a malicious request made by the client or when experiencing problems with the storage. In following examples try-catch error handling is ommited for brevity.

Get token information `GET /otp/:token/`

```ts
try {
  const { token, data, error, meta } = await otpService.getTokenInformation(
    params.token
  );

  return (
    <RootLayout title="Confirm OTP page">
      <OtpPage token={token} data={data} meta={meta} error={error}></OtpPage>
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
```

Check solution, route `POST /otp/:token/check/`

```ts
const { token, data, meta, error } = await otpService.check(
  params.token, // token from the client
  body.solution // solution from the clent
);

if (!meta.isSolved) {
  // set new token on the client
  set.headers['HX-Replace-Url'] = `/otp/${token}/`;
  // re-render otp form with error message
  return (
    <OtpForm token={token} data={data} meta={meta} error={error}></OtpForm>
  );
}

// procede to business logic
const { account, customData } = data;
```

Resend a token, route `POST /otp/:token/resend/`

```ts
const { token, data, meta, error } = await otpService.resend(params.token, {
  locale: 'en',
});

set.headers['HX-Replace-Url'] = `/otp/${token}/`;
return <OtpForm token={token} data={data} meta={meta} error={error}></OtpForm>;
```

All of the functions above return `OtpResult` type.

```ts
export type OtpResult<Data = unknown> = {
  token: string;
  data: {
    id: string;
    account: string;
    expiresAt: number;
    resendAt: number;
    attemptsRemaining: number;
    customData: Data;
  };
  meta: {
    isSolved: boolean;
    canResend: boolean;
    canAttempt: boolean;
    isExpired: boolean;
  };
  error: 'NO_ATTEMPTS_REMAINING' | 'EXPIRED' | 'BAD_SOLUTION' | null;
};
```

## Helper functions

```ts
import {
  numericalSolutionGenerator,
  browserDecodeToken,
} from '@romanzy/otp/helpers';

// 6-digit code generator
const generateOtp = numericalSolutionGenerator(6);

// decode token value into data of OtpResult in the browser
const { account, expiresAt, resendAt, attemptsRemaining } =
  browserDecodeToken('...');
```

## Complete examples:

- [Elysiajs + htmx](examples/elysiajs-htmx)

### User authentication via SMS/email codes

TODO add diagrams and description of how it works

### Verify ownership of phone and/or email before registration

TODO

### Verify the user before performing priviledge actions

TODO

## How it works

This library operates on the idea of unique tokens and cache keys.
Every time a new token is issued, the following data is encoded as base64url:

- unique id
- account (email or phone number)
- number of attempts remaining
- expiration time
- resend time
- any custom data

The generated token string is hashed, and the solution to the OTP is stored in a centralized cache, using the hashed token as a cache key.

This token is then sent to the client to decode and display interactive UI. Or even better, it can be server-side rendered. When the client sends a solution to the server, the server looks up the solution in the cache. If it is correct, it is marked as solved. If the solution is wrong, the server invalidates the previous hash and creates a new one, which is sent back to the client.

I am looking for feedback and potential vunerabilities in this method of otp validation.

## Security

Security comes from hashing. Since the token is derived from a random ID, account name, issue time, and attempts remaining count, the current token value cannot be guessed by a 3rd party. Every time the token is used, it is invalidated (except when explicitly told to `allowReuseOfSolvedToken`; more on this later)

The tokens are protected from modification by indexing them in the cache by hashed value (with sha256 as default); the server simply can not find a maliciously modified token in the hash. Since every token is given a small number of attempts, it is unlikely for the 1st party to go around it without entering the correct solution.

The `customData` field can store arbitrary JSON-encodable information inside the token, allowing the developer to ensure that solved tokens are not used for other purposes.

When issuing a token with `allowReuseOfSolvedToken` enabled, solutions for solved tokens are overriden to some constant value, default is `S`. Next time `getTokenInformation` is called, it will be aware that the token is solved.

This library depends on `crypto` module. All cryptographic operations are performed using this module

## Important notes

Always implement some sort of rate limit by IP or account to prevent abuse. Sending text messages costs money, and email spam is terrible for domain-name reputation. Rate-limit both solving and issuing of tokens before using this library.

Validate and normalize the `account` field before issuing the tokens: trim whitespaces, convert emails to lowercase, remove "+" in phone numbers, use Google's libphonenumber, etc.

Always validate token data when OTP is solved correctly. Grant login/registration to `user@example.com` only if the token has an account of `user@example.com`. If not careful, an attacker with the email `haxx@example.com` could log in to the account of `admin@example.com` by substituting the solved token before hitting the login API endpoint.

Use at least 6-digit OTP codes, allow no more than 3 attempts, and expire tokens after no more than 5 minutes.

## TODOS

- [ ] Better readme, maybe workflow diagram, explain solve and invalidation
- [ ] More helper functions
- [ ] Client-side react example
- [ ] TsDoc autodocumentation
- [ ] More storage connectors out of the box, most likely an [unstorage](https://github.com/unjs/unstorage) adapter
