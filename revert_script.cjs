const fs = require('fs');
let content = fs.readFileSync('src/components/RoofingProfileGenerator.vue', 'utf8');

content = content.replace(
  '<svg :viewBox="dynamicViewBox"',
  '<img v-if="profile.image_url" :src="profile.image_url" class="real-image" />\n    <svg v-else :viewBox="dynamicViewBox"'
);

content = content.replace(
  '</style>',
  `.real-image {
  width: 100%;
  height: auto;
  max-height: 400px;
  object-fit: cover;
  border-radius: 8px;
  z-index: 2;
}
</style>`
);

fs.writeFileSync('src/components/RoofingProfileGenerator.vue', content);
