<template>
  <div class="products-page">
    <div class="page-header">
      <h1>商品管理</h1>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-sm btn-outline" style="color:#059669;border-color:#059669;" @click="syncImages" :disabled="syncingImages">
          {{ syncingImages ? '⏳ 同步中...' : '🔄 同步图片到所有语言' }}
        </button>
        <button class="btn btn-primary" style="background:#7c3aed;border-color:#7c3aed;" @click="showAICreate = true">🤖 AI 创建商品</button>
        <button class="btn btn-primary" @click="openModal()">添加商品</button>
      </div>
    </div>

    <!-- Search / Filter / Pagination toolbar -->
    <div class="filter-bar">
      <input v-model="searchQuery" class="form-control filter-search" placeholder="🔍 搜索商品名称..." @input="onFilterChange" />
      <select v-model="filterCategoryId" class="form-control filter-select" @change="onFilterChange">
        <option value="">全部分组</option>
        <option v-for="cat in flatCategories" :key="cat.id" :value="cat.id">{{ cat.prefix }}{{ cat.name }}</option>
      </select>
      <div class="filter-count">共 {{ totalProducts }} 件商品</div>
    </div>

    <div class="card">
      <div class="card-body">
        <table class="table" v-if="filteredProducts.length">
          <thead>
            <tr>
              <th style="width:56px">图片</th>
              <th style="min-width:200px">名称</th>
              <th style="width:90px;white-space:nowrap">分组</th>
              <th style="width:44px;text-align:center;white-space:nowrap">推荐</th>
              <th style="width:44px;text-align:center;white-space:nowrap">状态</th>
              <th style="width:260px;white-space:nowrap">操作</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="product in pagedProducts" :key="product.id">
              <tr>
              <td>
                <img :src="product.images?.split(',')[0] || '/placeholder.svg'" class="product-thumb" />
              </td>
              <td><span class="product-name-en">{{ product.name_en || product.name }}</span></td>
              <td style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ product.category_name || '-' }}</td>
              <td style="text-align:center">
                <span :class="['badge', product.is_featured ? 'badge-success' : 'badge-secondary']">
                  {{ product.is_featured ? '是' : '否' }}
                </span>
              </td>
              <td style="text-align:center">
                <span :class="['badge', product.status ? 'badge-success' : 'badge-warning']">
                  {{ product.status ? '上架' : '下架' }}
                </span>
              </td>
              <td>
                <div class="action-grid">
                  <button class="btn btn-sm btn-secondary" @click="openModal(product)">✏️ 编辑</button>
                  <button class="btn btn-sm btn-outline" @click="previewProduct(product)" style="color:#2563eb;border-color:#2563eb;">👁 预览</button>
                  <button class="btn btn-sm btn-outline" @click="duplicateProduct(product)" style="color:#0077b5;border-color:#0077b5;">📋 复制</button>
                  
                  <div class="translation-dropdown" style="position:relative;display:block" @click.stop>
                    <button class="btn btn-sm btn-outline" @click="toggleTranslateMenu(product, $event)" style="color:#059669;border-color:#059669;width:100%;" :disabled="translatingId === product.id">
                      {{ translatingId === product.id ? '翻译中...' : '🌐 翻译 ▼' }}
                    </button>
                    <Teleport to="body">
                      <div v-if="activeTranslateMenu === product.id" class="dropdown-menu shadow" :style="{position:'fixed', top: translateMenuPos.top, bottom: translateMenuPos.bottom, right: translateMenuPos.right, background:'white', border:'1px solid #ddd', borderRadius:'6px', zIndex:10000, minWidth:'180px', padding:'8px 0', marginTop:'4px', marginBottom:'4px', boxShadow:'0 4px 12px rgba(0,0,0,0.15)', maxHeight:'280px', overflowY:'auto'}" @click.stop>
                        <div v-if="product._loadingStatus" style="padding:8px 12px;font-size:13px;color:#666;text-align:center;">正在检测状态...</div>
                        <div v-else class="lang-list">
                          <div style="padding:0 8px 8px;border-bottom:1px solid #f1f5f9;"><button class="btn btn-primary btn-sm" @click="translateProduct(product)" style="width:100%">一键翻译所有语言</button></div>
                          <div v-for="l in product._translationStatus" :key="l.code" 
                               @click="translateProduct(product, l.code, l.name)" 
                               :style="{ color: l.translated ? '#16a34a' : '#2563eb', cursor: 'pointer', padding: '8px 12px', borderBottom: '1px solid #f8fafc', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center' }">
                            <span style="display:inline-block;width:6px;height:6px;border-radius:50%;margin-right:8px;" :style="{ background: l.translated ? '#16a34a' : '#2563eb' }"></span>
                            {{ l.name }} <span style="margin-left:auto;font-size:11px;opacity:0.8;">{{ l.translated ? '已翻译' : '未翻译' }}</span>
                          </div>
                        </div>
                      </div>
                    </Teleport>
                  </div>

                  <button class="btn btn-sm btn-outline" @click="$router.push(`/admin/products/ai/${product.id}`)" style="color:#7c3aed;border-color:#7c3aed;">🤖 AI</button>
                  <button class="btn btn-sm btn-danger" @click="handleDelete(product)">🗑 删除</button>
                </div>
              </td>
            </tr>
            <tr v-if="translatingItemLog && translatingItemLog.id === product.id" class="log-row">
              <td colspan="6" style="padding: 0; border: none;">
                <div style="background: #1e293b; color: #a5b4fc; padding: 12px 16px; margin: 0 16px 16px; border-radius: 6px; font-family: 'Fira Mono', monospace; font-size: 13px; max-height: 250px; overflow-y: auto;">
                  <div style="color: white; margin-bottom: 8px; font-weight: 600; display:flex; justify-content:space-between;">
                    <span>📡 翻译日志 - {{ translatingItemLog.langName }}</span>
                    <button @click="translatingItemLog = null" style="background:none;border:none;color:#94a3b8;cursor:pointer;">✕ 关闭</button>
                  </div>
                  <pre style="margin:0;white-space:pre-wrap;line-height:1.5;">{{ translatingItemLog.log }}</pre>
                </div>
              </td>
            </tr>
          </template>
          </tbody>
        </table>
        <p v-else class="text-center" style="color: var(--secondary);">暂无商品</p>

        <!-- Pagination -->
        <div class="pagination" v-if="totalPages > 1">
          <button class="btn btn-sm btn-outline" :disabled="currentPage <= 1" @click="currentPage--">‹ 上一页</button>
          <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
          <button class="btn btn-sm btn-outline" :disabled="currentPage >= totalPages" @click="currentPage++">下一页 ›</button>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal" style="max-width: 800px;">
        <div class="modal-header">
          <h3>{{ editingProduct ? '编辑商品' : '添加商品' }}</h3>
          <button class="modal-close" @click="showModal = false">&times;</button>
        </div>
        <form @submit.prevent="handleSubmit">
          <div class="modal-body">
            <div class="grid grid-2">
              <div class="form-group">
                <label>商品名称（中文）*</label>
                <input v-model="form.name" type="text" class="form-control" required />
              </div>
              <div class="form-group">
                <label>商品名称（英文）</label>
                <input v-model="form.name_en" type="text" class="form-control" />
              </div>
            </div>
            <div class="form-group">
              <label>所属分类</label>
              <select v-model="form.category_id" class="form-control">
                <option :value="null">请选择</option>
                <option v-for="cat in flatCategories" :key="cat.id" :value="cat.id">
                  {{ cat.prefix }}{{ cat.name }}
                </option>
              </select>
            </div>
            <div class="grid grid-2">
              <div class="form-group">
                <label>商品描述（中文）</label>
                <textarea v-model="form.description" class="form-control"></textarea>
              </div>
              <div class="form-group">
                <label>商品描述（英文）</label>
                <textarea v-model="form.description_en" class="form-control"></textarea>
              </div>
            </div>
            <div class="form-group">
              <label>规格参数</label>
              <div v-for="(spec, index) in specs" :key="index" class="spec-row">
                <input v-model="spec.name" placeholder="参数名" class="form-control" />
                <input v-model="spec.value" placeholder="参数值" class="form-control" />
                <button type="button" class="btn btn-sm btn-danger" @click="specs.splice(index, 1)">删除</button>
              </div>
              <button type="button" class="btn btn-sm btn-secondary" @click="specs.push({ name: '', value: '' })">添加规格</button>
            </div>
            <div class="form-group">
              <label>商品图片</label>
              <p class="form-hint">建议尺寸：800×800px，JPG/PNG格式，支持多图上传（最多10张）</p>
              <div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
                <input type="file" multiple @change="handleFileChange" accept="image/*" />
                <button type="button" class="btn btn-sm btn-outline" @click="showImportPicker=true" style="color:#0284c7;border-color:#0284c7;">📥 导入其他产品图片</button>
                <button type="button" class="btn btn-sm btn-outline" @click="showMediaPicker=true" style="color:#7c3aed;border-color:#7c3aed;">📷 从图库选择</button>
              </div>
              <div class="image-preview" v-if="existingImages.length">
                <p class="form-hint">拖动图片可排序；第一张为主图（⭐点击设为主图）</p>
                <div
                  v-for="(img, index) in existingImages"
                  :key="img"
                  class="preview-item"
                  draggable="true"
                  @dragstart="dragStart(index)"
                  @dragover.prevent
                  @drop="dragDrop(index)"
                  :class="{ 'is-main': index === 0 }"
                >
                  <img :src="img" />
                  <span v-if="index === 0" class="main-badge">主图</span>
                  <button type="button" class="btn-main" @click="setMain(index)" :title="'设为主图'">⭐</button>
                  <button type="button" class="btn-del" @click="existingImages.splice(index, 1)">×</button>
                </div>
              </div>
            </div>
            <div class="form-group">
              <label>产品详情</label>
              <p class="form-hint">支持粘贴 HTML 代码、可视化编辑、点击图片替换、上传图片</p>

              <!-- Template Variables Hint Panel -->
              <div class="vars-panel">
                <div class="vars-panel-header" @click="showVarsPanel = !showVarsPanel">
                  <span>🔗 模板变量（联系方式）</span>
                  <span class="vars-toggle">{{ showVarsPanel ? '收起 ▲' : '展开 ▼' }}</span>
                </div>
                <div v-if="showVarsPanel" class="vars-panel-body">
                  <p class="vars-desc">在 HTML 中使用以下变量，网站自动替换为后台设置的真实联系方式，修改后台后所有产品自动同步。</p>
                  <div class="vars-grid">
                    <div v-for="v in templateVars" :key="v.var" class="var-item" @click="copyVar(v.var)" :title="'点击复制: ' + v.var">
                      <code class="var-code">{{ v.var }}</code>
                      <span class="var-desc">{{ v.desc }}</span>
                      <span class="var-value" v-if="v.preview">→ {{ v.preview }}</span>
                    </div>
                  </div>
                  <p class="vars-example">例：<code>&lt;a href="mailto:{{email}}"&gt;发送邮件&lt;/a&gt;</code> &nbsp; <code>&lt;a href="{{whatsapp_link}}"&gt;WhatsApp联系&lt;/a&gt;</code></p>
                </div>
              </div>

              <!-- HTML Code Hints Panel -->
              <div class="vars-panel" style="border-color:#d1fae5;">
                <div class="vars-panel-header" style="background:#f0fdf4;color:#065f46;" @click="showHtmlHints = !showHtmlHints">
                  <span>📋 HTML代码提示（单图 / 轮播图）</span>
                  <span class="vars-toggle">{{ showHtmlHints ? '收起 ▲' : '展开 ▼' }}</span>
                </div>
                <div v-if="showHtmlHints" class="vars-panel-body">
                  <div class="html-hints-grid">
                    <div class="hint-block">
                      <p class="hint-title">🖼️ 单张图片</p>
                      <pre class="hint-code" @click="copyHint(singleImgCode)">{{ singleImgCode }}</pre>
                      <p class="hint-note">将 src 换成图片URL，也可点击「插入图片」按钮自动插入</p>
                    </div>
                    <div class="hint-block">
                      <p class="hint-title">🎠 轮播图（多图）</p>
                      <pre class="hint-code" @click="copyHint(carouselCode)">{{ carouselCode }}</pre>
                      <p class="hint-note">复制后替换 src 为真实图片URL，或点击「插入轮播图」按钮自动生成</p>
                    </div>
                  </div>
                </div>
              </div>

              <div class="editor-mode-bar">
                <div class="mode-tabs">
                  <span :class="['mode-tab', editorMode === 'visual' ? 'active' : '']" @click="switchMode('visual')">✏️ 可视化编辑</span>
                  <span :class="['mode-tab', editorMode === 'html' ? 'active' : '']" @click="switchMode('html')">📝 HTML代码</span>
                  <span :class="['mode-tab', editorMode === 'preview' ? 'active' : '']" @click="switchMode('preview')">👁 预览</span>
                </div>
                <div class="editor-actions">
                  <button type="button" class="editor-btn" @click="insertImage" title="插入单张图片">📷 插入图片</button>
                  <button type="button" class="editor-btn carousel-btn" @click="insertCarousel" title="上传多张图片生成轮播图">🎠 插入轮播图</button>
                  <button type="button" class="editor-btn" @click="showCopyDetailImgPicker = true" title="从另一个产品复制详情图片到相同位置" style="color:#059669;border-color:#059669;">📋 复制同模板图片</button>
                  <button type="button" class="fullscreen-btn" @click="prodFullscreen = !prodFullscreen">
                    {{ prodFullscreen ? '✕ 退出全屏' : '⛶ 全屏' }}
                  </button>
                </div>
              </div>

              <div :class="['editor-wrap', prodFullscreen ? 'is-fullscreen' : '']">
                <!-- HTML source code mode -->
                <textarea
                  v-if="editorMode === 'html'"
                  v-model="form.detail_content"
                  class="html-editor"
                  placeholder='<div>&#10;  <h2>产品特点</h2>&#10;  <p>在此处粘贴 HTML 内容...</p>&#10;</div>'
                  spellcheck="false"
                ></textarea>

                <!-- Visual editing mode (contenteditable) -->
                <div
                  v-else-if="editorMode === 'visual'"
                  ref="visualEditorEl"
                  class="visual-editor"
                  contenteditable="true"
                  @input="onVisualInput"
                  @click="onVisualClick"
                  @paste="onVisualPaste"
                ></div>

                <!-- Preview mode (read-only) -->
                <div v-else class="html-preview" v-html="form.detail_content"></div>
              </div>

              <!-- Hidden file input for image upload (supports multi-select) -->
              <input type="file" ref="imgUploadInput" accept="image/*" multiple style="display:none" @change="handleImgUpload" />
              <!-- Hidden file input for carousel (multi-select) -->
              <input type="file" ref="carouselUploadInput" accept="image/*" multiple style="display:none" @change="handleCarouselUpload" />
            </div>
            <div class="grid grid-3">
              <div class="form-group">
                <label>首页推荐</label>
                <select v-model="form.is_featured" class="form-control">
                  <option :value="0">否</option>
                  <option :value="1">是</option>
                </select>
              </div>
              <div class="form-group">
                <label>状态</label>
                <select v-model="form.status" class="form-control">
                  <option :value="1">上架</option>
                  <option :value="0">下架</option>
                </select>
              </div>
              <div class="form-group">
                <label>排序</label>
                <input v-model="form.sort_order" type="number" class="form-control" />
              </div>
            </div>

            <!-- SEO Settings Section -->
            <div class="seo-section">
              <h4 class="seo-section-title">🔍 SEO设置（可选）</h4>
              <div class="form-group">
                <label>SEO标题 <span class="hint">留空则使用商品名称</span></label>
                <input v-model="form.seo_title" type="text" class="form-control" placeholder="例：LED Strip Lights - High Quality LED Manufacturer" />
              </div>
              <div class="form-group">
                <label>SEO描述 <span class="hint">建议150字符以内</span></label>
                <textarea v-model="form.seo_description" class="form-control" rows="2" placeholder="对这个商品的简短描述，显示在Google搜索结果中"></textarea>
                <small>{{ (form.seo_description||'').length }}/160</small>
              </div>
              <div class="form-group">
                <label>SEO关键词</label>
                <input v-model="form.seo_keywords" type="text" class="form-control" placeholder="关键词1, 关键词2, 关键词3" />
              </div>
            </div>

            <!-- GEO FAQ Section -->
            <div class="seo-section" style="border-color: #c7d2fe;">
              <h4 class="seo-section-title" style="color: #4338ca;">🤖 GEO优化 — FAQ结构化数据（可选）</h4>
              <p style="font-size:12px;color:#6b7280;margin:-8px 0 12px;">Generative Engine Optimization：添加常见问答，AI搜索引擎（Google AI、Bing Copilot、Perplexity等）会优先引用包含 FAQ 结构化数据的内容。</p>
              <div v-for="(faq, index) in faqItems" :key="index" class="faq-row">
                <div class="faq-fields">
                  <input v-model="faq.question" class="form-control" placeholder="问题（英文），如：What is the MOQ for this product?" />
                  <textarea v-model="faq.answer" class="form-control" rows="2" placeholder="回答（英文），如：Our minimum order quantity is 1 ton..."></textarea>
                </div>
                <button type="button" class="btn btn-sm btn-danger" @click="faqItems.splice(index, 1)">删除</button>
              </div>
              <button type="button" class="btn btn-sm btn-secondary" @click="faqItems.push({ question: '', answer: '' })">➕ 添加FAQ</button>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showModal = false">取消</button>
            <button type="submit" class="btn btn-primary" :disabled="loading">保存</button>
          </div>
        </form>
      </div>
    </div>
    <!-- AI Create Modal -->
    <div v-if="showAICreate" class="modal-overlay" @click.self="showAICreate = false">
      <div class="modal" style="max-width:520px;">
        <div class="modal-header" style="background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;">
          <h3>🤖 AI 创建商品</h3>
          <button class="modal-close" @click="showAICreate = false" style="color:#fff;">&times;</button>
        </div>
        <div class="modal-body">
          <p style="color:#64748b;font-size:13px;margin:0 0 16px;">输入产品名称（任何语言），AI 自动生成名称、描述、规格、SEO、FAQ 等所有内容</p>
          <div class="form-group">
            <label>产品名称 *</label>
            <input v-model="aiProductName" type="text" class="form-control" placeholder="例：镀锌钢卷、Galvanized Steel Coil、彩涂钢卷" />
          </div>
          <div class="form-group">
            <label>所属分类（可选）</label>
            <select v-model="aiCategoryId" class="form-control">
              <option :value="null">自动匹配</option>
              <option v-for="cat in flatCategories" :key="cat.id" :value="cat.id">
                {{ cat.prefix }}{{ cat.name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>📄 参考产品（详情模板）</label>
            <select v-model="aiRefProductId" class="form-control" @change="onRefProductChange">
              <option :value="-1">使用默认模板</option>
              <option :value="0">不生成产品详情</option>
              <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name_en || p.name }}</option>
            </select>
            <p style="font-size:12px;color:#94a3b8;margin:4px 0 0;">AI 会按参考产品的详情格式，替换为新产品的内容</p>
          </div>
          <div class="grid grid-2">
            <div class="form-group">
              <label>AI 渠道</label>
              <select v-model="aiChannelId" class="form-control" @change="onAIChannelChange">
                <option v-for="ch in aiChannels" :key="ch.id" :value="ch.id">{{ ch.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>模型</label>
              <select v-model="aiModel" class="form-control">
                <option v-for="m in aiCurrentModels" :key="m" :value="m">{{ m }}</option>
              </select>
            </div>
          </div>
          <div v-if="aiGenerating" style="text-align:center;padding:20px 0;">
            <div style="font-size:32px;animation:spin 1s linear infinite;display:inline-block;">⚙️</div>
            <p style="color:#7c3aed;font-weight:600;margin:10px 0 0;">{{ aiStep }}</p>
            <p style="color:#94a3b8;font-size:13px;">{{ aiRefProductId !== 0 ? '分两步生成，可能需要 30-90 秒' : '通常需要 10-30 秒' }}</p>
          </div>
          <div v-if="aiError" style="background:#fef2f2;color:#dc2626;padding:10px;border-radius:6px;font-size:13px;margin-top:8px;">{{ aiError }}</div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="showAICreate = false">取消</button>
          <button type="button" class="btn btn-primary" style="background:#7c3aed;border-color:#7c3aed;" @click="generateWithAI" :disabled="aiGenerating || !aiProductName.trim()">{{ aiGenerating ? '生成中...' : '🚀 开始生成' }}</button>
        </div>
      </div>
    </div>

    <!-- Import from other product Modal -->
    <div v-if="showImportPicker" class="modal-overlay" @click.self="showImportPicker=false">
      <div class="modal" style="max-width:650px;">
        <div class="modal-header" style="background:#f0f9ff;color:#0284c7;">
          <h3>📥 导入其他产品图片</h3>
          <button class="modal-close" @click="showImportPicker=false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>选择分组</label>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
              <button v-for="g in importGroupOptions" :key="g.id" :class="['btn','btn-sm', importGroupFilter===String(g.id)?'btn-primary':'btn-outline']" @click="importGroupFilter=String(g.id)">{{ g.name }}</button>
              <button :class="['btn','btn-sm', importGroupFilter==='all'?'btn-primary':'btn-outline']" @click="importGroupFilter='all'">📋 全部分组</button>
            </div>
          </div>
          <div class="form-group">
            <label>选择产品</label>
            <select v-model="importProductId" class="form-control" @change="loadImportImages">
              <option value="">请选择...</option>
              <option v-for="p in importProductList" :key="p.id" :value="p.id">{{ p.name_en || p.name }}</option>
            </select>
          </div>
          <div v-if="importImages.length">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span style="font-size:13px;color:#64748b;">共 {{ importImages.length }} 张图片</span>
              <button class="btn btn-sm btn-outline" @click="toggleImportSelectAll">{{ importSelected.length === importImages.length ? '取消全选' : '☑ 全选' }}</button>
            </div>
            <div class="import-grid">
              <div v-for="(img, i) in importImages" :key="i" :class="['import-item', { selected: importSelected.includes(img) }]" @click="toggleImportSelect(img)">
                <img :src="img" />
                <div class="import-check">✓</div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="showImportPicker=false">取消</button>
          <button type="button" class="btn btn-primary" style="background:#0284c7;" @click="doImportFromProduct" :disabled="!importSelected.length">导入 {{ importSelected.length }} 张</button>
        </div>
      </div>
    </div>

    <!-- Media Library Picker (for product thumbnails) -->
    <div v-if="showMediaPicker" class="modal-overlay" @click.self="showMediaPicker=false">
      <div class="modal" style="max-width:700px;">
        <div class="modal-header" style="background:#f5f3ff;color:#7c3aed;">
          <h3>📷 从图库选择</h3>
          <button class="modal-close" @click="showMediaPicker=false">&times;</button>
        </div>
        <div class="modal-body">
          <div style="display:flex;gap:8px;margin-bottom:12px;">
            <input v-model="mediaPickerSearch" class="form-control" placeholder="搜索文件名..." @input="loadMediaPicker" style="max-width:200px;" />
            <select v-model="mediaPickerGroup" class="form-control" @change="loadMediaPicker" style="max-width:140px;">
              <option value="">全部分组</option>
              <option v-for="g in mediaGroups" :key="g.id" :value="g.id">{{ g.name }}</option>
            </select>
          </div>
          <div v-if="mediaPickerItems.length" class="import-grid">
            <div v-for="item in mediaPickerItems" :key="item.id" :class="['import-item', { selected: mediaPickerSelected.includes(item.filepath) }]" @click="toggleMediaPickerSelect(item.filepath)">
              <img :src="item.filepath" />
              <div class="import-check">✓</div>
            </div>
          </div>
          <p v-else style="color:#94a3b8;text-align:center;padding:20px;">暂无图片</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="showMediaPicker=false">取消</button>
          <button type="button" class="btn btn-primary" style="background:#7c3aed;" @click="doImportFromMedia" :disabled="!mediaPickerSelected.length">选择 {{ mediaPickerSelected.length }} 张</button>
        </div>
      </div>
    </div>

    <!-- Image Source Chooser (for detail content visual editor) -->
    <div v-if="showImgChooser" class="modal-overlay" @click.self="showImgChooser=false" style="z-index:2100">
      <div class="modal" style="max-width:360px;">
        <div class="modal-header" style="background:#f0fdf4;color:#16a34a;">
          <h3>🖼️ 选择图片来源</h3>
          <button class="modal-close" @click="showImgChooser=false">&times;</button>
        </div>
        <div class="modal-body" style="padding:24px;">
          <div class="img-chooser-grid">
            <button class="img-chooser-btn" @click="pickFromComputer">
              <span style="font-size:32px;">💻</span>
              <span style="font-size:14px;font-weight:600;">从电脑上传</span>
              <span style="font-size:12px;color:#94a3b8;">选择本地文件上传</span>
            </button>
            <button class="img-chooser-btn" @click="pickFromMediaLib">
              <span style="font-size:32px;">📂</span>
              <span style="font-size:14px;font-weight:600;">从图库选择</span>
              <span style="font-size:12px;color:#94a3b8;">使用后台图库图片</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Detail Content Media Library Browser -->
    <div v-if="showDetailMediaBrowser" class="modal-overlay" @click.self="showDetailMediaBrowser=false" style="z-index:2200">
      <div class="modal" style="max-width:750px;">
        <div class="modal-header" style="background:#f0fdf4;color:#16a34a;">
          <h3>📂 从图库选择图片</h3>
          <button class="modal-close" @click="showDetailMediaBrowser=false">&times;</button>
        </div>
        <div class="modal-body">
          <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
            <input v-model="detailMediaSearch" class="form-control" placeholder="搜索文件名..." @input="loadDetailMedia" style="max-width:200px;" />
            <select v-model="detailMediaGroup" class="form-control" @change="loadDetailMedia" style="max-width:140px;">
              <option value="">全部分组</option>
              <option v-for="g in detailMediaGroups" :key="g.id" :value="g.id">{{ g.name }}</option>
            </select>
          </div>
          <div v-if="detailMediaItems.length" class="import-grid" style="max-height:450px;">
            <div v-for="item in detailMediaItems" :key="item.id" class="import-item" style="cursor:pointer;" @click="selectDetailMediaImage(item)">
              <img :src="item.filepath" />
            </div>
          </div>
          <p v-else style="color:#94a3b8;text-align:center;padding:20px;">暂无图片</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="showDetailMediaBrowser=false">取消</button>
        </div>
      </div>
    </div>

    <!-- Copy Detail Images from Another Product -->
    <div v-if="showCopyDetailImgPicker" class="modal-overlay" @click.self="showCopyDetailImgPicker=false" style="z-index:2300">
      <div class="modal" style="max-width:650px;">
        <div class="modal-header" style="background:#f0fdf4;color:#059669;">
          <h3>📋 复制同模板产品图片</h3>
          <button class="modal-close" @click="showCopyDetailImgPicker=false">&times;</button>
        </div>
        <div class="modal-body">
          <p style="color:#64748b;font-size:13px;margin:0 0 12px;">选择一个已上传详情图片的产品，将其详情HTML中的图片按位置复制到当前产品。文字内容不受影响，仅替换图片。</p>
          <div class="form-group">
            <label>选择分组</label>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
              <button v-for="g in importGroupOptions" :key="g.id" :class="['btn','btn-sm', copyImgGroupFilter===String(g.id)?'btn-primary':'btn-outline']" @click="copyImgGroupFilter=String(g.id);copyImgSourceId='';copyImgPreview=[]">{{ g.name }}</button>
              <button :class="['btn','btn-sm', copyImgGroupFilter==='all'?'btn-primary':'btn-outline']" @click="copyImgGroupFilter='all';copyImgSourceId='';copyImgPreview=[]">📋 全部分组</button>
            </div>
          </div>
          <div class="form-group">
            <label>选择源产品</label>
            <select v-model="copyImgSourceId" class="form-control" @change="previewCopyImgs">
              <option value="">请选择...</option>
              <option v-for="p in copyImgProductList" :key="p.id" :value="p.id">{{ p.name_en || p.name }}</option>
            </select>
          </div>
          <div v-if="copyImgPreview.length" style="margin-top:8px;">
            <p style="font-size:13px;color:#334155;font-weight:600;">将复制 {{ copyImgPreview.length }} 张图片：</p>
            <div style="display:flex;gap:6px;flex-wrap:wrap;max-height:200px;overflow-y:auto;">
              <img v-for="(src, i) in copyImgPreview" :key="i" :src="src" style="width:80px;height:60px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0;" />
            </div>
          </div>
          <p v-if="copyImgSourceId && !copyImgPreview.length" style="color:#94a3b8;text-align:center;padding:16px;">该产品详情中没有图片</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="showCopyDetailImgPicker=false">取消</button>
          <button type="button" class="btn btn-primary" style="background:#059669;border-color:#059669;" @click="doCopyDetailImgs" :disabled="!copyImgPreview.length">复制图片</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue'
import { useLang } from '../../composables/useLang'
import api from '../../api'
import { DEFAULT_DETAIL_TEMPLATE } from '../../utils/defaultDetailTemplate'

const products = ref([])
const categories = ref([])
const showModal = ref(false)
const editingProduct = ref(null)
const loading = ref(false)
const syncingImages = ref(false)
const imageFiles = ref([])
const existingImages = ref([])
const specs = ref([])
const prodFullscreen = ref(false)
const editorMode = ref('visual')  // 'visual' | 'html' | 'preview'
const visualEditorEl = ref(null)
const imgUploadInput = ref(null)
const carouselUploadInput = ref(null)

// Image source chooser state (for detail content visual editor)
const showImgChooser = ref(false)
const showDetailMediaBrowser = ref(false)
const detailMediaSearch = ref('')
const detailMediaGroup = ref('')
const detailMediaItems = ref([])
const detailMediaGroups = ref([])
const faqItems = ref([])
let replacingImg = null  // track image being replaced
const translatingId = ref(null)

// Search / Filter / Pagination
const searchQuery = ref('')
const filterCategoryId = ref('')
const currentPage = ref(1)
const perPage = 20

const filteredProducts = computed(() => {
  let list = products.value
  if (filterCategoryId.value) list = list.filter(p => String(p.category_id) === String(filterCategoryId.value))
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(p => (p.name_en || '').toLowerCase().includes(q) || (p.name || '').toLowerCase().includes(q))
  }
  // Sort by category sort_order then product sort_order (matching website display)
  const catOrder = {}
  flatCategories.value.forEach((c, i) => { catOrder[c.id] = i })
  list = [...list].sort((a, b) => {
    const ca = catOrder[a.category_id] ?? 999
    const cb = catOrder[b.category_id] ?? 999
    if (ca !== cb) return ca - cb
    return (b.sort_order || 0) - (a.sort_order || 0)
  })
  return list
})

const totalProducts = computed(() => filteredProducts.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalProducts.value / perPage)))
const pagedProducts = computed(() => {
  const start = (currentPage.value - 1) * perPage
  return filteredProducts.value.slice(start, start + perPage)
})

