import sys

with open('src/views/Factory.vue', 'r', encoding='utf-8') as f:
    content = f.read()

url_old = """const getYoutubeEmbedUrl = (url, autoplay, mute = false) => {
  if (!url) return '';
  let videoId = '';
  if (url.includes('youtube.com/watch?v=')) {
    videoId = url.split('v=')[1];
    const ampersandPosition = videoId.indexOf('&');
    if(ampersandPosition !== -1) videoId = videoId.substring(0, ampersandPosition);
  } else if (url.includes('youtube.com/shorts/')) {
    videoId = url.split('shorts/')[1];
    const questionPosition = videoId.indexOf('?');
    if(questionPosition !== -1) videoId = videoId.substring(0, questionPosition);
  } else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1];
    const questionPosition = videoId.indexOf('?');
    if(questionPosition !== -1) videoId = videoId.substring(0, questionPosition);
  } else if (url.includes('youtube.com/embed/')) {
    videoId = url.split('embed/')[1];
    const questionPosition = videoId.indexOf('?');
    if(questionPosition !== -1) videoId = videoId.substring(0, questionPosition);
  } else {
    return url;
  }
  return `https://www.youtube.com/embed/${videoId}?rel=0&enablejsapi=1&playsinline=1${autoplay ? `&autoplay=1${mute ? '&mute=1' : ''}` : ''}`;
}"""

url_new = """const getYoutubeEmbedUrl = (url, autoplay, mute = false) => {
  if (!url) return '';
  let videoId = '';
  if (url.includes('youtube.com/watch?v=')) {
    videoId = url.split('v=')[1];
    const ampersandPosition = videoId.indexOf('&');
    if(ampersandPosition !== -1) videoId = videoId.substring(0, ampersandPosition);
  } else if (url.includes('youtube.com/shorts/')) {
    videoId = url.split('shorts/')[1];
    const questionPosition = videoId.indexOf('?');
    if(questionPosition !== -1) videoId = videoId.substring(0, questionPosition);
  } else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1];
    const questionPosition = videoId.indexOf('?');
    if(questionPosition !== -1) videoId = videoId.substring(0, questionPosition);
  } else if (url.includes('youtube.com/embed/')) {
    videoId = url.split('embed/')[1];
    const questionPosition = videoId.indexOf('?');
    if(questionPosition !== -1) videoId = videoId.substring(0, questionPosition);
  } else {
    return url + (url.includes('?') ? '&' : '?') + (autoplay ? `autoplay=1${mute ? '&mute=1' : ''}&` : '') + 'enablejsapi=1&playsinline=1&vq=hd1080';
  }
  return `https://www.youtube.com/embed/${videoId}?vq=hd1080&enablejsapi=1&playsinline=1${autoplay ? `&autoplay=1${mute ? '&mute=1' : ''}` : ''}`;
}"""

content = content.replace(url_old, url_new)

iframe_allow_old = """<iframe v-else :src="getYoutubeEmbedUrl(videoLightboxUrl, true, false)" style="width:100%;height:80vh;max-width:1100px;border:none;border-radius:8px;box-shadow: 0 10px 30px rgba(0,0,0,0.5);" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>"""
iframe_allow_new = """<iframe v-else :src="getYoutubeEmbedUrl(videoLightboxUrl, true, false)" style="width:100%;height:80vh;max-width:1100px;border:none;border-radius:8px;box-shadow: 0 10px 30px rgba(0,0,0,0.5);" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>"""

content = content.replace(iframe_allow_old, iframe_allow_new)

with open('src/views/Factory.vue', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Factory.vue")
