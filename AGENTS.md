# Project implementation rules

- Keep an explicit `vite.css.devSourcemap` default in `vite.config.ts` because the preview plugin host does not provide the CSS configuration Tailwind expects; do not replace the existing design or authentication to work around stylesheet transform failures.
