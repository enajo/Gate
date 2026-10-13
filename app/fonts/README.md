# Marketing fonts

Self-hosted with `next/font/local` (see `app/(marketing)/layout.tsx`) instead of
`next/font/google`, so `next build` never downloads anything from Google. CI's
build broke when Google Fonts started returning stylesheets Turbopack couldn't
parse; local files can't change under us.

Latin subset only, same weights as before. Taken from the Fontsource packages
(v5.3.0): `@fontsource/ibm-plex-sans`, `@fontsource/ibm-plex-mono`,
`@fontsource-variable/fraunces`. All three typefaces are licensed under the
SIL Open Font License 1.1, which permits bundling them with the app.
