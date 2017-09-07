const expect = require('expect')
const metadata = require('..')

describe('metadata', () => {
  let github
  let kv

  beforeEach(() => {
    github = {
      issues: {
        edit: expect.createSpy(),
        get: expect.createSpy().andReturn(Promise.resolve({
          data: {body: 'original post'}
        }))
      }
    }

    kv = metadata(github, {owner: 'foo', repo: 'bar', number: 42})
  })

  describe('on issue without metdata', () => {
    beforeEach(() => {
      github.issues.get.andReturn(Promise.resolve({
        data: {body: 'original post'}
      }))
    })

    describe('set', () => {
      it('sets metadata', async () => {
        await kv.set('key', 'value')

        expect(github.issues.edit).toHaveBeenCalledWith({
          owner: 'foo',
          repo: 'bar',
          number: 42,
          body: 'original post\n\n<!-- probot = {"key":"value"} -->'
        })
      })
    })

    describe('get', () => {
      it('returns null', async () => {
        expect(await kv.get('key')).toEqual(null)
      })
    })
  })

  describe('on issue with existing metadata', () => {
    beforeEach(() => {
      github.issues.get.andReturn(Promise.resolve({
        data: {body: 'original post\n\n<!-- probot = {"key":"value"} -->'}
      }))
    })

    describe('set', () => {
      it('sets new metadata', async () => {
        await kv.set('hello', 'world')

        expect(github.issues.edit).toHaveBeenCalledWith({
          owner: 'foo',
          repo: 'bar',
          number: 42,
          body: 'original post\n\n<!-- probot = {"key":"value","hello":"world"} -->'
        })
      })

      it('overwrites exiting metadata', async () => {
        await kv.set('key', 'new value')

        expect(github.issues.edit).toHaveBeenCalledWith({
          owner: 'foo',
          repo: 'bar',
          number: 42,
          body: 'original post\n\n<!-- probot = {"key":"new value"} -->'
        })
      })
    })

    describe('get', () => {
      it('returns value', async () => {
        expect(await kv.get('key')).toEqual('value')
      })

      it('returns null for unknown key', async () => {
        expect(await kv.get('unknown')).toEqual(null)
      })
    })
  })
})
