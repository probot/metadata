const regex = /\n\n<!-- probot = (.*) -->/

module.exports = (github, issue) => {
  return {
    async get (key) {
      const res = await github.issues.get(issue)
      const match = res.data.body.match(regex)

      if (match) {
        return JSON.parse(match[1])[key]
      }
    },

    async set (key, value) {
      const res = await github.issues.get(issue)

      let data = {}

      let body = res.data.body.replace(regex, (_, json) => {
        data = JSON.parse(json)
        return ''
      })

      data[key] = value
      body = `${body}\n\n<!-- probot = ${JSON.stringify(data)} -->`

      return github.issues.edit(Object.assign({body}, issue))
    }
  }
}
