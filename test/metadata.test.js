import { describe, test, beforeEach } from 'node:test'
import { Context, ProbotOctokit } from 'probot'
import nock from 'nock'
import metadata from '../index.js'

nock.disableNetConnect()

/** @typedef {import('@octokit/webhooks').EmitterWebhookEvent<'issue_comment'>} IssueCommentEvent */
/** @typedef {import('node:test').TestContext} TestContext */

describe('metadata', () => {
  /** @type {import('probot').Context} */
  let context
  /** @type {IssueCommentEvent} */
  let event

  beforeEach(() => {
    event = /** @type {IssueCommentEvent} */ ({
      payload: {
        issue: { number: 42 },
        repository: {
          owner: { login: 'foo' },
          name: 'bar'
        },
        installation: { id: 1, node_id: 'MDQ6VXNlcjE=' }
      }
    })

    context = new Context(
      event,
      new ProbotOctokit({
        throttle: { enabled: false },
        retry: { enabled: false }
      }),
      /** @type {*} */ (console)
    )
  })

  describe('on issue without metdata', () => {
    describe('set', () => {
      test('sets a key', async (/** @type {TestContext} */t) => {
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

      test('sets an object', async (/** @type {TestContext} */t) => {
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
      test('returns undefined', async (/** @type {TestContext} */t) => {
        const mock = nock('https://api.github.com')
          .get('/repos/foo/bar/issues/42')
          .reply(200, {
            body: 'original post'
          })

        t.assert.strictEqual(await metadata(context).get('key'), undefined)
        t.assert.deepStrictEqual(mock.activeMocks(), [])
      })

      test('returns undefined without key', async (/** @type {TestContext} */t) => {
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
      test('sets new metadata', async (/** @type {TestContext} */t) => {
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

      test('overwrites exiting metadata', async (/** @type {TestContext} */t) => {
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

      test('merges object with existing metadata', async (/** @type {TestContext} */t) => {
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
      test('returns value', async (/** @type {TestContext} */t) => {
        const mock = nock('https://api.github.com')
          .get('/repos/foo/bar/issues/42')
          .reply(200, {
            body: 'original post\n\n<!-- probot = {"1":{"key":"value"}} -->'
          })

        t.assert.strictEqual(await metadata(context).get('key'), 'value')
        t.assert.deepStrictEqual(mock.activeMocks(), [])
      })

      test('returns undefined for unknown key', async (/** @type {TestContext} */t) => {
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
      test('sets new metadata', async (/** @type {TestContext} */t) => {
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

      test('sets an object', async (/** @type {TestContext} */t) => {
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
      test('returns undefined for unknown key', async (/** @type {TestContext} */t) => {
        const mock = nock('https://api.github.com')
          .get('/repos/foo/bar/issues/42')
          .reply(200, {
            body: 'original post\n\n<!-- probot = {"2":{"key":"value"}} -->'
          })

        t.assert.strictEqual(await metadata(context).get('unknown'), undefined)
        t.assert.deepStrictEqual(mock.activeMocks(), [])
      })

      test('returns undefined without a key', async (/** @type {TestContext} */t) => {
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
      test('sets new metadata', async (/** @type {TestContext} */t) => {
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

      test('sets an object', async (/** @type {TestContext} */t) => {
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
      test('returns undefined for unknown key', async (/** @type {TestContext} */t) => {
        const mock = nock('https://api.github.com')
          .get('/repos/foo/bar/issues/42')
          .reply(200, {
            body: null
          })

        t.assert.strictEqual(await metadata(context).get('unknown'), undefined)
        t.assert.deepStrictEqual(mock.activeMocks(), [])
      })

      test('returns undefined without a key', async (/** @type {TestContext} */t) => {
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
      test('returns the value without an API call', async (/** @type {TestContext} */t) => {
        t.assert.strictEqual(await metadata(context, issue).get('hello'), 'world')
      })
    })

    describe('set', () => {
      test('updates the value without an API call', async (/** @type {TestContext} */t) => {
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
