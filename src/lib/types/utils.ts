export function isNotNullObject(arg: unknown): arg is NotNullObject {
  return typeof arg === "object" && arg != null;
}

type NotNullObject = { [key: string]: unknown };
