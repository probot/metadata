# Probot: metadata

A [Probot](https://github.com/probot/probot) extension to store metadata on Issues and Pull Requests.

## Usage

```js
const metadata = require('probot-metadata');

// where `context` is a Probot `Context`
const kv = metadata(context.github, context.issue())

kv.set(key, value)
const value = await kv.get(key)
```

## Example

```js
const metadata = require('probot-metadata');

module.exports = robot => {
  robot.on('issue_comment.created', context => {
    const kv = metadata(context.github, context.issue())

    match = context.payload.comment.body.match('/snooze (.*)')
    if(match) {
      kv.set(context, 'snooze', match[1]);
    }
  })
}
```

## How it works

This extension is what you might call "a hack". GitHub doesn't have an API for storing metadata on Issues and Pull Requests, but it does have rather large comment fields. GitHub renders the comments as Markdown and will strip any unsupported HTML (including HTML comments like `<!-- I can put whatever I want here -->`), but still serves up the raw comment body through the API. This extension takes advantage of this "feature" to store JSON values on Issues and Pull Requests as HTML comments.

It will update the body of the original post and append an HTML comment with JSON values for each key. For example:

```markdown
This is the body of the original post

<!-- probot = {"json": "here"} -->
```
