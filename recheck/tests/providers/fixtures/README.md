# Provider search fixtures

Used only by the tests in `tests/providers/`.

- `npi-exact-zip.json`, `npi-zip-prefix.json`, `npi-error.json` are real NPI
  Registry API v2.1 responses (public provider registry data), trimmed to a few
  records. Recorded 2026-11-14 from:
  - `?version=2.1&postal_code=78701&taxonomy_description=sports medicine&address_purpose=LOCATION`
  - `?version=2.1&postal_code=787*&taxonomy_description=sports medicine&address_purpose=LOCATION`
  - `?version=2.1&state=TX` (rejected: state needs another criterion)

  Authorized-official names and the sex field were removed.
- `places-search.json`, `places-geocode.json` are hand-written to the documented
  Places API (New) Text Search response shape, with placeholder businesses
  ("Example ...", `example.com`), because no API key was available when they
  were made. Replace them with recorded responses once a key is set.
