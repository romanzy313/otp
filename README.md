# @romanzy/otp

A simple and scalable javascript library to perform OTP code authorization. Works in Node, Deno, and Bun runtimes.

## Benefits:

- Only a single caching server is required
- Almost stateless operation, easy client/server logic
- Very easy to implement in server-side rendered applications

## Installation

npm

```bash
npm install @romanzy/otp
```

yarn

```bash
yarn add @romanzy/otp
```

pnpm

```bash
pnpm install @romanzy/otp
```

bun

```bash
bun install @romanzy/otp
```

## Examples:

- [Elysiajs + htmx](examples/elysiajs-htmx)

## Use cases and examples

### User authentication via SMS/email codes

Example with [Elysiajs + htmx](examples/elysiajs-htmx)

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

## Important notes

This library depends on `crypto` module. Node, Deno, and Bun runtimes should support needed functionality out of the box.

Always implement some sort of rate limit by IP or account to prevent abuse. Sending text messages costs money, and email spam is terrible for domain-name reputation. Rate-limit both solving and issuing of tokens before using this library.

Validate and normalize the `account` field before issuing the tokens: trim whitespaces, convert emails to lowercase, remove "+" in phone numbers, use Google's libphonenumber, etc.

Always validate token data when OTP is solved correctly. Grant login/registration to `user@example.com` only if the token has an account of `user@example.com`. If not careful, an attacker with the email `haxx@example.com` could log in to the account of `admin@example.com` by substituting the solved token before hitting the login endpoint.

Use at least 6-digit OTP codes, allow no more than 3 attempts, and expire tokens after no more than 5 minutes.

## TODOS

- [ ] Better readme, maybe workflow diagram, explain solve and invalidation
- [ ] More helper functions
- [ ] Client-side react example
- [ ] More storage connectors out of the box, maybe an unstorage adapter?
