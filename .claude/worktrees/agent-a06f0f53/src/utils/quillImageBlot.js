import Quill from 'quill'

const BlockEmbed = Quill.import('blots/block/embed')

class FigureBlot extends BlockEmbed {
    static create(value) {
        const node = super.create(value)

        // Create the image element
        const img = document.createElement('img')
        img.setAttribute('src', value.src)
        if (value.width) img.setAttribute('width', value.width)
        if (value.style) img.setAttribute('style', value.style)

        // Create the caption container unconditionally
        const figcaption = document.createElement('figcaption')
        // Set contenteditable so users can click and type their caption directly in the editor!
        figcaption.setAttribute('contenteditable', 'true')
        figcaption.setAttribute('placeholder', '添加图片标题 (点击输入)')
        figcaption.innerText = value.caption || ''

        node.appendChild(img)
        node.appendChild(figcaption)

        return node
    }

    static value(domNode) {
        const img = domNode.querySelector('img')
        const figcaption = domNode.querySelector('figcaption')
        return {
            src: img ? img.getAttribute('src') : '',
            width: img ? img.getAttribute('width') : '',
            style: img ? img.getAttribute('style') : '',
            caption: figcaption ? figcaption.innerText : ''
        }
    }
}

FigureBlot.blotName = 'figure'
FigureBlot.tagName = 'figure'
FigureBlot.className = 'ql-figure'

// We inject CSS to make the figure center and caption look nice
export function registerFigureBlot() {
    Quill.register(FigureBlot, true)

    if (!document.getElementById('ql-figure-style')) {
        const style = document.createElement('style')
        style.id = 'ql-figure-style'
        style.innerHTML = `
      .ql-figure {
        display: block;
        text-align: center;
        margin: 16px 0;
      }
      .ql-figure img {
        max-width: 100%;
        height: auto;
        display: block;
        margin: 0 auto;
      }
      .ql-figure figcaption {
        margin-top: 8px;
        font-size: 14px;
        color: #666;
        text-align: center;
        outline: none;
        min-height: 20px;
        border-bottom: 1px dashed transparent;
        transition: border-bottom 0.2s;
        display: inline-block;
        min-width: 100px;
      }
      .ql-figure figcaption:empty:before {
        content: attr(placeholder);
        color: #aaa;
      }
      .ql-figure figcaption:focus {
        border-bottom: 1px dashed #0077b5;
      }
    `
        document.head.appendChild(style)
    }
}
