"""
Horse & Breeder — Extractor de writeups de dams desde Word (.docx)
Prototipo v0.1 — Sammy

Lee un catálogo .docx (tablas de pedigrí + secciones 1st..5th Dam) y produce
datos estructurados por caballo, listos para cargar en la BBDD (competition_history).

Uso:  python parse_dams.py catalogo.docx > salida.json
"""
import sys, re, json
import docx
from docx.oxml.table import CT_Tbl
from docx.oxml.text.paragraph import CT_P
from docx.text.paragraph import Paragraph

def clean(s): return re.sub(r'\s+', ' ', s.replace('\t', ' ')).strip()

DAM_HDR = re.compile(r'^(1st|2nd|3rd|4th|5th|6th|7th)\s+Dam', re.I)

def parse_entry(text, bold):
    t = clean(text)
    if ':' not in t:
        return None
    name, rest = t.split(':', 1)
    name, rest = name.strip(), rest.strip()
    e = {'name': name, 'notable': bool(bold), 'discipline': None, 'height': None,
         'birth_year': None, 'rider': None, 'country': None, 'studbook': None,
         'dam_of': 'dam of:' in rest.lower(), 'see_above': 'SEE ABOVE' in rest,
         'results': []}
    m = re.match(r'(sj|dr|ev)\s+(\d\.\d{2}m)', rest)
    if m: e['discipline'], e['height'] = m.group(1), m.group(2)
    by = re.search(r'\((\d{4})\)', rest)
    if by: e['birth_year'] = by.group(1)
    co = re.search(r'\(([A-Z]{2,3})\)', rest)
    if co: e['country'] = co.group(1)
    rd = re.search(r"\(([A-Z][a-zà-ÿ]+(?:[ \-][A-Za-zà-ÿ']+){0,3})\)", rest)
    if rd: e['rider'] = rd.group(1)
    sb = re.search(r'Approved\s+([A-Z]{1,4})', rest)
    if sb: e['studbook'] = sb.group(1)
    for ym in re.finditer(
        r'(\d{4}):\s*pl\s+(\d+\w*)\s+(.+?)(?=,\s*\d{4}:\s*pl|,?\s*etc\.|,?\s*dam of:|,?\s*Approved|$)',
        rest):
        e['results'].append({'year': ym.group(1), 'placing': ym.group(2),
                             'detail': clean(ym.group(3))})
    return e

def parse_doc(path):
    d = docx.Document(path)
    seq = []
    for ch in d.element.body.iterchildren():
        if isinstance(ch, CT_P):  seq.append(('P', Paragraph(ch, d)))
        elif isinstance(ch, CT_Tbl): seq.append(('T', None))
    foals, cur, dam = [], None, None
    for k, p in seq:
        if k == 'T':
            if cur: foals.append(cur)
            cur, dam = {'dams': {}}, None
            continue
        if cur is None: continue
        t = clean(p.text)
        if not t: continue
        if DAM_HDR.match(t):
            dam = DAM_HDR.match(t).group(1)
            cur['dams'].setdefault(dam, [])
            continue
        if dam is None: continue
        bold = any(r.bold for r in p.runs if r.text.strip())
        e = parse_entry(p.text, bold)
        if e: cur['dams'][dam].append(e)
    if cur: foals.append(cur)
    return foals

if __name__ == '__main__':
    foals = parse_doc(sys.argv[1])
    print(json.dumps(foals, ensure_ascii=False, indent=1))
