/**
 * Shapes returned by the service layer.
 *
 * Services deliberately return errors rather than throwing, because every
 * caller already surfaces them as a toast. The one exception is a timeout,
 * which throws `TimeoutError` so callers can catch it separately.
 */
export interface ServiceError {
  message: string;
  code?: string;
}

export interface MutationResult {
  error: ServiceError | null;
}

export interface DataResult<T> {
  data: T | null;
  error: ServiceError | null;
}
