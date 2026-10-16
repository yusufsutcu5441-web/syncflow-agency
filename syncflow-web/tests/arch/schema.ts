/**
 * A small JSON Schema evaluator, just the keywords docs/architecture/canonical-event.schema.json uses, so the contract tests can prove that the
 * schema in the documentation and the validator in lib/arch/event.ts agree, without adding a dependency to the project.
 */
type Schema = Record<string, unknown>;

export function validateSchema(root: Schema, value: unknown): string[] {
  const errors: string[] = [];

  const resolve = (ref: string): Schema => {
    let current: unknown = root;
    for (const part of ref.replace(/^#\//, '').split('/')) current = (current as Record<string, unknown>)[part];
    return current as Schema;
  };

  const check = (schema: Schema, data: unknown, path: string, sink: string[]): void => {
    if (typeof schema.$ref === 'string') return check(resolve(schema.$ref), data, path, sink);
    if ('const' in schema && data !== schema.const) sink.push(`${path}: const`);
    if (Array.isArray(schema.enum) && !schema.enum.includes(data)) sink.push(`${path}: enum`);

    const type = schema.type;
    if (type === 'object' && (typeof data !== 'object' || data === null || Array.isArray(data))) return void sink.push(`${path}: type object`);
    if (type === 'string' && typeof data !== 'string') return void sink.push(`${path}: type string`);
    if (type === 'integer' && !Number.isInteger(data)) return void sink.push(`${path}: type integer`);
    if (type === 'number' && !(typeof data === 'number' && Number.isFinite(data))) return void sink.push(`${path}: type number`);
    if (type === 'array' && !Array.isArray(data)) return void sink.push(`${path}: type array`);

    if (typeof data === 'string') {
      if (typeof schema.pattern === 'string' && !new RegExp(schema.pattern).test(data)) sink.push(`${path}: pattern`);
      if (typeof schema.minLength === 'number' && data.length < schema.minLength) sink.push(`${path}: minLength`);
      if (typeof schema.maxLength === 'number' && data.length > schema.maxLength) sink.push(`${path}: maxLength`);
    }
    if (typeof data === 'number') {
      if (typeof schema.minimum === 'number' && data < schema.minimum) sink.push(`${path}: minimum`);
      if (typeof schema.exclusiveMinimum === 'number' && data <= schema.exclusiveMinimum) sink.push(`${path}: exclusiveMinimum`);
    }
    if (Array.isArray(data)) {
      if (typeof schema.minItems === 'number' && data.length < schema.minItems) sink.push(`${path}: minItems`);
      if (typeof schema.maxItems === 'number' && data.length > schema.maxItems) sink.push(`${path}: maxItems`);
      if (schema.items) data.forEach((item, index) => check(schema.items as Schema, item, `${path}[${index}]`, sink));
    }
    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      const record = data as Record<string, unknown>;
      for (const key of (schema.required as string[] | undefined) ?? []) if (!(key in record)) sink.push(`${path}.${key}: required`);
      const props = (schema.properties as Record<string, Schema> | undefined) ?? {};
      for (const [key, sub] of Object.entries(props)) if (key in record) check(sub, record[key], path ? `${path}.${key}` : key, sink);
      if (schema.additionalProperties === false) for (const key of Object.keys(record)) if (!(key in props)) sink.push(`${path}.${key}: additional`);
    }
    if (Array.isArray(schema.oneOf)) {
      const passing = (schema.oneOf as Schema[]).filter((branch) => {
        const inner: string[] = [];
        check(branch, data, path, inner);
        return inner.length === 0;
      });
      if (passing.length !== 1) sink.push(`${path}: oneOf (${passing.length} match)`);
    }
  };

  check(root, value, '', errors);
  return errors;
}
