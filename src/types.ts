/**
 * Type re-exports from the headless core. Kept as a stable import path so
 * non-engine consumers (CLI prompts, tests, future SDK glue) don't reach
 * inside `core/` directly.
 */
export type {
  DataStack,
  BackendChoice,
  WebsiteChoice,
  AdminChoice,
  MobileChoice,
  ScaffoldConfig,
  TemplateMeta,
  SaasProjectConfig,
} from "./core/index.js";
