---
name: git-workflow
description: A skill when you working with a git repository
---

When you code with a git repository, always follow the git workflow.

## Workflow

1. Check if the working dir is a git repository, if not init a new git repository. (`git init`)
2. Always pull the latest changes from the remote repository before change code. (`git pull`)
3. Always checkout to a new branch before you start working on a new feature or bug fix. (`git checkout -b <branch-name>`)
4. Then write code and commit changes frequently. (`git add .`, then `git commit -m "<commit-message>"`)
5. When you finished, push changes to the remote repository. (`git push` or `git push -u origin <current-branch-name>`)

## Commit Message Specification

- **Be Descriptive**: Write clear and descriptive commit messages.
- **Use Imperative Mood**: Write commit messages in the imperative mood, e.g., "Add feature" instead of "Added feature".
- **Limit to 50 Characters**: Keep commit messages within 50 characters.
- **Add Optional Body**: If needed, add a body to the commit message to provide more context. limit to 100 characters.

Commit message format:

```
<type>: <subject>

<body>
```

Available types:

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools and libraries such as documentation generation
