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
      test('sets a key', async () => {
        const mock = nock('https://api.github.com')
          .get('/repos/foo/bar/issues/42')
          .reply(200, {
            body: 'original post'
          })
          .patch('/repos/foo/bar/issues/42', (requestBody) => {
            expect(requestBody.body).toEqual(`original post\n\n<!-- probot = {"1":{"key":"value"}} -->`)
            return true
          })
          .reply(204)

        await metadata(context).set('key', 'value')
        expect(mock.activeMocks()).toStrictEqual([])
      })

      test('sets an object', async () => {
        const mock = nock('https://api.github.com')
          .get('/repos/foo/bar/issues/42')
          .reply(200, {
            body: 'original post'
          })
          .patch('/repos/foo/bar/issues/42', (requestBody) => {
            expect(requestBody.body).toEqual(`original post\n\n<!-- probot = {"1":{"key":"value"}} -->`)
            return true
          })
          .reply(204)

        await metadata(context).set({ key: 'value' })

        expect(mock.activeMocks()).toStrictEqual([])
      })
    })

    describe('get', () => {
      test('returns undefined', async () => {
        const mock = nock('https://api.github.com')
          .get('/repos/foo/bar/issues/42')
          .reply(200, {
            body: 'original post'
          })

        expect(await metadata(context).get('key')).toEqual(undefined)

        expect(mock.activeMocks()).toStrictEqual([])
      })

      test('returns undefined without key', async () => {
        const mock = nock('https://api.github.com')
          .get('/repos/foo/bar/issues/42')
          .reply(200, {
            body: 'original post'
          })

        expect(await metadata(context).get()).toEqual(undefined)

        expect(mock.activeMocks()).toStrictEqual([])
      })
    })
  })

  describe('on issue with existing metadata', () => {
    describe('set', () => {
      test('sets new metadata', async () => {
        const mock = nock('https://api.github.com')
          .get('/repos/foo/bar/issues/42')
          .reply(200, {
            body: 'original post\n\n<!-- probot = {"1":{"key":"value"}} -->'
          })
          .patch('/repos/foo/bar/issues/42', (requestBody) => {
            expect(requestBody.body).toEqual('original post\n\n<!-- probot = {"1":{"key":"value","hello":"world"}} -->')
            return true
          })
          .reply(204)

        await metadata(context).set('hello', 'world')
        expect(mock.activeMocks()).toStrictEqual([])
      })

      test('overwrites exiting metadata', async () => {
        const mock = nock('https://api.github.com')
          .get('/repos/foo/bar/issues/42')
          .reply(200, {
            body: 'original post\n\n<!-- probot = {"1":{"key":"value"}} -->'
          })
          .patch('/repos/foo/bar/issues/42', (requestBody) => {
            expect(requestBody.body).toEqual('original post\n\n<!-- probot = {"1":{"key":"new value"}} -->')
            return true
          })
          .reply(204)

        await metadata(context).set('key', 'new value')
        expect(mock.activeMocks()).toStrictEqual([])
      })

      test('merges object with existing metadata', async () => {
        const mock = nock('https://api.github.com')
          .get('/repos/foo/bar/issues/42')
          .reply(200, {
            body: 'original post\n\n<!-- probot = {"1":{"key":"value"}} -->'
          })
          .patch('/repos/foo/bar/issues/42', (requestBody) => {
            expect(requestBody.body).toEqual('original post\n\n<!-- probot = {"1":{"key":"value","hello":"world"}} -->')
            return true
          })
          .reply(204)

        await metadata(context).set({ hello: 'world' })
        expect(mock.activeMocks()).toStrictEqual([])
      })
    })

    describe('get', () => {
      test('returns value', async () => {
        const mock = nock('https://api.github.com')
          .get('/repos/foo/bar/issues/42')
          .reply(200, {
            body: 'original post\n\n<!-- probot = {"1":{"key":"value"}} -->'
          })

        expect(await metadata(context).get('key')).toEqual('value')

        expect(mock.activeMocks()).toStrictEqual([])
      })

      test('returns undefined for unknown key', async () => {
        const mock = nock('https://api.github.com')
          .get('/repos/foo/bar/issues/42')
          .reply(200, {
            body: 'original post\n\n<!-- probot = {"1":{"key":"value"}} -->'
          })

        expect(await metadata(context).get('unknown')).toEqual(undefined)
        expect(mock.activeMocks()).toStrictEqual([])
      })
    })
  })

  describe('on issue with metadata for a different installation', () => {
    describe('set', () => {
      test('sets new metadata', async () => {
        const mock = nock('https://api.github.com')
          .get('/repos/foo/bar/issues/42')
          .reply(200, {
            body: 'original post\n\n<!-- probot = {"2":{"key":"value"}} -->'
          })
          .patch('/repos/foo/bar/issues/42', (requestBody) => {
            expect(requestBody.body).toEqual('original post\n\n<!-- probot = {"1":{"hello":"world"},"2":{"key":"value"}} -->')
            return true
          })
          .reply(204)

        await metadata(context).set('hello', 'world')
        expect(mock.activeMocks()).toStrictEqual([])
      })

      test('sets an object', async () => {
        const mock = nock('https://api.github.com')
          .get('/repos/foo/bar/issues/42')
          .reply(200, {
            body: 'original post\n\n<!-- probot = {"2":{"key":"value"}} -->'
          })
          .patch('/repos/foo/bar/issues/42', (requestBody) => {
            expect(requestBody.body).toEqual('original post\n\n<!-- probot = {"1":{"hello":"world"},"2":{"key":"value"}} -->')
            return true
          })
          .reply(204)

        await metadata(context).set({ hello: 'world' })
        expect(mock.activeMocks()).toStrictEqual([])
      })
    })

    describe('get', () => {
      test('returns undefined for unknown key', async () => {
        const mock = nock('https://api.github.com')
          .get('/repos/foo/bar/issues/42')
          .reply(200, {
            body: 'original post\n\n<!-- probot = {"2":{"key":"value"}} -->'
          })

        expect(await metadata(context).get('unknown')).toEqual(undefined)

        expect(mock.activeMocks()).toStrictEqual([])
      })

      test('returns undefined without a key', async () => {
        const mock = nock('https://api.github.com')
          .get('/repos/foo/bar/issues/42')
          .reply(200, {
            body: 'original post\n\n<!-- probot = {"2":{"key":"value"}} -->'
          })

        expect(await metadata(context).get()).toEqual(undefined)
        expect(mock.activeMocks()).toStrictEqual([])
      })
    })
  })

  describe('on an issue with no content in the body', () => {
    describe('set', () => {
      test('sets new metadata', async () => {
        const mock = nock('https://api.github.com')
          .get('/repos/foo/bar/issues/42')
          .reply(200, {
            body: null
          })
          .patch('/repos/foo/bar/issues/42', (requestBody) => {
            expect(requestBody.body).toEqual('\n\n<!-- probot = {"1":{"hello":"world"}} -->')
            return true
          })
          .reply(204)

        await metadata(context).set('hello', 'world')
        expect(mock.activeMocks()).toStrictEqual([])
      })

      test('sets an object', async () => {
        const mock = nock('https://api.github.com')
          .get('/repos/foo/bar/issues/42')
          .reply(200, {
            body: null
          })
          .patch('/repos/foo/bar/issues/42', (requestBody) => {
            expect(requestBody.body).toEqual('\n\n<!-- probot = {"1":{"hello":"world"}} -->')
            return true
          })
          .reply(204)

        await metadata(context).set({ hello: 'world' })
        expect(mock.activeMocks()).toStrictEqual([])
      })
    })

    describe('get', () => {
      test('returns undefined for unknown key', async () => {
        const mock = nock('https://api.github.com')
          .get('/repos/foo/bar/issues/42')
          .reply(200, {
            body: null
          })

        expect(await metadata(context).get('unknown')).toEqual(undefined)
        expect(mock.activeMocks()).toStrictEqual([])
      })

      test('returns undefined without a key', async () => {
        const mock = nock('https://api.github.com')
          .get('/repos/foo/bar/issues/42')
          .reply(200, {
            body: null
          })

        expect(await metadata(context).get()).toEqual(undefined)
        expect(mock.activeMocks()).toStrictEqual([])
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
      test('returns the value without an API call', async () => {
        expect(await metadata(context, issue).get('hello')).toEqual('world')
      })
    })

    describe('set', () => {
      test('updates the value without an API call', async () => {
        const mock = nock('https://api.github.com')
          .patch('/repos/foo/bar/issues/42', (requestBody) => {
            expect(requestBody.body).toEqual('hello world\n\n<!-- probot = {"1":{"hello":"world","foo":"bar"}} -->')
            return true
          })
          .reply(204)

        await metadata(context, issue).set('foo', 'bar')
        expect(mock.activeMocks()).toStrictEqual([])
      })
    })
  })
})
