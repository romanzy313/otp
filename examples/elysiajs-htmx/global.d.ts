/* eslint-disable no-var */
/* eslint-disable @typescript-eslint/ban-types */

declare global {
  type Children =
    | number
    | string
    | boolean
    | null
    | undefined
    | Promise<Children>
    | Children[];

  type PropsWithChildren<T = {}> = { children?: Children } & T;

  type Component<T = {}> = (
    this: void,
    props: PropsWithChildren<T>
  ) => JSX.Element;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      'otp-countdown': {
        'data-expiry': number;
      };
    }
  }
}

export {};
