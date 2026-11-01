import re,json
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont
out=Path('src/assets/fonts');out.mkdir(exist_ok=True)
# Literal source icons plus every default Vuetify alias; dynamic choices resolve to these literals.
css=Path('node_modules/@mdi/font/css/materialdesignicons.css').read_text()
names=set(re.findall(r'mdi-[a-z0-9-]+', '\n'.join(p.read_text() for p in Path('src').rglob('*') if p.suffix in ('.vue','.js','.css'))))
names.update(re.findall(r'mdi-[a-z0-9-]+',Path('node_modules/vuetify/lib/iconsets/mdi.js').read_text()))
points={name:code for name,code in re.findall(r'\.(mdi-[\w-]+)::before\s*\{\s*content: "\\([A-Fa-f0-9]+)";',css) if name in names}
missing=names-points.keys();assert not missing,missing
font=TTFont('node_modules/@mdi/font/fonts/materialdesignicons-webfont.ttf');opts=subset.Options();opts.flavor='woff2';sub=subset.Subsetter(options=opts);sub.populate(unicodes=[int(v,16) for v in points.values()]);sub.subset(font);font.flavor='woff2';font.save(out/'mdi-subset.woff2')
base=css[:css.index('.mdi-ab-testing')];base=re.sub(r'@font-face\s*\{.*?\}', '',base,flags=re.S)
(out/'icons.css').write_text('@font-face{font-family:"Material Design Icons";src:url("./mdi-subset.woff2") format("woff2");font-weight:normal;font-style:normal;font-display:block}\n'+base+'\n'+'\n'.join('.'+name+'::before{content:"\\'+code+'"}' for name,code in sorted(points.items()))+'\n')
(out/'mdi-icons.json').write_text(json.dumps(sorted(points),indent=2)+'\n')
print(f'Generated {len(points)} MDI icons.')
