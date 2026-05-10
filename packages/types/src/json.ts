export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonArray | JsonObject;

export type JsonArray = ReadonlyArray<JsonValue>;

export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export type MutableJsonObject = { [key: string]: JsonValue };
export type MutableJsonArray = JsonValue[];
