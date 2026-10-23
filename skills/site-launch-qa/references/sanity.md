# Sanity checks and fixes

## Access

- **Read:** `npx sanity exec qa/tools/sanity-audit.mjs --with-user-token`, run from the folder that holds `sanity.cli.ts` (the repo root, or `studio/` in the site starter). `--with-user-token` uses Andru's own login (`npx sanity login` if it fails), so drafts are visible and no token is written anywhere.
- **Schema rules:** `npx sanity documents validate -y` runs the schema's own validation against every document.
- **Write (approved items only):** write a small script in `qa/tools/` that patches exactly the approved fields and prints each change, then `npx sanity exec qa/tools/<script>.mjs --with-user-token`. Run it once against a dry-run flag first and show Andru the planned changes. Patch the published document and any draft of it, so the next publish does not undo the fix.

The dataset is usually public, which means anyone with the project ID can read every published document through the API, even ones the site never shows. That is why D10 exists: old published documents, internal notes and prices can leak even when the pages look clean.

## D7: validation rules that protect the site after launch

These are code, so they are auto-fixed on the branch. Match the project's existing schema style (`defineField`, helpers in `shared.ts` and so on). Patterns:

```ts
// Slug: required, unique within the type, generated from the title
defineField({
  name: 'slug', type: 'slug', options: { source: 'title', maxLength: 96 },
  validation: (rule) => rule.required(),
}),

// Image with alt text required unless marked decorative, and a hotspot for crops
defineField({
  name: 'image', type: 'image', options: { hotspot: true },
  fields: [
    defineField({ name: 'decorative', type: 'boolean', title: 'Decorative (no alt text needed)', initialValue: false }),
    defineField({
      name: 'alt', type: 'string', title: 'Alt text',
      description: 'What the photo shows, for people using screen readers and for search engines. Example: Stone fireplace in the great room of the Ridge House',
      validation: (rule) => rule.custom((alt, ctx) => {
        const parent = ctx.parent as { decorative?: boolean; asset?: unknown } | undefined;
        if (!parent?.asset || parent.decorative) return true;
        return alt?.trim() ? true : 'Add alt text, or mark the image decorative';
      }),
    }),
  ],
}),

// SEO fields with length guidance (warnings, so a client is nudged, not blocked)
defineField({
  name: 'seo', type: 'object', fields: [
    defineField({ name: 'title', type: 'string', validation: (rule) => rule.max(60).warning('Keep it under 60 characters so Google shows all of it') }),
    defineField({ name: 'description', type: 'text', rows: 3, validation: (rule) => [
      rule.required().warning('Add a description; Google shows it under the title'),
      rule.min(120).warning('A little short; aim for 140 to 160 characters'),
      rule.max(160).warning('Over 160 characters gets cut off'),
    ] }),
  ],
}),
```

For homes and communities, require the facts the page and the schema depend on: title, slug, main image, location (town or community reference), year finished. Use `.warning()` rather than `.required()` for facts a client may not have yet (square footage, build time), so they can still publish.

Uniqueness of slugs within a type is Sanity's default `isUnique`; check no custom `isUnique` has been switched off.

## Drafted alt text (D5)

Write alt text from what the image shows and the document it sits in ("Kitchen with white oak island in the Ridge House, Braselton"). Never guess facts that are not visible or in the document. Put the full list on the approval list as a table (document, field path, image thumbnail URL, proposed alt) so Andru can approve it in one go.
