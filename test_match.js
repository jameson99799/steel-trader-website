function basicSlugify(text) {
  if (!text) return '';
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
}

const reqSlug = "galvanized-steel-coil-guide-what-is-gi-coil-and-how-to"

const candidates = [
  {
    id: 125,
    seo_title: "Galvanized Steel Coil Guide: What Is GI Coil and How to Choose It?",
    title_en: "Galvanized Steel Coil: What Is It, What Is It Used For, and How Do You Choose the Right GI Coil?",
    slug: "galvanized-steel-coil-what-is-it-what-is-it-used-for-and-how-do-you-choose-the-r"
  }
]

let found = null;
for (const c of candidates) {
  console.log("c.seo_title slugified:", basicSlugify(c.seo_title));
  if (c.seo_title && basicSlugify(c.seo_title).startsWith(reqSlug)) {
    found = c; break;
  }
}
console.log("Found:", found ? found.id : null)
