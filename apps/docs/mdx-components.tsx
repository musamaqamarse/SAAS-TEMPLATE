import type { MDXComponents } from "mdx/types";

// MDX components. Default mapping is fine for now; this file exists so
// `@next/mdx` can find a customisation point without erroring.
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return { ...components };
}
