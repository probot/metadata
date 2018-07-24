const crypto = require('./crypto')()

const regex = /\n\n<!-- probot = (.*) -->/

module.exports = (context, issue = null) => {
  const github = context.github
  const prefix = context.payload.installation.id

  if (!issue) issue = context.issue()

  return {
    async get (key = null) {
      let body = issue.body

      if (!body) {
        body = (await github.issues.get(issue)).data.body
      }

      const match = body.match(regex)

      if (match) {
        const data = (await crypto.decrypt(match[1]))[prefix]
        return key ? data && data[key] : data
      }
    },

    async set (key, value) {
      let body = issue.body
      let data = {}

      if (!body) body = (await github.issues.get(issue)).data.body

      const match = body.match(regex)
      if (match) {
        body = body.substring(0, match.index) + body.substring(match.index + match[0].length)
        data = await crypto.decrypt(match[1])
      }

      if (!data[prefix]) data[prefix] = {}

      if (typeof key === 'object') {
        Object.assign(data[prefix], key)
      } else {
        data[prefix][key] = value
      }

      body = `${body}\n\n<!-- probot = ${await crypto.encrypt(data)} -->`

      const {owner, repo, number} = issue
      return github.issues.edit({owner, repo, number, body})
    }
  }
}

module.exports.regex = regex