function onFilterChange() { currentPage.value = 1 }
function previewProduct(product) {
  const slug = product.slug || product.id
  const previewLang = localStorage.getItem('lang') || 'en'
  window.open(`/${previewLang}/products/${slug}`, '_blank')
}

async function syncImages() {
  if (syncingImages.value) return
  syncingImages.value = true
  try {
    const res = await fetch((import.meta.env.VITE_API_BASE || '') + '/api/translation/sync-images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') }
    })
    const data = await res.json()
    if (res.ok) {
      alert(`✅ 同步完成！\n产品详情：${data.productsSynced} 个已更新\n新闻文章：${data.newsSynced} 个已更新`)
    } else {
      alert('❌ 同步失败: ' + (data.error || '未知错误'))
    }
  } catch (e) {
    alert('❌ 同步失败: ' + e.message)
  } finally {
    syncingImages.value = false
  }
}

// ─── Import from other product ────────────────────────────────────────────
const showImportPicker = ref(false)
const importProductId = ref('')
const importImages = ref([])
const importSelected = ref([])
const importGroupFilter = ref('')

// Group options based on current product's category
const importGroupOptions = computed(() => {
  return flatCategories.value.filter(c => !c.prefix) // top-level only
})

// Filter product list by selected group
const importProductList = computed(() => {
  if (importGroupFilter.value === 'all') return products.value
  const gid = importGroupFilter.value
  if (!gid) return products.value
  // Include products in this category and its children
  const ids = [parseInt(gid)]
  flatCategories.value.forEach(c => { if (c.prefix && ids.includes(c.parent_id)) ids.push(c.id) })
  return products.value.filter(p => ids.includes(p.category_id))
})

