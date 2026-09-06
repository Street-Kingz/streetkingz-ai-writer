# V1-05 Slice B internal-link attribution correction

This is a harness-only truth correction. The frozen input fixture bytes, all input SHA-256 values, Slice A discovery expectations, intent, intervention, and high-impact labels are unchanged.

Cases V105-EVAL-014, V105-EVAL-015, and V105-EVAL-016 already describe established directed internal-link relationships. Their expected target sets now contain the known page pair:

- 014: `page:page-b`, `page:page-a`
- 015: `page:page-b`, `page:page-a`
- 016: `page:page-a`, `page:page-b`

Attribution comparison treats these references as a set. Direction remains separately governed by `expected_link_source` and `expected_link_target` in the primary-candidate match. No Product runtime or Slice A identity was changed.
