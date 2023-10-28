// this is a default

type RootLayoutProps = {
  lang?: string;
  dir?: string;
  title?: string;
  head?: JSX.Element;
};

export const RootLayout: Component<RootLayoutProps> = (props) => {
  return (
    <>
      {'<!doctype html>'}
      <html lang={props.lang || 'en'} dir={props.dir || 'ltr'}>
        <head>
          <title>{props.title || 'no title'}</title>
          <script src="/htmx/htmx.js"></script>
          {props.head}
        </head>
        <body>{props.children}</body>
      </html>
    </>
  );
};

// export default RootLayout;