// Initialize import group filter to current product's category
watch(showImportPicker, (v) => {
  if (v && editingProduct.value?.category_id) {
    // Find top-level parent of current product's category
    const cat = flatCategories.value.find(c => c.id === editingProduct.value.category_id)
    if (cat) {
      // If it has a prefix (sub-category), find its parent
      const parent = cat.prefix ? flatCategories.value.find(c => c.id === cat.parent_id) : cat
      importGroupFilter.value = String((parent || cat).id)
    } else {
      importGroupFilter.value = 'all'
    }
    importProductId.value = ''
    importImages.value = []
    importSelected.value = []
  }
})

async function loadImportImages() {
  importImages.value = []; importSelected.value = []
  if (!importProductId.value) return
  try {
    const p = await api.getProduct(importProductId.value)
    importImages.value = p.images ? p.images.split(',').filter(Boolean) : []
  } catch (e) { console.error(e) }
}

function toggleImportSelect(img) {
  const i = importSelected.value.indexOf(img)
  if (i >= 0) importSelected.value.splice(i, 1)
  else importSelected.value.push(img)
}

function toggleImportSelectAll() {
  if (importSelected.value.length === importImages.value.length) {
    importSelected.value = []
  } else {
    importSelected.value = [...importImages.value]
  }
}

