# _legacy — read-only reference

This folder holds the old PHP site (`hb_php/`) and the original database dump
(`hbold_backup.sql`). It exists purely as reference material while migrating
data and behaviour into the Nuxt app.

**Rules:**
- Never imported or executed at runtime by the Nuxt app.
- Never modified in place — it's a historical snapshot.
- Binary contents (PHP site, images, SQL dump — ~88MB) are excluded from git
  history via `.gitignore`. Only this README is tracked.
