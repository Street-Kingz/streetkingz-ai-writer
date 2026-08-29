# V1-03 foundation test report

- Focused V1-03 service/transport: 27 passed, 0 failed.
- Dedicated real local Supabase V1-03: 33 named behaviours passed (34 TAP tests including parent), 0 failed.
- V1-02 focused unit regression: 9 passed, 0 failed.
- V1-02 real local Supabase regression: 1 passed, 0 failed.
- Full `npm test`: 936 passed, 0 failed, 2 intentionally skipped integration entry points.
- Clean reset/reapply after final migration change: passed on Supabase CLI 2.115.0. The non-blocking missing-profile warning remained unchanged.