function doImportFromProduct() {
  for (const img of importSelected.value) {
    if (!existingImages.value.includes(img)) existingImages.value.push(img)
  }
  showImportPicker.value = false
  importSelected.value = []
}

// ─── Media Library Picker ─────────────────────────────────────────────────
const showMediaPicker = ref(false)
const mediaPickerSearch = ref('')
const mediaPickerGroup = ref('')
const mediaPickerItems = ref([])
const mediaPickerSelected = ref([])
const mediaGroups = ref([])

async function loadMediaPicker() {
  const params = new URLSearchParams({ per_page: '50' })
  if (mediaPickerSearch.value) params.set('search', mediaPickerSearch.value)
  if (mediaPickerGroup.value) params.set('group_id', mediaPickerGroup.value)
  try {
    const res = await fetch(`/api/media?${params}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await res.json()
    mediaPickerItems.value = data.items || []
  } catch (e) { console.error(e) }
}

async function loadMediaGroups() {
  try {
    const res = await fetch('/api/media/groups', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    mediaGroups.value = await res.json()
  } catch (e) { console.error(e) }
}

function toggleMediaPickerSelect(fp) {
  const i = mediaPickerSelected.value.indexOf(fp)
  if (i >= 0) mediaPickerSelected.value.splice(i, 1)
  else mediaPickerSelected.value.push(fp)
}

function doImportFromMedia() {
  for (const fp of mediaPickerSelected.value) {
    if (!existingImages.value.includes(fp)) existingImages.value.push(fp)
  }
  showMediaPicker.value = false
  mediaPickerSelected.value = []
}

// Auto-load media data when picker opens — restore last group from memory
watch(showMediaPicker, (v) => {
  if (v) {
    loadMediaGroups()
    mediaPickerGroup.value = localStorage.getItem('_lastMediaGroup') || ''
    loadMediaPicker()
    mediaPickerSelected.value = []
  }
})
// Remember selected group
watch(mediaPickerGroup, v => { if (v) localStorage.setItem('_lastMediaGroup', v) })

// AI Create state
const showAICreate = ref(false)
const aiProductName = ref('')
const aiCategoryId = ref(null)
const aiChannels = ref([])
const aiChannelId = ref(null)
const aiModel = ref('')
const aiGenerating = ref(false)
const aiError = ref('')
const aiStep = ref('AI 正在生成产品内容...')
const aiRefProductId = ref(-1) // -1 = default template, 0 = no detail, id = use that product's detail
const aiRefTemplate = ref('') // loaded template HTML
const aiCurrentModels = computed(() => {
  const ch = aiChannels.value.find(c => c.id === aiChannelId.value)
  return ch?.models || []
})
function onAIChannelChange() {
  const ch = aiChannels.value.find(c => c.id === aiChannelId.value)
  if (ch?.models?.length) aiModel.value = ch.models[0]
}
async function onRefProductChange() {
  if (aiRefProductId.value > 0) {
    try {
      const resp = await fetch('/api/products/' + aiRefProductId.value, {
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
      })
      const p = await resp.json()
      aiRefTemplate.value = p.detail_content || ''
    } catch (e) { aiRefTemplate.value = '' }
  } else {
    aiRefTemplate.value = ''
  }
}

const activeTranslateMenu = ref(null)
const translateMenuPos = ref({ top: '0px', right: '0px' })
const translatingItemLog = ref(null)

onMounted(() => {
  document.addEventListener('click', () => {
    activeTranslateMenu.value = null
  })
})

async function toggleTranslateMenu(item, event) {
  if (activeTranslateMenu.value === item.id) {
    activeTranslateMenu.value = null
    return
  }
  activeTranslateMenu.value = item.id
  if (event) {
    const rect = event.currentTarget.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const menuHeight = 350

    if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
      translateMenuPos.value = {
        bottom: (window.innerHeight - rect.top) + 'px',
        top: 'auto',
        right: (window.innerWidth - rect.right) + 'px'
      }
    } else {
      translateMenuPos.value = {
        top: rect.bottom + 'px',
        bottom: 'auto',
        right: (window.innerWidth - rect.right) + 'px'
      }
    }
  }
  if (item._translationStatus) return // Already loaded

  item._loadingStatus = true
  try {
    const res = await api.getItemTranslationStatus('product', item.id)
    item._translationStatus = res.status || []
  } catch (e) {
    console.error('Failed to load status', e)
  }
  item._loadingStatus = false
}

async function translateProduct(product, targetLangCode = null, targetLangName = null) {
  const langLabel = targetLangName ? targetLangName : '所有未翻译的语言'
  if (!confirm(`开始翻译产品「${product.name_en || product.name}」(${langLabel})？`)) return
  
  translatingId.value = product.id
  activeTranslateMenu.value = null // close menu
  translatingItemLog.value = { id: product.id, langName: targetLangName || '全部语言', log: '开始翻译...\n' }
  
  try {
    translatingItemLog.value.log += `正在调用后台 AI 引擎翻译...\n`
    const res = await api.translateItem('product', product.id, targetLangCode)
    
    translatingItemLog.value.log += `\n✅ 翻译完成！\n共翻译了 ${res.fields || 0} 个字段到 ${res.languages || 1} 种语言。\n`
    if (res.results?.length) {
      res.results.forEach(r => {
         translatingItemLog.value.log += `[${r.lang}] 字段 ${r.field}: 成功\n`
      })
    }
    if (res.errors?.length) {
      translatingItemLog.value.log += `\n⚠️ 遇到 ${res.errors.length} 个错误：\n`
      res.errors.forEach(e => {
         translatingItemLog.value.log += `[${e.lang}] 字段 ${e.field}: ${e.error}\n`
      })
    }
    // Refresh status visually if it was open
    if (product._translationStatus && targetLangCode) {
       const s = product._translationStatus.find(x => x.code === targetLangCode)
       if (s) s.translated = true
    } else if (product._translationStatus && !targetLangCode) {
       product._translationStatus.forEach(s => s.translated = true)
    }
  } catch (e) {
    translatingItemLog.value.log += `\n❌ 翻译失败: ${e.message}\n`
  } finally {
    translatingId.value = null
  }
}

const form = reactive({
  name: '',
  name_en: '',
  category_id: null,
  description: '',
  description_en: '',
  detail_content: '',
  is_featured: 0,
  status: 1,
  sort_order: 0,
  seo_title: '',
  seo_description: '',
  seo_keywords: ''
})

const flatCategories = computed(() => {
  const result = []
  const flatten = (cats, prefix = '') => {
    cats.forEach(cat => {
      result.push({ ...cat, prefix })
      if (cat.children?.length) {
        flatten(cat.children, prefix + '-- ')
      }
    })
  }
  flatten(categories.value)
  return result
})

const { t, localizedValue } = useLang()

const showVarsPanel = ref(false)
const showHtmlHints = ref(false)
const companyInfo = ref(null)

// HTML code hint strings
const singleImgCode = `<img src="https://your-image-url.jpg"
     alt="product image"
     style="max-width:100%;height:auto;display:block;margin:0 auto;" />`

const carouselCode = `<div class="ps-slider">
  <div class="ps-slides">
    <div class="ps-slide"><img src="https://img1.jpg" /></div>
    <div class="ps-slide"><img src="https://img2.jpg" /></div>
    <div class="ps-slide"><img src="https://img3.jpg" /></div>
  </div>
  <button class="ps-prev">&#8249;</button>
  <button class="ps-next">&#8250;</button>
  <div class="ps-dots"></div>
</div>`

function copyHint(code) {
  navigator.clipboard?.writeText(code).then(() => alert('已复制到剪贴板'))
}

// Template variables list for the hint panel
const templateVars = computed(() => {
  const co = companyInfo.value || {}
  const whatsapp = co.whatsapp || ''
  const whatsappRaw = whatsapp.replace(/[^0-9+]/g, '')
  const whatsappLink = whatsappRaw ? `https://api.whatsapp.com/send?phone=${whatsappRaw.replace(/^\+/, '')}` : 'https://api.whatsapp.com/send?phone=...'
  return [
    { var: '{{email}}',          desc: '邮箱地址',       preview: co.email || '(未设置)' },
    { var: '{{phone}}',          desc: '电话号码',       preview: co.phone || '(未设置)' },
    { var: '{{whatsapp}}',       desc: 'WhatsApp号码（显示用）', preview: whatsapp || '(未设置)' },
    { var: '{{whatsapp_link}}',  desc: 'WhatsApp链接（用于 href）', preview: whatsappLink },
    { var: '{{whatsapp_raw}}',   desc: 'WhatsApp纯数字', preview: whatsappRaw || '(未设置)' },
    { var: '{{company_name}}',   desc: '公司名称',       preview: co.name_en || co.name || '(未设置)' },
  ]
})

function copyVar(v) {
  navigator.clipboard?.writeText(v).then(() => alert(`已复制: ${v}`))
}

const loadProducts = async () => {
  try {
    const res = await api.getProducts({ limit: 500 })
    products.value = res.data
  } catch (e) {
    console.error(e)
  }
}

const loadCategories = async () => {
  try {
    categories.value = await api.getCategoryTree()
    // Also load company info for the template variables panel
    try { companyInfo.value = await api.getCompany() } catch (e) {}
    // Load AI channels
    try {
      aiChannels.value = await api.getAIChannels()
      if (aiChannels.value.length) {
        const def = aiChannels.value.find(c => c.is_default) || aiChannels.value[0]
        aiChannelId.value = def.id
        aiModel.value = def.models?.[0] || ''
      }
    } catch (e) {}
  } catch (e) {
    console.error(e)
  }
}

const openModal = async (product = null) => {
  editingProduct.value = product
  form.name = product?.name || ''
  form.name_en = product?.name_en || ''
  form.category_id = product?.category_id || null
  form.description = product?.description || ''
  form.description_en = product?.description_en || ''
  form.detail_content = product?.detail_content || ''
  form.is_featured = product?.is_featured || 0
  form.status = product?.status ?? 1
  form.sort_order = product?.sort_order || 0
  form.seo_title = product?.seo_title || ''
  form.seo_description = product?.seo_description || ''
  form.seo_keywords = product?.seo_keywords || ''
  existingImages.value = product?.images?.split(',').filter(Boolean) || []
  specs.value = product?.specs ? JSON.parse(product.specs) : []
  faqItems.value = product?.faq_items ? (typeof product.faq_items === 'string' ? JSON.parse(product.faq_items) : product.faq_items) : []
  imageFiles.value = []
  
  // Reset editor state
  prodFullscreen.value = false
  editorMode.value = 'visual'
  replacingImg = null

  showModal.value = true
  await nextTick()
  syncToVisual()
}

let dragIndex = -1
const dragStart = (index) => { dragIndex = index }
const dragDrop = (toIndex) => {
  if (dragIndex < 0 || dragIndex === toIndex) return
  const arr = [...existingImages.value]
  const [moved] = arr.splice(dragIndex, 1)
  arr.splice(toIndex, 0, moved)
  existingImages.value = arr
  dragIndex = -1
}
const setMain = (index) => {
  if (index === 0) return
  const arr = [...existingImages.value]
  const [img] = arr.splice(index, 1)
  arr.unshift(img)
  existingImages.value = arr
}

const handleFileChange = (e) => {
  imageFiles.value = Array.from(e.target.files)
}

const handleSubmit = async () => {
  loading.value = true
  try {
    const formData = new FormData()
    formData.append('name', form.name)
    formData.append('name_en', form.name_en)
    formData.append('category_id', form.category_id || '')
    formData.append('description', form.description)
    formData.append('description_en', form.description_en)
    formData.append('detail_content', form.detail_content || '')
    formData.append('specs', JSON.stringify(specs.value.filter(s => s.name && s.value)))
    formData.append('is_featured', form.is_featured)
    formData.append('status', form.status)
    formData.append('sort_order', form.sort_order)
    formData.append('seo_title', form.seo_title || '')
    formData.append('seo_description', form.seo_description || '')
    formData.append('seo_keywords', form.seo_keywords || '')
    formData.append('faq_items', JSON.stringify(faqItems.value.filter(f => f.question && f.answer)))
    formData.append('existing_images', existingImages.value.join(','))
    
    imageFiles.value.forEach(file => {
      formData.append('images', file)
    })

    if (editingProduct.value) {
      await api.updateProduct(editingProduct.value.id, formData)
    } else {
      await api.createProduct(formData)
    }
    showModal.value = false
    await loadProducts()
  } catch (e) {
    alert(e.message)
  } finally {
    loading.value = false
  }
}

const handleDelete = async (product) => {
  if (!confirm(`确定删除商品"${product.name}"吗？`)) return
  try {
    await api.deleteProduct(product.id)
    await loadProducts()
  } catch (e) {
    alert(e.message)
  }
}

async function duplicateProduct(product) {
  if (!confirm(`复制产品「${product.name}」？`)) return
  try {
    const original = await api.getProduct(product.id)
    // Open the modal pre-filled with the original's data, ready to save as new
    openModal(null)  // reset first
    await new Promise(r => setTimeout(r, 50))
    form.name = original.name + ' (副本)'
    form.name_en = (original.name_en || '') + ' (Copy)'
    form.category_id = original.category_id
    form.description = original.description || ''
    form.description_en = original.description_en || ''
    form.detail_content = original.detail_content || ''
    form.is_featured = original.is_featured || 0
    form.status = original.status !== undefined ? original.status : 1
    form.sort_order = original.sort_order || 0
    form.seo_title = original.seo_title || ''
    form.seo_description = original.seo_description || ''
    form.seo_keywords = original.seo_keywords || ''
    existingImages.value = original.images ? original.images.split(',').filter(Boolean) : []
    specs.value = original.specs ? JSON.parse(original.specs) : []
    await nextTick()
    syncToVisual()
  } catch(e) { alert('复制失败: ' + e.message) }
}

// ─── Visual editor helpers ────────────────────────────────────────────────────
function syncToVisual() {
  if (visualEditorEl.value) {
    visualEditorEl.value.innerHTML = form.detail_content || '<p>在此处编辑产品详情，或切换到 HTML 代码模式粘贴 HTML...</p>'
  }
}

function syncFromVisual() {
  if (visualEditorEl.value) {
    form.detail_content = visualEditorEl.value.innerHTML
  }
}

async function switchMode(mode) {
  // Sync content when switching
  if (editorMode.value === 'visual') syncFromVisual()
  editorMode.value = mode
  if (mode === 'visual') {
    await nextTick()
    syncToVisual()
  }
}

function onVisualInput() {
  syncFromVisual()
}

function onVisualClick(e) {
  const img = e.target.closest('img')
  const tip = e.target.closest('.replace-tip')
  if (tip) {
    e.preventDefault()
    const parent = tip.parentElement
    const nearImg = parent ? parent.querySelector('img') : null
    if (nearImg) {
      visualEditorEl.value.querySelectorAll('img').forEach(i => i.style.outline = '')
      nearImg.style.outline = '3px solid #3b82f6'
      replacingImg = nearImg
      replacingImg._replaceTipEl = tip
      openImageChooser()
    }
    return
  }
  if (img) {
    e.preventDefault()
    visualEditorEl.value.querySelectorAll('img').forEach(i => i.style.outline = '')
    img.style.outline = '3px solid #3b82f6'
    replacingImg = img
    openImageChooser()
  }
}

function openImageChooser() {
  showImgChooser.value = true
}

function pickFromComputer() {
  showImgChooser.value = false
  imgUploadInput.value?.click()
}

async function loadDetailMedia() {
  try {
    const token = localStorage.getItem('token')
    const params = new URLSearchParams({ per_page: '200' })
    if (detailMediaGroup.value) params.set('group_id', detailMediaGroup.value)
    if (detailMediaSearch.value) params.set('search', detailMediaSearch.value)
    const res = await fetch(`/api/media?${params}`, { headers: { 'Authorization': `Bearer ${token}` } })
    const data = await res.json()
    detailMediaItems.value = data.items || []
  } catch (e) { console.error('Failed to load media:', e) }
}

async function loadDetailMediaGroups() {
  try {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/media/groups', { headers: { 'Authorization': `Bearer ${token}` } })
    detailMediaGroups.value = await res.json()
  } catch (e) { console.error(e) }
}

function pickFromMediaLib() {
  showImgChooser.value = false
  detailMediaSearch.value = ''
  detailMediaGroup.value = localStorage.getItem('_lastMediaGroup') || ''
  loadDetailMediaGroups()
  loadDetailMedia()
  showDetailMediaBrowser.value = true
}
// Remember selected group for detail media browser
watch(detailMediaGroup, v => { if (v) localStorage.setItem('_lastMediaGroup', v) })

function selectDetailMediaImage(item) {
  const url = item.filepath
  showDetailMediaBrowser.value = false
  if (replacingImg && replacingImg.parentElement) {
    replacingImg.src = url
    replacingImg.style.outline = ''
    if (replacingImg._replaceTipEl) {
      replacingImg._replaceTipEl.remove()
      delete replacingImg._replaceTipEl
    } else {
      let nextEl = replacingImg.nextElementSibling
      if (!nextEl && replacingImg.parentElement) nextEl = replacingImg.parentElement.querySelector('.replace-tip')
      if (nextEl && nextEl.classList?.contains('replace-tip')) nextEl.remove()
    }
    replacingImg = null
    syncFromVisual()
  } else {
    // Insert new image
    replacingImg = null
    if (editorMode.value === 'visual' && visualEditorEl.value) {
      document.execCommand('insertImage', false, url)
      syncFromVisual()
    } else {
      const imgTag = `<img src="${url}" style="max-width:100%;height:auto;border-radius:8px;" alt="" />`
      form.detail_content = (form.detail_content || '') + imgTag
    }
  }
}

// ─── Copy Detail Images from Another Product ─────────────────────────────────
const showCopyDetailImgPicker = ref(false)
const copyImgSourceId = ref('')
const copyImgPreview = ref([])
const copyImgGroupFilter = ref('')

// Filter product list by selected group (only products with detail_content, excluding current)
const copyImgProductList = computed(() => {
  let list = products.value.filter(x => x.id !== editingProduct.value?.id && x.detail_content)
  if (copyImgGroupFilter.value === 'all') return list
  const gid = copyImgGroupFilter.value
  if (!gid) return list
  // Include products in this category and its children
  const ids = [parseInt(gid)]
  flatCategories.value.forEach(c => { if (c.prefix && ids.includes(c.parent_id)) ids.push(c.id) })
  return list.filter(p => ids.includes(p.category_id))
})

// Auto-set group filter when picker opens
watch(showCopyDetailImgPicker, (v) => {
  if (v) {
    // Default to current product's top-level category
    if (editingProduct.value?.category_id) {
      const cat = flatCategories.value.find(c => c.id === editingProduct.value.category_id)
      if (cat) {
        const parent = cat.prefix ? flatCategories.value.find(c => c.id === cat.parent_id) : cat
        copyImgGroupFilter.value = String((parent || cat).id)
      } else {
        copyImgGroupFilter.value = 'all'
      }
    } else {
      copyImgGroupFilter.value = 'all'
    }
    copyImgSourceId.value = ''
    copyImgPreview.value = []
  }
})

async function previewCopyImgs() {
  copyImgPreview.value = []
  if (!copyImgSourceId.value) return
  try {
    const p = await api.getProduct(copyImgSourceId.value)
    if (!p.detail_content) return
    const parser = new DOMParser()
    const doc = parser.parseFromString(p.detail_content, 'text/html')
    const imgs = doc.querySelectorAll('img[src]')
    copyImgPreview.value = Array.from(imgs).map(img => img.getAttribute('src')).filter(Boolean)
  } catch (e) { console.error(e) }
}

function doCopyDetailImgs() {
  if (!copyImgPreview.value.length || !form.detail_content) {
    showCopyDetailImgPicker.value = false
    return
  }
  // Use DOMParser only to discover existing img src positions in the current content
  const parser = new DOMParser()
  const doc = parser.parseFromString(form.detail_content, 'text/html')
  const currentImgs = doc.querySelectorAll('img[src]')
  const sourceImgs = copyImgPreview.value

  if (currentImgs.length === 0) {
    alert('当前产品详情中没有图片位置可以替换')
    showCopyDetailImgPicker.value = false
    return
  }

  // Collect (oldSrc -> newSrc) mappings for replacement
  // We replace img src values directly on the raw HTML string to preserve
  // the entire document structure including <style> tags, inline styles, etc.
  // DOMParser would strip <style> tags from the body (moves them to <head>),
  // which is the root cause of the layout-breaking bug.
  let html = form.detail_content
  let replaced = 0

  // Use regex to find <img ...> tags one by one and replace their src
  // We track which source image index we're on
  let imgIndex = 0
  html = html.replace(/<img\b([^>]*?)src\s*=\s*(["'])([^"']*?)\2([^>]*?)\/?>/gi, (match, before, quote, oldSrc, after) => {
    if (imgIndex < sourceImgs.length) {
      const newSrc = sourceImgs[imgIndex]
      imgIndex++
      replaced++
      // Preserve the original closing style (self-closing or not)
      const selfClose = match.trimEnd().endsWith('/>') ? ' />' : '>'
      return `<img${before}src=${quote}${newSrc}${quote}${after}${selfClose}`
    }
    imgIndex++
    return match
  })

  if (replaced === 0) {
    alert('当前产品详情中没有图片位置可以替换')
  } else {
    form.detail_content = html
    if (editorMode.value === 'visual') {
      nextTick(() => syncToVisual())
    }
    alert(`✅ 已复制 ${replaced} 张图片到对应位置`)
  }
  showCopyDetailImgPicker.value = false
  copyImgSourceId.value = ''
  copyImgPreview.value = []
}

async function onVisualPaste(e) {
  // Handle pasted images from clipboard
  const items = e.clipboardData?.items
  if (!items) return
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault()
      const file = item.getAsFile()
      if (file) {
        try {
          const res = await api.upload(file)
          document.execCommand('insertImage', false, res.url)
          syncFromVisual()
        } catch (err) { alert('图片上传失败: ' + err.message) }
      }
      return
    }
  }
  // For HTML paste, let default behavior handle it, then sync
  setTimeout(() => syncFromVisual(), 50)
}

