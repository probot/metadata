declare module "eslint.config" {
    const _default: any;
    export default _default;
}
declare module "index" {
    namespace _exports {
        export { StringOrNumber, Key, Value, IssueOption, ProbotMetadata, Context };
    }
    function _exports(context: Context<"issue_comment">, issue?: IssueOption): ProbotMetadata;
    export = _exports;
    type StringOrNumber = string | number;
    type Key = Record<string, StringOrNumber> | StringOrNumber | StringOrNumber[];
    type Value = Key;
    type IssueOption = {
        owner: string;
        repo: string;
        issue_number: number;
        body?: string | undefined;
    };
    type ProbotMetadata = {
        get: (key?: Key) => Promise<Value | undefined>;
        set: (key?: Key, value?: Value) => Promise<void>;
    };
    /**
     * <E>
     */
    type Context<E extends import("@octokit/webhooks").EmitterWebhookEventName> = import("probot").Context<E>;
}
declare module "test/metadata.test" {
    export {};
}
