export class OrbitalDataError extends Error {}
export class PropagationError extends Error {}
export class ProviderUnavailableError extends Error {}
export class HttpResponseError extends ProviderUnavailableError {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'HttpResponseError';
  }
}
export class MissingCredentialsError extends Error {}
export class RateLimitError extends Error {}