function insertImage() {
  replacingImg = null
  openImageChooser()
}

function insertCarousel() {
  carouselUploadInput.value?.click()
}

// Generate self-contained carousel HTML (pure HTML/CSS/JS, works inside iframe)
function generateCarouselHtml(urls) {
  const slides = urls.map(u => `<div class="ps-slide"><img src="${u}" /></div>`).join('\n    ')
  const dots = urls.map((_, i) => `<span class="ps-dot${i === 0 ? ' active' : ''}" data-i="${i}"></span>`).join('')
  return `
<div class="ps-slider">
  <div class="ps-slides">
    ${slides}
  </div>
  <button class="ps-prev">&#8249;</button>
  <button class="ps-next">&#8250;</button>
  <div class="ps-dots">${dots}</div>
</div>
<style>
.ps-slider{position:relative;overflow:hidden;border-radius:8px;background:#000;user-select:none}
.ps-slides{display:flex;transition:transform .4s ease}
.ps-slide{min-width:100%;text-align:center}
.ps-slide img{max-width:100%;max-height:520px;height:auto;object-fit:contain;display:block;margin:0 auto}
.ps-prev,.ps-next{position:absolute;top:50%;transform:translateY(-50%);background:rgba(0,0,0,.45);color:#fff;border:none;font-size:32px;line-height:1;padding:4px 14px;cursor:pointer;border-radius:4px;z-index:10;transition:background .2s}
.ps-prev{left:8px}.ps-next{right:8px}
.ps-prev:hover,.ps-next:hover{background:rgba(0,0,0,.75)}
.ps-dots{text-align:center;padding:10px 0;background:rgba(0,0,0,.3)}
.ps-dot{display:inline-block;width:10px;height:10px;border-radius:50%;background:#fff;opacity:.45;margin:0 4px;cursor:pointer;transition:opacity .2s}
.ps-dot.active{opacity:1}
</style>
<script>
(function(){
  var sliders=document.querySelectorAll('.ps-slider');
  sliders.forEach(function(box){
    var slides=box.querySelector('.ps-slides');
    var dots=box.querySelectorAll('.ps-dot');
    var total=box.querySelectorAll('.ps-slide').length;
    var cur=0;
    function go(n){cur=(n+total)%total;slides.style.transform='translateX(-'+cur*100+'%)';dots.forEach(function(d,i){d.classList.toggle('active',i===cur);});}
    box.querySelector('.ps-prev').addEventListener('click',function(){go(cur-1);});
    box.querySelector('.ps-next').addEventListener('click',function(){go(cur+1);});
    dots.forEach(function(d,i){d.addEventListener('click',function(){go(i);});});
  });
})();
<\/script>
`
}

