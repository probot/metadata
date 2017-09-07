# Probot: metadata

A [Probot](https://github.com/probot/probot) extension to store metadata on an Issue and Pull Request.

## Usage

```js
const metadata = require('probot-metadata');

// where `context` is either a Probot `Context`, or an object with `owner`, `repo`, and `number values`
metadata.set(context, key, value);
const value = await metadata.get(context, key)
```

## Example

```js
const metadata = require('probot-metadata');

module.exports = robot => {
  robot.on('issue_comment.created', context => {
    match = context.payload.comment.body.match('/snooze (.*)')
    if(match) {
      metadata.set(context, 'snooze', match[1]);
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
