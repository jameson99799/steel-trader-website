content=open('src/views/About.vue','r',encoding='utf-8').read()

checks = [
    ('Factory-style image lightbox bottom-bar', 'lightbox-bottom-bar'),
    ('Zoom hover overlay on image', 'image-overlay-hover'),
    ('About-clickable-image class', 'about-clickable-image'),
    ('aspect-ratio iframe', 'aspect-ratio:16/9'),
    ('no-scroll add on lightbox open', "classList.add"),
    ('bottom-nav CSS', 'lightbox-bottom-nav'),
    ('Mobile top-50pct side arrows', 'top: 50%'),
]

for label, keyword in checks:
    found = keyword in content
    status = "OK" if found else "FAIL"
    print(status + " | " + label)
