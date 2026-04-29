---
title: Lae loogikaviga alla ja tõlgi see eesti keelde
description: Automatiseeri loogikavigade allalaadimine, tõlkimine ja salvestamine eestikeelsesse wikisse koos YAML-metaandmete ja korrektse struktuuriga. Antud loogikavea pealkirja, lingi ja kokkuvõtte põhjal laadi originaalartikkel ning loo täpne eestikeelne tõlge.
---

**Juhised:**
1. Laadi etteantud allika (URL) kogu tekstiline sisu alla.
2. Tõlgi kogu allika sisu võimalikult täpselt ja täielikult eesti keelde, sh kõik kirjeldused, loogiline vorm, näited, selgitused, erandid, faktid, viited jms. Säilita struktuur ja jaotised.
3. Loo uus fail kausta `wiki/loogikavead/` kasutades loogikavea eestikeelset nime. Failinime loomisel teisenda nimi väikesteks tähtedeks, asenda tühikud sidekriipsudega ning eemalda erimärgid (nt `wiki/loogikavead/aksendi-viga.md`).
4. Lisa faili algusesse YAML frontmatter järgmiste väljadega:
   - `allikas`: Originaalartikli link
   - `loogikavea_nimi`: Eestikeelne nimi
   - `ingliskeelne_nimi`: Ingliskeelne nimi
   - `ladinakeelne_nimi`: Ladinakeelne nimi (kui on, muidu jäta välja)
   - `keel`: 'eesti'
5. Uuenda sisukord.md faili vastav sissekanne nii, et see oleks täielikult eestikeelne, viitaks uuele lokaalsele wikifailile ning ei sisaldaks ingliskeelset kokkuvõtet ega välist linki.
6. Veendu, et tõlge oleks arusaadav, loomulik ja sobiks eestikeelsesse hariduslikku wikisse.
7. Salvesta ja uuenda vajadusel ka peamine sisukord.

