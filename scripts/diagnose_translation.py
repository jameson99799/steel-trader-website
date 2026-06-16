import sqlite3, sys

sys.stdout.reconfigure(encoding='utf-8')

conn = sqlite3.connect('data/database.db')
conn.row_factory = sqlite3.Row

print("=" * 60)
print("STEP 1: categories source data")
print("=" * 60)
cats = conn.execute("SELECT id, name, name_en FROM categories ORDER BY id").fetchall()
for c in cats:
    print(f"  id={c['id']}  name_en='{c['name_en']}'")

print()
print("=" * 60)
print("STEP 2: ALL category translations in DB")
print("=" * 60)
rows = conn.execute("""
    SELECT language_code, content_id, content_field, translated_text
    FROM translations
    WHERE content_type = 'category'
    ORDER BY language_code, content_id
""").fetchall()
if rows:
    for r in rows:
        print(f"  lang={r['language_code']}  id={r['content_id']}  field={r['content_field']}  val='{r['translated_text']}'")
else:
    print("  [!!!] NO CATEGORY TRANSLATIONS IN DATABASE AT ALL")

print()
print("=" * 60)
print("STEP 3: Language summary (all content types)")
print("=" * 60)
langs_with_trans = conn.execute("""
    SELECT language_code, COUNT(*) as count
    FROM translations GROUP BY language_code ORDER BY language_code
""").fetchall()
for l in langs_with_trans:
    print(f"  lang={l['language_code']}  total={l['count']}")

print()
print("=" * 60)
print("STEP 4: Thai vs Hindi category comparison")
print("=" * 60)
for lang in ['th','hi']:
    cnt = conn.execute("SELECT COUNT(*) as c FROM translations WHERE language_code=? AND content_type='category'", [lang]).fetchone()['c']
    print(f"  {lang} category translations: {cnt}")

print()
print("=" * 60)
print("STEP 5: How does getCategoryTree API join translations?")
print("=" * 60)
# Simulate the SQL used by the API
cat_api_rows = conn.execute("""
    SELECT c.id, c.name, c.name_en,
           t_hi.translated_text as hi_name,
           t_th.translated_text as th_name
    FROM categories c
    LEFT JOIN translations t_hi ON t_hi.content_type='category' AND t_hi.content_id=c.id AND t_hi.content_field='name' AND t_hi.language_code='hi'
    LEFT JOIN translations t_th ON t_th.content_type='category' AND t_th.content_id=c.id AND t_th.content_field='name' AND t_th.language_code='th'
    ORDER BY c.id
""").fetchall()
print(f"  {'ID':>3}  {'name_en':<35}  {'hi_name':<25}  {'th_name'}")
for r in cat_api_rows:
    print(f"  {r['id']:>3}  {str(r['name_en']):<35}  {str(r['hi_name']):<25}  {str(r['th_name'])}")

conn.close()
