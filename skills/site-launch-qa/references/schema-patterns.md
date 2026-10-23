# Structured data patterns

Reference implementation: `~/Sites/andrubailey-astro` (`src/lib/schema.ts` for the page helpers, `src/data/home-jsonld.json` for the home page graph). Use the same shape on client sites, with `GeneralContractor` as the business type.

## Why these choices

- **GeneralContractor** is the default type. In schema.org it is a kind of HomeAndConstructionBusiness, which is a kind of LocalBusiness, so it carries every property of both; listing "both" types adds nothing. There is no "home builder" type.
- **The full business node lives on the home page** with a stable `@id` (`https://<domain>/#business`). Every other page that mentions the business embeds a short version (type, `@id`, name, url, logo), because Google does not follow an `@id` from one page to another. The same goes for the founder (`#founder`).
- **Values come from the site.** Every phone number, address, hour and area in the markup must also be visible on the site and identical to the Google Business Profile. Markup that says something the page does not is a policy problem, not a bonus.
- **No star ratings for the business itself.** Google treats `aggregateRating` or `review` on a business's own site about that business as self-serving and does not show them; it can be seen as manipulation. Keep testimonials as visible text and leave them out of the markup.
- **FAQPage** still validates and still helps machines read Q and A pairs, but since 2023 Google only shows FAQ rich results for government and health sites. Do not promise stars or dropdowns in search.
- **No `priceRange`, `Offer` or prices** unless the client already publishes them.

## Home page graph

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://smithhomes.com/#website",
      "url": "https://smithhomes.com/",
      "name": "Smith Homes",
      "publisher": { "@id": "https://smithhomes.com/#business" },
      "inLanguage": "en-US"
    },
    {
      "@type": "GeneralContractor",
      "@id": "https://smithhomes.com/#business",
      "name": "Smith Homes",
      "legalName": "Smith Homes LLC",
      "url": "https://smithhomes.com/",
      "logo": "https://smithhomes.com/images/logo.png",
      "image": ["https://smithhomes.com/images/og.jpg"],
      "description": "Custom homes on Lake Lanier and in Jackson County, Georgia, built by Jim Smith since 2004.",
      "telephone": "+1-770-555-0100",
      "email": "office@smithhomes.com",
      "address": { "@type": "PostalAddress", "streetAddress": "123 Main St", "addressLocality": "Jefferson", "addressRegion": "GA", "postalCode": "30549", "addressCountry": "US" },
      "geo": { "@type": "GeoCoordinates", "latitude": 34.11712, "longitude": -83.57240 },
      "areaServed": [
        { "@type": "AdministrativeArea", "name": "Jackson County, Georgia", "sameAs": "https://en.wikipedia.org/wiki/Jackson_County,_Georgia" },
        { "@type": "Place", "name": "Lake Lanier" },
        { "@type": "City", "name": "Braselton, Georgia" }
      ],
      "openingHoursSpecification": [{ "@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "opens": "08:00", "closes": "17:00" }],
      "founder": { "@id": "https://smithhomes.com/#founder" },
      "foundingDate": "2004",
      "knowsAbout": ["Custom home building", "Lake homes", "Modern farmhouse homes"],
      "memberOf": [{ "@type": "Organization", "name": "Home Builders Association of Northeast Georgia" }],
      "hasCredential": { "@type": "EducationalOccupationalCredential", "credentialCategory": "license", "name": "Georgia Residential Basic Contractor License RBQA000000" },
      "sameAs": ["https://maps.google.com/?cid=000000", "https://www.houzz.com/professionals/...", "https://www.facebook.com/...", "https://www.instagram.com/..."]
    },
    {
      "@type": "Person",
      "@id": "https://smithhomes.com/#founder",
      "name": "Jim Smith",
      "jobTitle": "Founder and builder",
      "image": "https://smithhomes.com/images/jim-smith.jpg",
      "url": "https://smithhomes.com/about",
      "worksFor": { "@id": "https://smithhomes.com/#business" },
      "sameAs": ["https://www.linkedin.com/in/..."]
    },
    {
      "@type": "FAQPage",
      "@id": "https://smithhomes.com/#faq",
      "mainEntity": [
        { "@type": "Question", "name": "How long does it take to build a custom home?", "acceptedAnswer": { "@type": "Answer", "text": "Most of our homes take 10 to 14 months from permit to keys. Lake lots with steep grades add one to three months." } }
      ]
    }
  ]
}
```

Notes:
- Service-area business with no public office: drop `address` and `geo`, keep `areaServed`, and match the GBP (address hidden).
- `geo` to five decimals, taken from the GBP pin, not guessed.
- `sameAs` for the GBP: the Maps URL with `cid` (from the GBP "Share" link, then follow the redirect), not a search URL.
- `hasCredential`, `memberOf`, `foundingDate`, `knowsAbout`: only with facts the client supplied.
- `areaServed`: one entry per blueprint service area. A Wikipedia or Wikidata `sameAs` on counties and cities removes ambiguity (there are many Jackson Counties).

## Other pages

Every page below home: `BreadcrumbList` plus the page's own node, with the short business and founder nodes embedded.

| Page | Node |
|---|---|
| About | `AboutPage` (or `ProfilePage` for a one-person business) with `mainEntity` the founder `Person` |
| Home (a finished house) | `CreativeWork` with `name`, `description`, `image` (several), `dateCreated` (year finished), `locationCreated` (`Place` with `address.addressLocality`; never the street address of a client's home), `creator` the business, optionally `about` a `SingleFamilyResidence` with `floorSize` and `numberOfRooms` |
| Community or service area | `WebPage` with `about` a `Place` (name, `containedInPlace` the county, `sameAs` Wikipedia) and `mainEntity` an `ItemList` of the homes there |
| Homes grid, blog index | `CollectionPage` (or `Blog`) with an `ItemList` |
| Blog post | `BlogPosting` with headline, description, image, `datePublished`, `dateModified`, `author` the founder, `publisher` the business |
| Contact | `ContactPage` with the short business node (telephone, email) |
| Process | `WebPage`; a `HowTo` is retired by Google, so do not add one |

```json
{
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://smithhomes.com/" },
    { "@type": "ListItem", "position": 2, "name": "Homes", "item": "https://smithhomes.com/homes" },
    { "@type": "ListItem", "position": 3, "name": "The Ridge House", "item": "https://smithhomes.com/homes/the-ridge-house" }
  ]
}
```

## Validation

1. `node qa/tools/schema-check.mjs` (parse, the Schema.org validator, consistency with the page and the inputs).
2. Google Rich Results Test on the home page, one home, one FAQ page and one post. On a protected preview, paste the JSON-LD into the Code tab.
3. After launch: Search Console, Enhancements, for anything Google flags on the live site.
