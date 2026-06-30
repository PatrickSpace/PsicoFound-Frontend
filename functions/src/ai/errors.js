class AIProviderError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.provider = options.provider || "";
    this.model = options.model || "";
    this.retryable = Boolean(options.retryable);
    this.cause = options.cause;
  }
}

class AIProviderUnavailableError extends AIProviderError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      retryable: options.retryable !== false,
    });
  }
}

class AIProviderRateLimitError extends AIProviderError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      retryable: options.retryable !== false,
    });
  }
}

class AIProviderInvalidResponseError extends AIProviderError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      retryable: Boolean(options.retryable),
    });
  }
}

class AIProviderConfigurationError extends AIProviderError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      retryable: false,
    });
  }
}

function isRetryableAIError(error) {
  return Boolean(error && error.retryable);
}

module.exports = {
  AIProviderConfigurationError,
  AIProviderError,
  AIProviderInvalidResponseError,
  AIProviderRateLimitError,
  AIProviderUnavailableError,
  isRetryableAIError,
};
