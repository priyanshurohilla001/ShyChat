export type ServiceResult =
  | { success: true }
  | { success: false; error: string };

export type DataResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
