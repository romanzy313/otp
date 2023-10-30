# @romanzy/otp example for elysia-htmx

## How to run

1.  install dependencies `pnpm install`
2.  build `@romanzy/otp` package in the root of this repo with `pnpm build`
3.  run `pnpm dev` inside this example folder

## Notes

In this example, it is important that traling slashes are enforced by the server. This allows to use relative urls inside forms, which makes route handler implementation + server rendered templates portable.
