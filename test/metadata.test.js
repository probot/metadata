const metadata = require('..')
const Context = require('probot/lib/context')

describe('metadata', () => {
  let context, event, github

  beforeEach(() => {
    github = {
      issues: {
        update: jest.fn(),
        get: jest.fn().mockImplementation(() => Promise.resolve({
          data: {body: 'original post'}
        }))
      }
    }

    event = {
      payload: {
        issue: {number: 42},
        repository: {
          owner: {login: 'foo'},
          name: 'bar'
        },
        installation: {id: 1}
      }
    }

    context = new Context(event, github)
  })

  describe('on issue without metdata', () => {
    beforeEach(() => {
      github.issues.get.mockImplementation(() => Promise.resolve({
        data: {body: 'original post'}
      }))
    })

    describe('set', () => {
      test('sets a key', async () => {
        await metadata(context).set('key', 'value')

        expect(github.issues.update).toHaveBeenCalledWith({
          owner: 'foo',
          repo: 'bar',
          number: 42,
          body: 'original post\n\n<!-- probot = {"1":{"key":"value"}} -->'
        })
      })

      test('sets an object', async () => {
        await metadata(context).set({key: 'value'})

        expect(github.issues.update).toHaveBeenCalledWith({
          owner: 'foo',
          repo: 'bar',
          number: 42,
          body: 'original post\n\n<!-- probot = {"1":{"key":"value"}} -->'
        })
      })
    })

    describe('get', () => {
      test('returns undefined', async () => {
        expect(await metadata(context).get('key')).toEqual(undefined)
      })

      test('returns undefined without key', async () => {
        expect(await metadata(context).get()).toEqual(undefined)
      })
    })
  })

  describe('on issue with existing metadata', () => {
    beforeEach(() => {
      github.issues.get.mockImplementation(() => Promise.resolve({
        data: {body: 'original post\n\n<!-- probot = {"1":{"key":"value"}} -->'}
      }))
    })

    describe('set', () => {
      test('sets new metadata', async () => {
        await metadata(context).set('hello', 'world')

        expect(github.issues.update).toHaveBeenCalledWith({
          owner: 'foo',
          repo: 'bar',
          number: 42,
          body: 'original post\n\n<!-- probot = {"1":{"key":"value","hello":"world"}} -->'
        })
      })

      test('overwrites exiting metadata', async () => {
        await metadata(context).set('key', 'new value')

        expect(github.issues.update).toHaveBeenCalledWith({
          owner: 'foo',
          repo: 'bar',
          number: 42,
          body: 'original post\n\n<!-- probot = {"1":{"key":"new value"}} -->'
        })
      })

      test('merges object with existing metadata', async () => {
        await metadata(context).set({hello: 'world'})

        expect(github.issues.update).toHaveBeenCalledWith({
          owner: 'foo',
          repo: 'bar',
          number: 42,
          body: 'original post\n\n<!-- probot = {"1":{"key":"value","hello":"world"}} -->'
        })
      })
    })

    describe('get', () => {
      test('returns value', async () => {
        expect(await metadata(context).get('key')).toEqual('value')
      })

      test('returns undefined for unknown key', async () => {
        expect(await metadata(context).get('unknown')).toEqual(undefined)
      })
    })
  })

  describe('on issue with metadata for a different installation', () => {
    beforeEach(() => {
      github.issues.get.mockImplementation(() => Promise.resolve({
        data: {body: 'original post\n\n<!-- probot = {"2":{"key":"value"}} -->'}
      }))
    })

    describe('set', () => {
      test('sets new metadata', async () => {
        await metadata(context).set('hello', 'world')

        expect(github.issues.update).toHaveBeenCalledWith({
          owner: 'foo',
          repo: 'bar',
          number: 42,
          body: 'original post\n\n<!-- probot = {"1":{"hello":"world"},"2":{"key":"value"}} -->'
        })
      })

      test('sets an object', async () => {
        await metadata(context).set({hello: 'world'})

        expect(github.issues.update).toHaveBeenCalledWith({
          owner: 'foo',
          repo: 'bar',
          number: 42,
          body: 'original post\n\n<!-- probot = {"1":{"hello":"world"},"2":{"key":"value"}} -->'
        })
      })
    })

    describe('get', () => {
      test('returns undefined for unknown key', async () => {
        expect(await metadata(context).get('unknown')).toEqual(undefined)
      })

      test('returns undefined without a key', async() => {
        expect(await metadata(context).get()).toEqual(undefined)
      })
    })
  })

  describe('when given body in issue params', () => {
    const issue = {
      owner: 'foo',
      repo: 'bar',
      number: 42,
      body: 'hello world\n\n<!-- probot = {"1":{"hello":"world"}} -->'
    }

    describe('get', () => {
      test('returns the value without an API call', async () => {
        expect(await metadata(context, issue).get('hello')).toEqual('world')
        expect(github.issues.get).not.toHaveBeenCalled()
      })
    })

    describe('set', () => {
      test('updates the value without an API call', async () => {
        await metadata(context, issue).set('foo', 'bar')

        expect(github.issues.get).not.toHaveBeenCalled()

        expect(github.issues.update).toHaveBeenCalledWith({
          owner: 'foo',
          repo: 'bar',
          number: 42,
          body: 'hello world\n\n<!-- probot = {"1":{"hello":"world","foo":"bar"}} -->'
        })
      })
    })
  })
})
