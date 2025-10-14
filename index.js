const probotMetadataRegex = /(?:\n\n|\r\n)<!-- probot = (.*) -->/
const prototypePollutionKeys = /** @type {const} */(['__proto__', 'constructor', 'prototype'])

const metadata = /** @type {ProbotMetadataConstructor} */ (context, issue) => {
  const octokit = context.octokit
  const prefix = /** @type {{ id: number; node_id: string; }} */ (context.payload.installation).id

  if (!issue) issue = context.issue()

  return {
    async get (key) {
      let body = issue.body

      if (!body) {
        body = (await octokit.rest.issues.get(issue)).data.body || ''
      }

      const match = body.match(probotMetadataRegex)

      if (match) {
        const probotMetadata = JSON.parse(match[1])
        const data = probotMetadata[prefix]
        return typeof key === 'string' || typeof key === 'number'
          ? data && data[key]
          : data
      }
    },

    async set (key, value) {
      let body = issue.body
      /** @type {Record<number, Record<number|string, any>>} */
      let data = Object.create(null)

      if (!body) body = (await octokit.rest.issues.get(issue)).data.body || ''

      const match = body.match(probotMetadataRegex)

      if (match) {
        data = JSON.parse(match[1])
      }

      body = body.replace(probotMetadataRegex, '')

      if (!data[prefix]) data[prefix] = Object.create(null)

      // should never happen, but just in case
      if (typeof prefix === 'string' && prototypePollutionKeys.includes(prefix)) {
        throw new TypeError('Invalid prefix value')
      }
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
    }
  }
}

export default metadata
export { metadata }

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

/** @typedef {(context: import('probot').Context<'issue_comment'>, issue?: IssueOption)=>ProbotMetadata} ProbotMetadataConstructor */
