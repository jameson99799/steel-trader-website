# Test discovery baseline

## Baseline validation

Ran `node --test test/*.test.js` before changing the package script.

- Result: 15 passing tests, 0 failures.
- Formal suite: `test/*.test.js`.

## Root cause and fix

`npm test` used `node --test` with no explicit paths. Node's automatic discovery included unrelated manual diagnostic files under `scratch/` and `server/test.js`.

The `test` script now explicitly runs `node --test test/*.test.js`. Node resolves this glob itself, so the command is usable by npm on Windows as well as POSIX shells. Diagnostic files remain unchanged and are no longer part of the standard test command.

## Post-change validation

- `npm.cmd test`: 15 passing tests, 0 failures (exit code 0).
- `git diff --check`: clean (exit code 0).
