# Companion-quality fixture

`scripts/test-companion-quality.ts` copies the template into clean temporary
directories, installs it with npm and pnpm, runs the full stack, and proves each
documented failure boundary. It also commits through the installed Husky hook
and proves that a malformed distributed hook blocks a commit.
