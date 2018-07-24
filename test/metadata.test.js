const Context = require('probot/lib/context')
const metadata = require('..')
const crypto = require('../crypto')()
const { regex } = metadata

const parseEditedIssueBody = async github => {
  const body = github.issues.edit.mock.calls[0][0].body
  const match = body.match(regex)
  return {
    prefix: body.substring(0, match.index),
    data: await crypto.decrypt(match[1]),
    suffix: body.substring(match.index + match[0].length)
  }
}

describe('metadata', () => {
  let context, event, github

  beforeEach(() => {
    github = {
      issues: {
        edit: jest.fn(),
        get: jest.fn().mockImplementation(() =>
          Promise.resolve({
            data: { body: 'original post' }
          })
        )
      }
    }

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

    context = new Context(event, github)
  })

  describe('on issue without metdata', () => {
    beforeEach(() => {
      github.issues.get.mockImplementation(() =>
        Promise.resolve({
          data: { body: 'original post' }
        })
      )
    })

    describe('set', () => {
      test('sets a key', async () => {
        await metadata(context).set('key', 'value')

        expect(github.issues.edit).toHaveBeenCalledWith({
          owner: 'foo',
          repo: 'bar',
          number: 42,
          body: expect.any(String)
        })
        expect(await parseEditedIssueBody(github)).toEqual({
          data: { '1': { key: 'value' } },
          prefix: 'original post',
          suffix: ''
        })
      })

      test('sets an object', async () => {
        await metadata(context).set({ key: 'value' })

        expect(github.issues.edit).toHaveBeenCalledWith({
          owner: 'foo',
          repo: 'bar',
          number: 42,
          body: expect.any(String)
        })
        expect(await parseEditedIssueBody(github)).toEqual({
          data: { '1': { key: 'value' } },
          prefix: 'original post',
          suffix: ''
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
      github.issues.get.mockImplementation(async () => {
        return {
          data: {
            body: `original post\n\n<!-- probot = ${await crypto.encrypt({
              '1': { key: 'value' }
            })} -->`
          }
        }
      })
    })

    describe('set', () => {
      test('sets new metadata', async () => {
        await metadata(context).set('hello', 'world')

        expect(github.issues.edit).toHaveBeenCalledWith({
          owner: 'foo',
          repo: 'bar',
          number: 42,
          body: expect.any(String)
        })
        expect(await parseEditedIssueBody(github)).toEqual({
          data: { '1': { hello: 'world', key: 'value' } },
          prefix: 'original post',
          suffix: ''
        })
      })

      test('overwrites exiting metadata', async () => {
        await metadata(context).set('key', 'new value')

        expect(github.issues.edit).toHaveBeenCalledWith({
          owner: 'foo',
          repo: 'bar',
          number: 42,
          body: expect.any(String)
        })
        expect(await parseEditedIssueBody(github)).toEqual({
          data: { '1': { key: 'new value' } },
          prefix: 'original post',
          suffix: ''
        })
      })

      test('merges object with existing metadata', async () => {
        await metadata(context).set({ hello: 'world' })

        expect(github.issues.edit).toHaveBeenCalledWith({
          owner: 'foo',
          repo: 'bar',
          number: 42,
          body: expect.any(String)
        })
        expect(await parseEditedIssueBody(github)).toEqual({
          data: { '1': { hello: 'world', key: 'value' } },
          prefix: 'original post',
          suffix: ''
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
      github.issues.get.mockImplementation(async () => {
        return {
          data: {
            body: `original post\n\n<!-- probot = ${await crypto.encrypt({
              '2': { key: 'value' }
            })} -->`
          }
        }
      })
    })

    describe('set', () => {
      test('sets new metadata', async () => {
        await metadata(context).set('hello', 'world')

        expect(github.issues.edit).toHaveBeenCalledWith({
          owner: 'foo',
          repo: 'bar',
          number: 42,
          body: expect.any(String)
        })
        expect(await parseEditedIssueBody(github)).toEqual({
          data: { '1': { hello: 'world' }, '2': { key: 'value' } },
          prefix: 'original post',
          suffix: ''
        })
      })

      test('sets an object', async () => {
        await metadata(context).set({ hello: 'world' })

        expect(github.issues.edit).toHaveBeenCalledWith({
          owner: 'foo',
          repo: 'bar',
          number: 42,
          body: expect.any(String)
        })
        expect(await parseEditedIssueBody(github)).toEqual({
          data: { '1': { hello: 'world' }, '2': { key: 'value' } },
          prefix: 'original post',
          suffix: ''
        })
      })
    })

    describe('get', () => {
      test('returns undefined for unknown key', async () => {
        expect(await metadata(context).get('unknown')).toEqual(undefined)
      })

      test('returns undefined without a key', async () => {
        expect(await metadata(context).get()).toEqual(undefined)
      })
    })
  })

  describe('when given body in issue params', () => {
    let issue

    beforeEach(async () => {
      issue = {
        owner: 'foo',
        repo: 'bar',
        number: 42,
        body: `hello world\n\n<!-- probot = ${await crypto.encrypt({
          '1': { hello: 'world' }
        })} -->`
      }
    })

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

        expect(github.issues.edit).toHaveBeenCalledWith({
          owner: 'foo',
          repo: 'bar',
          number: 42,
          body: expect.any(String)
        })
        expect(await parseEditedIssueBody(github)).toEqual({
          data: { '1': { foo: 'bar', hello: 'world' } },
          prefix: 'hello world',
          suffix: ''
        })
      })
    })
  })
})
