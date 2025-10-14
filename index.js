// @ts-check

const regex = /(?:\n\n|\r\n)<!-- probot = (.*) -->/

/** @typedef {string|number} StringOrNumber */
/** @typedef {Record<string, StringOrNumber>|StringOrNumber|StringOrNumber[]} Key */
/** @typedef {Key} Value */

/**
 * @typedef {object} IssueOption
 * @property {string} owner
 * @property {string} repo
 * @property {number} issue_number
 * @property {string} [body]
 */

/**
 * @typedef {object} ProbotMetadata
 * @property {(key?: Key)=>Promise<Value|undefined>} get
 * @property {(key?: Key, value?: Value)=>Promise<void>} set
 */

/**
 * @template {import('@octokit/webhooks').EmitterWebhookEventName} E
 * @typedef {import('probot').Context<E>} Context<E>
 */

/**
 * @param {Context<'issue_comment'>} context 
 * @param {IssueOption} [issue=null] 
 * @returns {ProbotMetadata}
 */
module.exports = (context, issue) => {
  const octokit = context.octokit
  const prefix = /** @type {{ id: number; node_id: string; }} */ (context.payload.installation).id

  if (!issue) issue = context.issue()

  return {
    async get (key) {
      let body = issue.body

      if (!body) {
        body = (await octokit.rest.issues.get(issue)).data.body || ''
      }

      const match = body.match(regex)

      if (match) {
        const data = JSON.parse(match[1])[prefix]
        return typeof key === 'string' || typeof key === 'number'
          ? data && data[key]
          : data
      }
    },

    async set (key, value) {
      let body = issue.body
      /** @type {Record<number, Record<number|string, any>>} */
      let data = {}

      if (!body) body = (await octokit.rest.issues.get(issue)).data.body || ''

      const match = body.match(regex)

      if (match) {
        data = JSON.parse(match[1])
      }

      body = body.replace(regex, '')

      if (!data[prefix]) data[prefix] = {}

      if (typeof key === 'string' || typeof key === 'number') {
        data[prefix][key] = value
      } else {
        Object.assign(data[prefix], key)
      }

      await octokit.rest.issues.update({
        owner: issue.owner,
        repo: issue.repo,
        issue_number: issue.issue_number,
        body: `${body}\n\n<!-- probot = ${JSON.stringify(data)} -->`
      })

      return
    }
  }
}
