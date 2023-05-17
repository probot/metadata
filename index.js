const regex = /(\n\n|\r\n)<!-- probot = (.*) -->/

module.exports = (context, issue = null) => {
  const github = context.octokit || context.github
  const prefix = context.payload.installation.id

  if (!issue) issue = context.issue()

  return {
    async get (key = null) {
      let body = issue.body

      if (!body) {
        body = (await github.issues.get(issue)).data.body || ''
      }

      const match = body.match(regex)

      if (match) {
        const data = JSON.parse(match[2])[prefix]
        return key ? data && data[key] : data
      }
    },

    async set (key, value) {
      let body = issue.body
      let data = {}

      if (!body) body = (await github.issues.get(issue)).data.body || ''

      const match = body.match(regex)

      if (match) {
        data = JSON.parse(match[2])
      }

      body = body.replace(regex, '')

      if (!data[prefix]) data[prefix] = {}

      if (typeof key === 'object') {
        Object.assign(data[prefix], key)
      } else {
        data[prefix][key] = value
      }

      body = `${body}\n\n<!-- probot = ${JSON.stringify(data)} -->`

      const { owner, repo, issue_number } = issue
      return github.issues.update({ owner, repo, issue_number, body })
    }
  }
}
