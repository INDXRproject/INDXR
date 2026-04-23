declare module 'sbd' {
  interface Options {
    newline_boundaries?: boolean;
    sanitize?: boolean;
    allowed_tags?: string;
  }
  const sbd: {
    sentences(text: string, options?: Options): string[];
  };
  export = sbd;
}
