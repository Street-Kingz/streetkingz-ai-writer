# Root-cause analysis

`progressive-001` narrowed before catalogue-wide discovery. In
`validation/v1-01/progressive.js`, the exported `RECOMMENDATIONS` constant is a
fixed four-item array beginning with the Heavy Duty Drying Towel destination.
`buildRun()` copies that array into sparse and enriched outputs, and `writeRun()`
serialises it without reading `STREET_KINGZ_PRODUCTS`, generating clusters, or
running a comparative decision stage. The prior research artefact was likewise
seeded from the Heavy Duty towel query, so alternative product families were not
generated or researched.

This correction uses `validation/v1-01/cataloguewide.js` to map the complete
catalogue and represent each customer-job cluster before applying the evidence
gate. Historical `progressive-001` and `progressive-002-storewide` artefacts were
not modified.
