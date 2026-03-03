---
name: send-file-to-user
description: Send a file to the specified user.
---

When you need to send a file to the user, you can use this skill.

## Parameters

| Name | Type | Description | Required | Default |
| --- | --- | --- | --- | --- |
| `file` | `string` | The file path to send | Yes | N/A |
| `user` | `string` | The user ID to send the file to | Yes | N/A |

## Usage

Before you run `send-file.js` script, you need to check if the user provide the userId,
If not, you need to ask for it before run this script.

Script files is placed in `~/.claude/skills/send-file/scripts`

```bash
# cwd: ~/.claude/skills/send-file/scripts
node send-file.js <user-id> <file-path>
```
