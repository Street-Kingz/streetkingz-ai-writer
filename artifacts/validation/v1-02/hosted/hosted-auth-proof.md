# Hosted Auth proof

Two new synthetic hosted users signed in independently through managed Supabase Auth. Their access tokens were accepted by the Render Product API only after `getClaims()` identity verification. Each created its own Account. The final smoke also proved account deletion removed the selected managed Auth identity; all remaining synthetic users were cleaned up.

No password, JWT or refresh token is retained in this evidence.
