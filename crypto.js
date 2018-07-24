const { findPrivateKey } = require('probot/lib/private-key')
const rsaPemToJwk = require('rsa-pem-to-jwk')
const jose = require('node-jose')

module.exports = () => {
  const pem = findPrivateKey()
  const pubKey = rsaPemToJwk(pem, {}, 'public')
  const privKey = rsaPemToJwk(pem, {}, 'private')

  const keystore = jose.JWK.createKeyStore()
  keystore.add(privKey)
  return {
    async encrypt (data) {
      return jose.JWE.createEncrypt({ format: 'compact' }, pubKey)
      .update(JSON.stringify(data)).final()
    },
    async decrypt (data) {
      const result = await jose.JWE.createDecrypt(keystore).decrypt(data)
      return JSON.parse(result.plaintext.toString())
    }
  }
}
