---
title: Download and translate a logical fallacy into Estonian
description: Automate fetching, translating, and saving logical fallacies in Estonian wiki with YAML metadata and proper structure Given a fallacy title, link, and summary, fetch the original article and generate a faithful Estonian translation.
---
  

**Instructions:**
1. Create a new file in `wiki/loogikavead/` using the Estonian name of the fallacy. Name the markdown file with the Estonian name as well (e.g., `wiki/loogikavead/aksendi viga.md`).
2. At the top of the file, add YAML frontmatter with these fields:
   - `allikas`: Original article link
   - `loogikavea_nimi`: Estonian name
   - `ingliskeelne_nimi`: English name
   - `ladinakeelne_nimi`: Latin name (if available, else omit)
   - `keel`: 'eesti'
3. Translate the fallacy summary and explanation into Estonian. Be accurate and concise. Include examples if present, translating them as well.
4. In Loogikavead.md, replace or update the corresponding entry so that it is fully in Estonian, links to the new local wiki file, and does not include the English summary or external link.
5. Ensure the translation is clear, natural, and suitable for an Estonian-language educational wiki.
6. Save and update the main index if needed.