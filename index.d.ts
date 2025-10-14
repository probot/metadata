export default metadata;
export type StringOrNumber = string | number;
export type Key = Record<string, StringOrNumber> | StringOrNumber | StringOrNumber[];
export type Value = Key;
export type IssueOption = {
    owner: string;
    repo: string;
    issue_number: number;
    body?: string;
};
export type ProbotMetadata = {
    get: (key?: Key) => Promise<Value | undefined>;
    set: (key?: Key, value?: Value) => Promise<void>;
};
export type ProbotMetadataConstructor = (context: import("probot").Context<"issue_comment">, issue?: IssueOption) => ProbotMetadata;
export const metadata: ProbotMetadataConstructor;