async function handleCarouselUpload(e) {
  const files = Array.from(e.target.files || [])
  if (!files.length) return
  try {
    // Upload all images in parallel
    const results = await Promise.all(files.map(f => api.upload(f)))
    const urls = results.map(r => r.url)
    const carouselHtml = generateCarouselHtml(urls)
    if (editorMode.value === 'visual' && visualEditorEl.value) {
      // In visual mode: append to editor
      visualEditorEl.value.innerHTML += carouselHtml
      syncFromVisual()
    } else {
      // In HTML/preview mode: append to content
      form.detail_content = (form.detail_content || '') + carouselHtml
    }
    alert(`✅ 已插入包含 ${urls.length} 张图片的轮播图！`)
  } catch (err) {
    alert('图片上传失败: ' + err.message)
  }
  if (carouselUploadInput.value) carouselUploadInput.value.value = ''
}

async function handleImgUpload(e) {
  const files = Array.from(e.target.files || [])
  if (!files.length) return

  // If replacing an existing image in visual mode, just replace the single image
  if (replacingImg && files.length >= 1) {
    // Check if the img element is still in the DOM
    if (!replacingImg.parentElement) {
      replacingImg = null
    } else {
      try {
        const res = await api.upload(files[0])
        replacingImg.src = res.url
        replacingImg.style.outline = ''
        // Auto-remove the associated replace-tip span
        if (replacingImg._replaceTipEl) {
          replacingImg._replaceTipEl.remove()
          delete replacingImg._replaceTipEl
        } else {
          // Try to remove next sibling replace-tip
          let nextEl = replacingImg.nextElementSibling
          if (!nextEl && replacingImg.parentElement) nextEl = replacingImg.parentElement.querySelector('.replace-tip')
          if (nextEl && nextEl.classList?.contains('replace-tip')) nextEl.remove()
        }
        replacingImg = null
        syncFromVisual()
      } catch (err) { alert('图片上传失败: ' + err.message) }
    }
    if (imgUploadInput.value) imgUploadInput.value.value = ''
    return
  }

  // Multiple images selected → generate carousel
  if (files.length > 1) {
    try {
      const results = await Promise.all(files.map(f => api.upload(f)))
      const urls = results.map(r => r.url)
      const carouselHtml = generateCarouselHtml(urls)
      if (editorMode.value === 'visual' && visualEditorEl.value) {
        visualEditorEl.value.innerHTML += carouselHtml
        syncFromVisual()
      } else {
        form.detail_content = (form.detail_content || '') + carouselHtml
      }
      alert(`✅ 已插入包含 ${urls.length} 张图片的轮播图！`)
    } catch (err) { alert('图片上传失败: ' + err.message) }
    if (imgUploadInput.value) imgUploadInput.value.value = ''
    return
  }

  // Single image selected → insert as <img>
  const file = files[0]
  try {
    const res = await api.upload(file)
    if (editorMode.value === 'visual' && visualEditorEl.value) {
      document.execCommand('insertImage', false, res.url)
      syncFromVisual()
    } else {
      const imgTag = `<img src="${res.url}" style="max-width:100%;height:auto;border-radius:8px;" alt="" />`
      form.detail_content = (form.detail_content || '') + imgTag
    }
  } catch (err) {
    alert('图片上传失败: ' + err.message)
  }
  if (imgUploadInput.value) imgUploadInput.value.value = ''
}

