import { z } from 'zod';
import { extendZodWithOpenApi, OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

/**
 * Register a Zod schema as an OpenAPI component so it can be
 * referenced in @ApiBody({ schema: { $ref: '...' } }).
 */
export function registerComponent(name: string, schema: z.ZodType): void {
  registry.register(name, schema);
}

/**
 * Build a map of component schemas from the registry suitable for
 * merging into the NestJS Swagger document.
 */
export function getComponentSchemas(): Record<string, object> {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  const doc = generator.generateComponents();
  return (doc.components?.schemas as Record<string, object>) ?? {};
}