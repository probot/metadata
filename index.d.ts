import { Context } from "probot";

type StringOrNumber = number | string;
type Key =
  | { [key: string]: StringOrNumber }
  | StringOrNumber[]
  | StringOrNumber;
type Value = Key;

declare function metadata(
  context: Context,
  issue?: { body: string; [key: string]: any }
): {
  get(key?: Key): Promise<any>;
  set(key: Key, value: Value): Promise<any>;
};

export = metadata;
