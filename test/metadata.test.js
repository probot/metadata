const { describe, test, beforeEach } = require('node:test')

const { Context, ProbotOctokit } = require('probot')
const nock = require('nock')

nock.disableNetConnect()

const metadata = require('..')

describe('metadata', () => {
  let context, event

  beforeEach(() => {
    event = {
      payload: {
        issue: { number: 42 },
        repository: {
          owner: { login: 'foo' },
          name: 'bar'
        },
        installation: { id: 1 }
      }
    }

    context = new Context(
      event,
      new ProbotOctokit({
        throttle: { enabled: false },
        retry: { enabled: false }
      })
    )
  })

  describe('on issue without metdata', () => {
    describe('set', () => {
      test('sets a key', async (t) => {
        const mock = nock('https://api.github.com')
          .get('/repos/foo/bar/issues/42')
          .reply(200, {
            body: 'original post'
          })
          .patch('/repos/foo/bar/issues/42', (requestBody) => {
            t.assert.strictEqual(requestBody.body, 'original post\n\n<!-- probot = {"1":{"key":"value"}} -->')
            return true
          })
          .reply(204)

        await metadata(context).set('key', 'value')
        t.assert.deepStrictEqual(mock.activeMocks(), [])
      })

      test('sets an object', async (t) => {
        const mock = nock('https://api.github.com')
          .get('/repos/foo/bar/issues/42')
          .reply(200, {
            body: 'original post'
          })
          .patch('/repos/foo/bar/issues/42', (requestBody) => {
            t.assert.strictEqual(requestBody.body, 'original post\n\n<!-- probot = {"1":{"key":"value"}} -->')
            return true
          })
          .reply(204)

        await metadata(context).set({ key: 'value' })

        t.assert.deepStrictEqual(mock.activeMocks(), [])
      })
    })

    describe('get', () => {
      test('returns undefined', async (t) => {
        const mock = nock('https://api.github.com')
          .get('/repos/foo/bar/issues/42')
          .reply(200, {
            body: 'original post'
          })

        t.assert.strictEqual(await metadata(context).get('key'), undefined)
        t.assert.deepStrictEqual(mock.activeMocks(), [])
      })

      test('returns undefined without key', async (t) => {
        const mock = nock('https://api.github.com')
          .get('/repos/foo/bar/issues/42')
          .reply(200, {
            body: 'original post'
          })

        t.assert.strictEqual(await metadata(context).get(), undefined)
        t.assert.deepStrictEqual(mock.activeMocks(), [])
      })
    })
  })

  describe('on issue with existing metadata', () => {
    describe('set', () => {
      test('sets new metadata', async (t) => {
        const mock = nock('https://api.github.com')
          .get('/repos/foo/bar/issues/42')
          .reply(200, {
            body: 'original post\n\n<!-- probot = {"1":{"key":"value"}} -->'
          })
          .patch('/repos/foo/bar/issues/42', (requestBody) => {
            t.assert.strictEqual(requestBody.body, 'original post\n\n<!-- probot = {"1":{"key":"value","hello":"world"}} -->')
            return true
          })
          .reply(204)

        await metadata(context).set('hello', 'world')
        t.assert.deepStrictEqual(mock.activeMocks(), [])
      })

      test('overwrites exiting metadata', async (t) => {
        const mock = nock('https://api.github.com')
          .get('/repos/foo/bar/issues/42')
          .reply(200, {
            body: 'original post\n\n<!-- probot = {"1":{"key":"value"}} -->'
          })
          .patch('/repos/foo/bar/issues/42', (requestBody) => {
            t.assert.strictEqual(requestBody.body, 'original post\n\n<!-- probot = {"1":{"key":"new value"}} -->')
            return true
          })
          .reply(204)

        await metadata(context).set('key', 'new value')
        t.assert.deepStrictEqual(mock.activeMocks(), [])
      })

      test('merges object with existing metadata', async (t) => {
        const mock = nock('https://api.github.com')
          .get('/repos/foo/bar/issues/42')
          .reply(200, {
            body: 'original post\n\n<!-- probot = {"1":{"key":"value"}} -->'
          })
          .patch('/repos/foo/bar/issues/42', (requestBody) => {
            t.assert.strictEqual(requestBody.body, 'original post\n\n<!-- probot = {"1":{"key":"value","hello":"world"}} -->')
            return true
          })
          .reply(204)

        await metadata(context).set({ hello: 'world' })
        t.assert.deepStrictEqual(mock.activeMocks(), [])
      })
    })

    describe('get', () => {
      test('returns value', async (t) => {
        const mock = nock('https://api.github.com')
          .get('/repos/foo/bar/issues/42')
          .reply(200, {
            body: 'original post\n\n<!-- probot = {"1":{"key":"value"}} -->'
          })

        t.assert.strictEqual(await metadata(context).get('key'), 'value')
        t.assert.deepStrictEqual(mock.activeMocks(), [])
      })

      test('returns undefined for unknown key', async (t) => {
        const mock = nock('https://api.github.com')
          .get('/repos/foo/bar/issues/42')
          .reply(200, {
            body: 'original post\n\n<!-- probot = {"1":{"key":"value"}} -->'
          })

        t.assert.strictEqual(await metadata(context).get('unknown'), undefined)
        t.assert.deepStrictEqual(mock.activeMocks(), [])
      })
    })
  })

  describe('on issue with metadata for a different installation', () => {
    describe('set', () => {
      test('sets new metadata', async (t) => {
        const mock = nock('https://api.github.com')
          .get('/repos/foo/bar/issues/42')
          .reply(200, {
            body: 'original post\n\n<!-- probot = {"2":{"key":"value"}} -->'
          })
          .patch('/repos/foo/bar/issues/42', (requestBody) => {
            t.assert.strictEqual(requestBody.body, 'original post\n\n<!-- probot = {"1":{"hello":"world"},"2":{"key":"value"}} -->')
            return true
          })
          .reply(204)

        await metadata(context).set('hello', 'world')
        t.assert.deepStrictEqual(mock.activeMocks(), [])
      })

      test('sets an object', async (t) => {
        const mock = nock('https://api.github.com')
          .get('/repos/foo/bar/issues/42')
          .reply(200, {
            body: 'original post\n\n<!-- probot = {"2":{"key":"value"}} -->'
          })
          .patch('/repos/foo/bar/issues/42', (requestBody) => {
            t.assert.strictEqual(requestBody.body, 'original post\n\n<!-- probot = {"1":{"hello":"world"},"2":{"key":"value"}} -->')
            return true
          })
          .reply(204)

        await metadata(context).set({ hello: 'world' })
        t.assert.deepStrictEqual(mock.activeMocks(), [])
      })
    })

    describe('get', () => {
      test('returns undefined for unknown key', async (t) => {
        const mock = nock('https://api.github.com')
          .get('/repos/foo/bar/issues/42')
          .reply(200, {
            body: 'original post\n\n<!-- probot = {"2":{"key":"value"}} -->'
          })

        t.assert.strictEqual(await metadata(context).get('unknown'), undefined)
        t.assert.deepStrictEqual(mock.activeMocks(), [])
      })

      test('returns undefined without a key', async (t) => {
        const mock = nock('https://api.github.com')
          .get('/repos/foo/bar/issues/42')
          .reply(200, {
            body: 'original post\n\n<!-- probot = {"2":{"key":"value"}} -->'
          })

        t.assert.strictEqual(await metadata(context).get(), undefined)
        t.assert.deepStrictEqual(mock.activeMocks(), [])
      })
    })
  })

  describe('on an issue with no content in the body', () => {
    describe('set', () => {
      test('sets new metadata', async (t) => {
        const mock = nock('https://api.github.com')
          .get('/repos/foo/bar/issues/42')
          .reply(200, {
            body: null
          })
          .patch('/repos/foo/bar/issues/42', (requestBody) => {
            t.assert.strictEqual(requestBody.body, '\n\n<!-- probot = {"1":{"hello":"world"}} -->')
            return true
          })
          .reply(204)

        await metadata(context).set('hello', 'world')
        t.assert.deepStrictEqual(mock.activeMocks(), [])
      })

      test('sets an object', async (t) => {
        const mock = nock('https://api.github.com')
          .get('/repos/foo/bar/issues/42')
          .reply(200, {
            body: null
          })
          .patch('/repos/foo/bar/issues/42', (requestBody) => {
            t.assert.strictEqual(requestBody.body, '\n\n<!-- probot = {"1":{"hello":"world"}} -->')
            return true
          })
          .reply(204)

        await metadata(context).set({ hello: 'world' })
        t.assert.deepStrictEqual(mock.activeMocks(), [])
      })
    })

    describe('get', () => {
      test('returns undefined for unknown key', async (t) => {
        const mock = nock('https://api.github.com')
          .get('/repos/foo/bar/issues/42')
          .reply(200, {
            body: null
          })

        t.assert.strictEqual(await metadata(context).get('unknown'), undefined)
        t.assert.deepStrictEqual(mock.activeMocks(), [])
      })

      test('returns undefined without a key', async (t) => {
        const mock = nock('https://api.github.com')
          .get('/repos/foo/bar/issues/42')
          .reply(200, {
            body: null
          })

        t.assert.strictEqual(await metadata(context).get(), undefined)
        t.assert.deepStrictEqual(mock.activeMocks(), [])
      })
    })
  })

  describe('when given body in issue params', () => {
    const issue = {
      owner: 'foo',
      repo: 'bar',
      issue_number: 42,
      body: 'hello world\n\n<!-- probot = {"1":{"hello":"world"}} -->'
    }

    describe('get', () => {
      test('returns the value without an API call', async (t) => {
        t.assert.strictEqual(await metadata(context, issue).get('hello'), 'world')
      })
    })

    describe('set', () => {
      test('updates the value without an API call', async (t) => {
        const mock = nock('https://api.github.com')
          .patch('/repos/foo/bar/issues/42', (requestBody) => {
            t.assert.strictEqual(requestBody.body, 'hello world\n\n<!-- probot = {"1":{"hello":"world","foo":"bar"}} -->')
            return true
          })
          .reply(204)

        await metadata(context, issue).set('foo', 'bar')
        t.assert.deepStrictEqual(mock.activeMocks(), [])
      })
    })
  })
})
