const metadata = require('..')
const Context = require('probot/lib/context')

describe('metadata', () => {
  let context, event, github

  beforeEach(() => {
    github = {
      issues: {
        edit: jest.fn(),
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
      github.issues.get.mockReturnValueOnce(Promise.resolve({
        data: {body: 'original post'}
      }))
    })

    describe('set', () => {
      it('sets a key', async () => {
        await metadata(context).set('key', 'value')

        expect(github.issues.edit).toHaveBeenCalledWith({
          owner: 'foo',
          repo: 'bar',
          number: 42,
          body: 'original post\n\n<!-- probot = {"1":{"key":"value"}} -->'
        })
      })

      it('sets an object', async () => {
        await metadata(context).set({key: 'value'})

        expect(github.issues.edit).toHaveBeenCalledWith({
          owner: 'foo',
          repo: 'bar',
          number: 42,
          body: 'original post\n\n<!-- probot = {"1":{"key":"value"}} -->'
        })
      })
    })

    describe('get', () => {
      it('returns null', async () => {
        expect(await metadata(context).get('key')).toEqual(null)
      })

      it('returns null without key', async () => {
        expect(await metadata(context).get()).toEqual(null)
      })
    })
  })

  describe('on issue with existing metadata', () => {
    beforeEach(() => {
      github.issues.get.mockReturnValueOnce(Promise.resolve({
        data: {body: 'original post\n\n<!-- probot = {"1":{"key":"value"}} -->'}
      }))
    })

    describe('set', () => {
      it('sets new metadata', async () => {
        await metadata(context).set('hello', 'world')

        expect(github.issues.edit).toHaveBeenCalledWith({
          owner: 'foo',
          repo: 'bar',
          number: 42,
          body: 'original post\n\n<!-- probot = {"1":{"key":"value","hello":"world"}} -->'
        })
      })

      it('overwrites exiting metadata', async () => {
        await metadata(context).set('key', 'new value')

        expect(github.issues.edit).toHaveBeenCalledWith({
          owner: 'foo',
          repo: 'bar',
          number: 42,
          body: 'original post\n\n<!-- probot = {"1":{"key":"new value"}} -->'
        })
      })

      it('merges object with existing metadata', async () => {
        await metadata(context).set({hello: 'world'})

        expect(github.issues.edit).toHaveBeenCalledWith({
          owner: 'foo',
          repo: 'bar',
          number: 42,
          body: 'original post\n\n<!-- probot = {"1":{"key":"value","hello":"world"}} -->'
        })
      })
    })

    describe('get', () => {
      it('returns value', async () => {
        expect(await metadata(context).get('key')).toEqual('value')
      })

      it('returns null for unknown key', async () => {
        expect(await metadata(context).get('unknown')).toEqual(null)
      })
    })
  })

  describe('on issue with metadata for a different installation', () => {
    beforeEach(() => {
      github.issues.get.mockReturnValueOnce(Promise.resolve({
        data: {body: 'original post\n\n<!-- probot = {"2":{"key":"value"}} -->'}
      }))
    })

    describe('set', () => {
      it('sets new metadata', async () => {
        await metadata(context).set('hello', 'world')

        expect(github.issues.edit).toHaveBeenCalledWith({
          owner: 'foo',
          repo: 'bar',
          number: 42,
          body: 'original post\n\n<!-- probot = {"1":{"hello":"world"},"2":{"key":"value"}} -->'
        })
      })

      it('sets an object', async () => {
        await metadata(context).set({hello: 'world'})

        expect(github.issues.edit).toHaveBeenCalledWith({
          owner: 'foo',
          repo: 'bar',
          number: 42,
          body: 'original post\n\n<!-- probot = {"1":{"hello":"world"},"2":{"key":"value"}} -->'
        })
      })
    })

    describe('get', () => {
      it('returns null for unknown key', async () => {
        expect(await metadata(context).get('unknown')).toEqual(null)
      })

      it('returns null without a key', async() => {
        expect(await metadata(context).get()).toEqual(null)
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
      it('returns the value without an API call', async () => {
        expect(await metadata(context, issue).get('hello')).toEqual('world')
        expect(github.issues.get).not.toHaveBeenCalled()
      })
    })

    describe('set', () => {
      it('updates the value without an API call', async () => {
        await metadata(context, issue).set('foo', 'bar')

        expect(github.issues.get).not.toHaveBeenCalled()

        expect(github.issues.edit).toHaveBeenCalledWith({
          owner: 'foo',
          repo: 'bar',
          number: 42,
          body: 'hello world\n\n<!-- probot = {"1":{"hello":"world","foo":"bar"}} -->'
        })
      })
    })
  })
})