async function generateWithAI() {
  if (!aiProductName.value.trim()) return
  aiGenerating.value = true
  aiError.value = ''
  aiStep.value = '⏳ 第1步：生成产品基本信息...'
  try {
    const selectedCat = flatCategories.value.find(c => c.id === aiCategoryId.value)
    // Determine template to use
    let template = ''
    if (aiRefProductId.value === -1) {
      template = DEFAULT_DETAIL_TEMPLATE
    } else if (aiRefProductId.value > 0) {
      template = aiRefTemplate.value
    }
    // else 0 = no detail generation

    if (template) {
      aiStep.value = '⏳ AI 正在生成完整产品内容（基本信息 + 详情页）...'
    }

    const data = await api.generateProduct({
      product_name: aiProductName.value.trim(),
      category_name: selectedCat?.name || '',
      channel_id: aiChannelId.value,
      model: aiModel.value,
      detail_template: template
    })
    // Close AI dialog
    showAICreate.value = false
    // Fill form and open edit modal
    editingProduct.value = null
    form.name = data.name || aiProductName.value
    form.name_en = data.name_en || ''
    form.category_id = aiCategoryId.value
    form.description = data.description || ''
    form.description_en = data.description_en || ''
    form.detail_content = data.detail_content || ''
    form.is_featured = 0
    form.status = 1
    form.sort_order = 0
    form.seo_title = data.seo_title || ''
    form.seo_description = data.seo_description || ''
    form.seo_keywords = data.seo_keywords || ''
    existingImages.value = []
    specs.value = Array.isArray(data.specs) ? data.specs : []
    faqItems.value = Array.isArray(data.faq_items) ? data.faq_items : []
    imageFiles.value = []
    prodFullscreen.value = false
    editorMode.value = 'visual'
    replacingImg = null
    showModal.value = true
    await nextTick()
    syncToVisual()
    const hasDetail = data.detail_content ? '\n✅ 产品详情页已生成！' : '\n⚠️ 产品详情未生成，保存后可使用 🤖 AI 按钮单独生成。'
    alert('✅ AI 生成完成！请检查内容后保存。' + hasDetail)
  } catch (e) {
    aiError.value = e.message || '生成失败，请重试'
  } finally {
    aiGenerating.value = false
  }
}

onMounted(() => {
  loadProducts()
  loadCategories()
})
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.product-thumb {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 4px;
}

