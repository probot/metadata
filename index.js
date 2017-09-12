const regex = /\n\n<!-- probot = (.*) -->/

module.exports = (context, issue = null) => {
  const github = context.github
  const prefix = context.payload.installation.id

  if (!issue) issue = context.issue()

  return {
    async get (key) {
      let body = issue.body

      if (!body) {
        body = (await github.issues.get(issue)).data.body
      }

      const match = body.match(regex)

      if (match) {
        const data = JSON.parse(match[1])
        return data[prefix] && data[prefix][key]
      }
    },

    async set (key, value) {
      let body = issue.body
      let data = {}

      if (!body) body = (await github.issues.get(issue)).data.body

      body = body.replace(regex, (_, json) => {
        data = JSON.parse(json)
        return ''
      })

      data[prefix] = data[prefix] || {}
      data[prefix][key] = value
      body = `${body}\n\n<!-- probot = ${JSON.stringify(data)} -->`

      const {owner, repo, number} = issue
      return github.issues.edit({owner, repo, number, body})
    }
  }
}
