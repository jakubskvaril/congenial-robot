import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5';

export interface ImageInput {
  url: string;
  mediaType?: 'image/jpeg' | 'image/png' | 'image/webp';
}

interface StructuredCallArgs<T extends z.ZodTypeAny> {
  system: string;
  prompt: string;
  images?: ImageInput[];
  schema: T;
  schemaName: string;
  schemaDescription: string;
  maxTokens?: number;
}

type SupportedMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

function inferMediaType(url: string, contentType: string | null): SupportedMediaType {
  if (contentType?.startsWith('image/')) return contentType as SupportedMediaType;
  if (url.endsWith('.png')) return 'image/png';
  if (url.endsWith('.webp')) return 'image/webp';
  if (url.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}

/**
 * This SDK version's ImageBlockParam only accepts base64-encoded data,
 * not a hosted URL — so every reference image is fetched and inlined
 * per call. Fine at our volumes (photo sets are 5-30 images); if that
 * ever becomes a bottleneck, cache the base64 payload alongside the
 * ProjectImage row instead of re-fetching per agent call.
 */
async function toBase64ImageBlock(image: ImageInput): Promise<Anthropic.ImageBlockParam> {
  const res = await fetch(image.url);
  if (!res.ok) throw new Error(`Failed to fetch image for vision analysis: ${image.url} (${res.status})`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const mediaType = image.mediaType ?? inferMediaType(image.url, res.headers.get('content-type'));

  return {
    type: 'image',
    source: { type: 'base64', media_type: mediaType, data: buffer.toString('base64') },
  };
}

/**
 * Every agent in the pipeline (1-4) goes through this single function.
 * We force a tool call whose input schema is derived from the agent's
 * Zod schema, which is the most reliable way to get schema-valid JSON
 * out of a vision-language model — far more reliable than asking the
 * model to "return JSON" in prose and parsing it ourselves.
 */
export async function generateStructured<T extends z.ZodTypeAny>({
  system,
  prompt,
  images = [],
  schema,
  schemaName,
  schemaDescription,
  maxTokens = 4096,
}: StructuredCallArgs<T>): Promise<z.infer<T>> {
  const jsonSchema = zodToJsonSchema(schema, schemaName);
  const inputSchema = (jsonSchema.definitions?.[schemaName] ?? jsonSchema) as Anthropic.Tool.InputSchema;

  const imageBlocks = await Promise.all(images.map(toBase64ImageBlock));

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [
      {
        role: 'user',
        content: [...imageBlocks, { type: 'text', text: prompt }],
      },
    ],
    tools: [
      {
        name: schemaName,
        description: schemaDescription,
        input_schema: inputSchema,
      },
    ],
    tool_choice: { type: 'tool', name: schemaName },
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
  );

  if (!toolUse) {
    throw new Error(`[${schemaName}] model did not return a tool_use block`);
  }

  const parsed = schema.safeParse(toolUse.input);
  if (!parsed.success) {
    throw new Error(
      `[${schemaName}] structured output failed validation: ${parsed.error.message}`,
    );
  }

  return parsed.data;
}

export const llmModelVersion = MODEL;