.spec-row {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.spec-row .form-control {
  flex: 1;
}

.image-preview {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.preview-item {
  position: relative;
  width: 90px;
  height: 90px;
  border: 2px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
  cursor: grab;
  transition: border-color 0.2s;
}

.preview-item.is-main {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(37,99,235,0.2);
}

.preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

.preview-item .main-badge {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--primary);
  color: white;
  font-size: 10px;
  text-align: center;
  padding: 2px;
}

.preview-item .btn-del,
.preview-item .btn-main {
  position: absolute;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-item .btn-del {
  top: 2px; right: 2px;
  width: 18px; height: 18px;
  background: rgba(220,38,38,0.85);
  color: white; font-size: 13px;
}

.preview-item .btn-main {
  top: 2px; left: 2px;
  width: 18px; height: 18px;
  background: rgba(255,255,255,0.9);
  font-size: 10px;
}

.badge-secondary {
  background: #e2e8f0;
  color: #64748b;
}

.form-hint {
  font-size: 12px;
  color: var(--secondary);
  margin: 4px 0 8px;
}

.quill-editor-wrap {
  border: 1px solid var(--border);
  border-radius: 4px;
  background: #fff;
  display: flex;
  flex-direction: column;
}

/* Sticky toolbar */
:deep(.ql-toolbar) {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #fff;
  border-radius: 4px 4px 0 0;
  border-bottom: 1px solid var(--border);
}

:deep(.ql-container) {
  border-radius: 0 0 4px 4px;
  min-height: 200px;
  max-height: 60vh;
  overflow-y: auto;
  font-size: 14px;
}

/* Images and tables inside the admin editor */
:deep(.ql-editor) img {
  max-width: 100%;
  height: auto;
}

:deep(.ql-editor) table,
:deep(.ql-editor) td,
:deep(.ql-editor) th {
  border: 1px solid #d1d5db;
  border-collapse: collapse;
  padding: 6px 10px;
}

/* SEO section within product modal */
.seo-section {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  margin-top: 16px;
}

.seo-section-title {
  font-size: 14px;
  font-weight: 700;
  color: #475569;
  margin: 0 0 14px 0;
  padding-bottom: 10px;
  border-bottom: 1px solid #e2e8f0;
}

.seo-section .form-group { margin-bottom: 12px; }
.seo-section .form-group:last-child { margin-bottom: 0; }

.hint {
  font-weight: 400;
  font-size: 11px;
  color: #94a3b8;
  margin-left: 6px;
}

.seo-section small { font-size: 11px; color: #94a3b8; }

/* ── Editor mode bar ──────────────────────────────────────── */
.editor-mode-bar {
  display: flex; align-items: center; justify-content: space-between;
  background: #f8fafc; border: 1px solid var(--border);
  border-radius: 8px 8px 0 0; padding: 8px 12px;
  margin-bottom: 0;
}

.mode-tabs { display: flex; gap: 4px; }
.mode-tab {
  padding: 6px 14px; border: none; background: transparent;
  border-radius: 6px; font-size: 13px; font-weight: 600;
  cursor: pointer; color: var(--text-muted); transition: all 0.18s;
}
.mode-tab.active { background: white; color: var(--primary); box-shadow: 0 1px 4px rgba(0,0,0,.1); }

.fullscreen-btn {
  padding: 5px 12px; border: 1.5px solid var(--border); border-radius: 6px;
  background: white; font-size: 12px; font-weight: 600;
  cursor: pointer; color: var(--text-muted); transition: all 0.18s;
}
.fullscreen-btn:hover { border-color: var(--primary); color: var(--primary); }

/* ── Editor wrap — normal and fullscreen ─────────────────── */
.editor-wrap { border: 1px solid var(--border); border-top: none; border-radius: 0 0 8px 8px; }

.editor-wrap.is-fullscreen {
  position: fixed; inset: 0; z-index: 99999;
  border-radius: 0; border: none;
  display: flex; flex-direction: column;
  background: white; padding: 20px;
  overflow-y: auto;
}

.editor-wrap.is-fullscreen .quill-editor-wrap,
.editor-wrap.is-fullscreen .block-editor {
  flex: 1; height: calc(100vh - 100px);
}

.editor-wrap.is-fullscreen :deep(.ql-container) {
  max-height: none; height: 100%;
}

/* ── Block editor ─────────────────────────────────────────── */
.block-editor {
  padding: 16px; min-height: 400px;
  display: flex; flex-direction: column; gap: 8px;
}

.block-row { position: relative; }

.block-controls-row {
  display: flex; align-items: flex-start; gap: 8px;
}

.block-handle {
  flex-shrink: 0; width: 20px; padding-top: 10px;
  color: #cbd5e1; cursor: grab; font-size: 12px;
  letter-spacing: -3px; user-select: none;
}

.block-del {
  flex-shrink: 0; width: 26px; height: 26px; margin-top: 6px;
  background: none; border: 1px solid #e5e7eb; border-radius: 50%;
  cursor: pointer; color: #94a3b8; font-size: 14px;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s; flex-shrink: 0;
}
.block-del:hover { background: #fee2e2; border-color: #ef4444; color: #ef4444; }

.block-input {
  flex: 1; border: none; outline: none; resize: none;
  font-family: inherit; width: 100%;
  padding: 8px 0; background: transparent;
  border-bottom: 1px solid transparent;
  transition: border-color 0.15s;
}
.block-input:focus { border-bottom-color: var(--primary); }

.block-h1 { font-size: 26px; font-weight: 700; color: #0f172a; }
.block-h2 { font-size: 20px; font-weight: 700; color: #1e293b; }
.block-p { font-size: 16px; line-height: 1.7; color: #374151; }
.block-quote {
  font-size: 16px; line-height: 1.6; color: #475569;
  padding-left: 16px; border-left: 4px solid #0077b5;
  font-style: italic;
}
.block-hr { flex: 1; height: 2px; background: #e5e7eb; border: none; margin-top: 12px; }

/* Image block */
.block-image-row { flex-direction: column; padding: 8px 0; }
.block-image-wrap { width: 100%; display: flex; flex-direction: column; align-items: center; }
.block-img { max-width: 100%; max-height: 400px; object-fit: contain; border-radius: 6px; }
.block-img-caption-wrap { width: 100%; text-align: center; margin-top: 6px; }
.block-caption-input {
  text-align: center; border: none; border-bottom: 1px dashed #cbd5e1;
  outline: none; font-size: 13px; color: #64748b; width: 60%;
  padding: 4px 0; background: transparent;
}
.block-caption-input:focus { border-bottom-color: var(--primary); }
.block-caption-input::placeholder { color: #cbd5e1; }

/* Add block row */

/* FAQ editor */
.faq-row { display: flex; gap: 8px; align-items: flex-start; margin-bottom: 8px; }
.faq-fields { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.faq-fields input, .faq-fields textarea { font-size: 13px; }
.add-block-row {
  display: flex; flex-wrap: wrap; gap: 8px;
  padding: 12px 0; border-top: 1px dashed #e2e8f0; margin-top: 8px;
}
.add-block-btn {
  padding: 6px 14px; border: 1.5px dashed #cbd5e1; border-radius: 20px;
  background: transparent; font-size: 13px; color: #64748b;
  cursor: pointer; transition: all 0.15s; font-weight: 500;
}
.add-block-btn:hover { border-color: #0077b5; color: #0077b5; background: #eff8ff; }

/* HTML source code editor */
.carousel-btn { background: #ecfdf5 !important; border-color: #6ee7b7 !important; color: #065f46 !important; }
.carousel-btn:hover { background: #d1fae5 !important; border-color: #34d399 !important; }

/* HTML hints panel */
.html-hints-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 700px) { .html-hints-grid { grid-template-columns: 1fr; } }
.hint-block { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; }
.hint-title { margin: 0 0 6px; font-size: 12px; font-weight: 700; color: #374151; }
.hint-code {
  font-family: monospace; font-size: 11px; background: #1e293b; color: #7dd3fc;
  padding: 8px; border-radius: 4px; overflow-x: auto; white-space: pre; cursor: pointer;
  margin: 0 0 6px; line-height: 1.5;
}
.hint-code:hover { background: #0f172a; }
.hint-note { margin: 0; font-size: 11px; color: #6b7280; }

.html-editor {
  width: 100%; min-height: 400px; padding: 16px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px; line-height: 1.7;
  background: #1e293b; color: #e2e8f0;
  border: none; border-radius: 0 0 8px 8px;
  resize: vertical; outline: none;
  tab-size: 2; white-space: pre-wrap;
  box-sizing: border-box;
}
.html-editor::placeholder { color: #64748b; }
.html-preview {
  min-height: 400px; padding: 20px;
  background: #fff; border: 1px solid #e2e8f0;
  border-radius: 0 0 8px 8px;
  line-height: 1.8; font-size: 15px;
  overflow-y: auto;
}
.html-preview img { max-width: 100%; height: auto; border-radius: 6px; }
.html-preview table { border-collapse: collapse; width: 100%; }
.html-preview table td, .html-preview table th { border: 1px solid #e2e8f0; padding: 8px 12px; }

.is-fullscreen .html-editor,
.is-fullscreen .html-preview,
.is-fullscreen .visual-editor { min-height: calc(100vh - 60px); }

/* Visual editor (contenteditable) */
.visual-editor {
  min-height: 400px; padding: 20px;
  background: #fff; border: 1px solid #e2e8f0;
  border-radius: 0 0 8px 8px;
  line-height: 1.8; font-size: 15px;
  overflow-y: auto; outline: none;
  word-wrap: break-word;
}
.visual-editor:focus { border-color: #93c5fd; }
.visual-editor img {
  max-width: 100%; height: auto; border-radius: 6px;
  cursor: pointer; transition: outline 0.15s;
}
.visual-editor img:hover { outline: 3px dashed #3b82f6; }

/* Replace-tip: clickable yellow prompt in admin visual editor */
.visual-editor :deep(.replace-tip),
.visual-editor .replace-tip {
  display: block; background: #fffbeb; color: #d97706; font-weight: bold;
  padding: 10px; margin-top: 8px; border-radius: 6px;
  border: 1px dashed #fbbf24; font-size: 13px; cursor: pointer;
  transition: all 0.15s;
}
.visual-editor :deep(.replace-tip):hover,
.visual-editor .replace-tip:hover {
  background: #fef3c7; border-color: #f59e0b;
}

/* Hide replace-tip in preview mode */
.html-preview .replace-tip,
.html-preview :deep(.replace-tip) {
  display: none !important;
}
.visual-editor table { border-collapse: collapse; width: 100%; }
.visual-editor table td, .visual-editor table th { border: 1px solid #e2e8f0; padding: 8px 12px; }

/* Editor action buttons */
.editor-actions { display: flex; gap: 8px; align-items: center; }
.editor-btn {
  padding: 4px 12px; border: 1px solid #d1d5db; border-radius: 6px;
  background: #fff; font-size: 13px; cursor: pointer; color: #374151;
}
.editor-btn:hover { background: #eff6ff; border-color: #93c5fd; color: #1e40af; }

/* Template Variables Panel */
.vars-panel {
  border: 1px solid #e2e8f0; border-radius: 8px;
  margin-bottom: 10px; overflow: hidden;
}
.vars-panel-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 14px; background: #eff6ff; cursor: pointer;
  font-size: 13px; font-weight: 600; color: #1e40af;
  user-select: none;
}
.vars-panel-header:hover { background: #dbeafe; }
.vars-toggle { font-size: 12px; color: #3b82f6; }
.vars-panel-body { padding: 14px; background: #fff; border-top: 1px solid #e2e8f0; }
.vars-desc { margin: 0 0 12px; font-size: 12px; color: #64748b; line-height: 1.6; }
.vars-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 8px; margin-bottom: 12px; }
.var-item {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 8px 10px; border: 1px solid #e2e8f0; border-radius: 6px;
  cursor: pointer; transition: all 0.15s;
}
.var-item:hover { border-color: #3b82f6; background: #eff6ff; }
.var-code {
  background: #1e40af; color: #fff;
  padding: 2px 7px; border-radius: 4px;
  font-size: 12px; font-family: monospace; white-space: nowrap;
}
.var-desc { font-size: 12px; color: #374151; flex: 1; }
.var-value { font-size: 11px; color: #6b7280; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vars-example { margin: 0; font-size: 12px; color: #6b7280; }
.vars-example code { background: #f1f5f9; padding: 2px 5px; border-radius: 3px; }

/* Filter bar */
.filter-bar { display: flex; gap: 10px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
.filter-search { max-width: 260px; }
.filter-select { max-width: 180px; }
.filter-count { margin-left: auto; font-size: 13px; color: #64748b; white-space: nowrap; }

/* English product name — 2-line clamp */
.product-name-en {
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden; text-overflow: ellipsis;
  font-size: 13px; line-height: 1.4;
}

/* Action grid — 2 rows × 3 columns */
.action-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px;
}
.action-grid .btn { font-size: 12px; padding: 3px 6px; white-space: nowrap; }

/* Pagination */
.pagination { display: flex; justify-content: center; align-items: center; gap: 12px; padding: 16px 0; }
.page-info { font-size: 13px; color: #64748b; }

/* Import image picker grid */
.import-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 8px; max-height: 400px; overflow-y: auto; }
.import-item { position: relative; aspect-ratio: 1; border: 2px solid #e2e8f0; border-radius: 8px; overflow: hidden; cursor: pointer; transition: all 0.15s; }
.import-item img { width: 100%; height: 100%; object-fit: cover; }
.import-item:hover { border-color: #93c5fd; }
.import-item.selected { border-color: #2563eb; }
.import-item .import-check { position: absolute; top: 4px; right: 4px; width: 22px; height: 22px; border-radius: 50%;
  background: #2563eb; color: #fff; font-size: 14px; display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity 0.15s; }
.import-item.selected .import-check { opacity: 1; }

/* Image source chooser */
.img-chooser-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.img-chooser-btn { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 28px 16px;
  border: 2px solid #e2e8f0; border-radius: 12px; background: #fff; cursor: pointer; transition: all 0.2s; }
.img-chooser-btn:hover { border-color: #16a34a; background: #f0fdf4; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }

@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
