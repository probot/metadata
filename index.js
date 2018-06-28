const jwt = require('jsonwebtoken')
const {findPrivateKey} = require('./private-key')

const regex = /\n\n<!-- probot = (.*) -->/

module.exports = (context, issue = null) => {
  const github = context.github
  const prefix = context.payload.installation.id
  const cert = findPrivateKey()
  // We are using the private key as a symmetric key
  // because we don't have the public key.
  // So it is more a password than a key
  const jwtOptions = { algorithm: 'HS256', noTimestamp: true }

  if (!issue) issue = context.issue()

  return {
    async get (key = null) {
      let body = issue.body

      if (!body) {
        body = (await github.issues.get(issue)).data.body
      }

      const match = body.match(regex)

      if (match) {
        const data = jwt.verify(match[1], cert, jwtOptions)[prefix]
        return key ? data && data[key] : data
      }
    },

    async set (key, value) {
      let body = issue.body
      let data = {}

      if (!body) body = (await github.issues.get(issue)).data.body

      body = body.replace(regex, (_, token) => {
        data = jwt.verify(token, cert, jwtOptions)
        return ''
      })

      if (!data[prefix]) data[prefix] = {}

      if (typeof key === 'object') {
        Object.assign(data[prefix], key)
      } else {
        data[prefix][key] = value
      }

      body = `${body}\n\n<!-- probot = ${jwt.sign(data, cert, jwtOptions)} -->`

      const {owner, repo, number} = issue
      return github.issues.edit({owner, repo, number, body})
    }
  }
}
