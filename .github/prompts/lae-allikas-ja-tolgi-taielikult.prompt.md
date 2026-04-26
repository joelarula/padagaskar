---
title: Lae loogikavea allikas alla ja tõlgi täies mahus
description: Automatiseeri loogikavigade allika sisu allalaadimine, selle täpne ja täielik tõlkimine eesti keelde ning salvestamine wikisse koos korrektse YAML-metaandmete ja struktuuriga.
---

**Juhised:**
1. Laadi etteantud allika (URL) kogu tekstiline sisu alla.
2. Tõlgi kogu allika sisu võimalikult täpselt ja täielikult eesti keelde, sh kõik kirjeldused, loogiline vorm, näited, selgitused, erandid, faktid, viited jms. Säilita struktuur ja jaotised.
3. Loo uus fail kausta `wiki/loogikavead/` kasutades loogikavea eestikeelset nime. Failinime loomisel teisenda nimi väikesteks tähtedeks, asenda tühikud sidekriipsudega ning eemalda erimärgid (nt `wiki/loogikavead/aksendi-viga.md`).
4. Lisa faili algusesse YAML frontmatter järgmiste väljadega:
   - `allikad`: Kõik kasutatud allikad (URL-idena, YAML-massiivina)
   - `loogikavea_nimi`: Eestikeelne nimi
   - `ingliskeelne_nimi`: Ingliskeelne nimi
   - `ladinakeelne_nimi`: Ladinakeelne nimi (kui on, muidu jäta välja)
   - `keel`: 'eesti'
5. Uuenda sisukord.md faili vastav sissekanne nii, et see oleks täielikult eestikeelne, viitaks uuele lokaalsele wikifailile ning ei sisaldaks ingliskeelset kokkuvõtet ega välist linki.
6. Veendu, et tõlge oleks arusaadav, loomulik ja sobiks eestikeelsesse hariduslikku wikisse.
7. Salvesta ja uuenda vajadusel ka peamine sisukord.
