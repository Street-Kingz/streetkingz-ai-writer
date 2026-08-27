# Deployment rollback proof

- Known-good commit: `559657cc2100934409019d11b23f3acbcd7459df`
- Deliberately failing deployment: `dep-da7sv51srm7s73dfvqqg`
- Observed status: `update_failed`
- Failure mechanism: validation service startup command temporarily exited non-zero; no repository change or Product data mutation
- Provider behavior: previous healthy deployment continued serving while the bad release failed
- Recovery: restored `npm start` and redeployed the exact reviewed commit
- Final live deployment: `dep-da7svnl2e28c73dns29g`
- Final HTTPS health: PASS

The validation service was not left with broken configuration or code.
