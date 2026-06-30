export type AIRole = "system" | "user" | "assistant";

export type AIMessage = {
  role: AIRole;
  content: string;
};

export type GenerateTextInput = {
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  model?: string;
  metadata?: Record<string, unknown>;
};

export type GenerateTextResult = {
  text: string;
  provider: string;
  model: string;
  fallbackUsed?: boolean;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
};

export type StructuredOutputInput = {
  messages: AIMessage[];
  schema?: unknown;
  temperature?: number;
  maxTokens?: number;
  model?: string;
  metadata?: Record<string, unknown>;
};

export type StructuredOutputResult<T = unknown> = {
  data: T;
  provider: string;
  model: string;
  fallbackUsed?: boolean;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
};

export type EmbeddingInput = {
  input: string | string[];
  model?: string;
  metadata?: Record<string, unknown>;
};

export type EmbeddingResult = {
  embeddings: number[][];
  provider: string;
  model: string;
  usage?: {
    inputTokens?: number;
    totalTokens?: number;
  };
};

export interface AIProvider {
  name: string;
  defaultModel: string;
  generateText(input: GenerateTextInput): Promise<GenerateTextResult>;
  generateStructuredOutput<T = unknown>(
    input: StructuredOutputInput
  ): Promise<StructuredOutputResult<T>>;
  generateEmbedding?(input: EmbeddingInput): Promise<EmbeddingResult>;
}
