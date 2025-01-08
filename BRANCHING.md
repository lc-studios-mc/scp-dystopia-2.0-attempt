# Git Branching Strategy

Our branching strategy is just like [GitHub flow](https://docs.github.com/get-started/using-github/github-flow).

Few things to note:

- When merging changes from a feature branch back into `main`, creating a merge commit is not allowed. Do rebase or squash-merge instead.
- "Work-in-progress" commits should not exist at any point in `main`.
- We use git tags to differentiate releases.
