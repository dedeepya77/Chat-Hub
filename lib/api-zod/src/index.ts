// Only the zod runtime schemas are consumed by this workspace; the
// generated/types interfaces duplicate the same names as plain TS types
// (e.g. LoginBody), which makes `export *`-ing both ambiguous. Consumers
// that need plain types should use @workspace/api-client-react's schemas.
export * from "./generated/api";
