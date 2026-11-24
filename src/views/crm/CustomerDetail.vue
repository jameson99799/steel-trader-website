<template>
  <div class="crm-page customer-detail crm-scope" v-if="customer">
    <!-- Header bar -->
    <div class="detail-topbar">
      <button class="crm-btn crm-btn-ghost crm-btn-sm" @click="$router.push(backPath)">
        <svg viewBox="0 0 20 20" fill="currentColor" style="width:14px;height:14px"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
        返回
      </button>
      <span class="crm-small crm-muted">客户详情</span>
    </div>

    <!-- Customer hero card -->
    <div class="crm-card hero-card">
      <span class="crm-avatar hero-avatar" :style="{ background: avatarColor }">{{ (customer.name || 'U').charAt(0).toUpperCase() }}</span>
      <div class="hero-main">
        <div class="hero-name-row">
          <h1 class="hero-name">{{ customer.name }}</h1>
          <span :class="['crm-badge', statusBadge(customer.status)]">{{ customer.status }}</span>
        </div>
        <div class="hero-tags" v-if="customer.tags?.length">
          <span v-for="t in customer.tags" :key="t" class="crm-pill">{{ t }}</span>
        </div>
        <div class="hero-meta">
          <span>🏢 {{ customer.company || '—' }}</span>
          <span>🌍 {{ customer.country || '—' }}</span>
          <span>👤 {{ customer.owner_name || '—' }}</span>
          <span>📅 {{ formatDate(customer.created_at) }}</span>
          <span>🔄 公海 {{ customer.sea_pool_count || 0 }} 次</span>
        </div>
        <div class="hero-note" v-if="customer.note">📝 {{ customer.note }}</div>
        <div class="claim-history" v-if="customer.claim_history?.length">
          <span class="crm-small crm-muted">📜 申领历史：</span>
          <span v-for="(h, i) in customer.claim_history" :key="i" class="crm-pill" :class="{ 'pool-blue': h.action === 'auto_pool' }">
            {{ h.action === 'auto_pool' ? '→公海池' : h.to_name || '申领' }} · {{ formatDate(h.created_at) }}
          </span>
        </div>
      </div>
      <div class="hero-actions">
        <button class="crm-btn crm-btn-primary" @click="showSendEmailModal = true">✉️ 发邮件</button>
        <button class="crm-btn crm-btn-outline" @click="quickFollowup">⚡ 快速跟进</button>
        <button v-if="customer.status !== '公海池'" class="crm-btn crm-btn-outline" @click="moveToPool">🌊 移入公海</button>
      </div>
    </div>

    <!-- Contact strip -->
    <div class="crm-card contact-strip">
      <span class="contact-chip">📞 {{ customer.phone || '—' }}</span>
      <a class="contact-chip link" :href="customer.email ? 'mailto:' + customer.email : undefined">✉️ {{ customer.email || '—' }}</a>
      <span class="contact-chip">🟢 {{ customer.whatsapp || '—' }}</span>
      <span class="contact-chip">💬 {{ customer.wechat || '—' }}</span>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button :class="['tab', { active: activeTab === 'inquiry' }]" @click="activeTab='inquiry'">📋 询盘 <b>{{ inquiries.length }}</b></button>
      <button :class="['tab', { active: activeTab === 'quotation' }]" @click="activeTab='quotation'">💰 报价 <b>{{ quotations.length }}</b></button>
      <button :class="['tab', { active: activeTab === 'followup' }]" @click="activeTab='followup'">📝 跟进 <b>{{ followups.length }}</b></button>
    </div>

    <!-- Inquiry Tab -->
    <div v-if="activeTab === 'inquiry'" class="tab-content">
      <div class="crm-between tab-header">
        <h2 class="crm-section-title">询盘记录</h2>
        <button class="crm-btn crm-btn-primary crm-btn-sm" @click="openInquiryModal()">＋ 添加询盘</button>
      </div>
      <div class="timeline" v-if="inquiries.length">
        <div v-for="inq in inquiries" :key="inq.id" class="timeline-item">
          <span class="tl-dot"></span>
          <div class="crm-card tl-card">
            <div class="crm-between">
              <div class="tl-head"><strong>{{ inq.note || '询盘记录' }}</strong><time class="crm-small crm-muted">{{ formatDateTime(inq.inquiry_time) }}</time></div>
              <div class="crm-flex" style="gap:6px">
                <button class="crm-btn crm-btn-outline crm-btn-sm" @click="openCombinedPreview(inq, 'inquiry')">预览</button>
                <button class="crm-btn crm-btn-outline crm-btn-sm" @click="openInquiryModal(inq)">编辑</button>
                <button class="crm-btn crm-btn-danger crm-btn-sm" @click="deleteInquiry(inq)">删除</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="crm-empty" v-else><span class="crm-empty-icon">📋</span>暂无询盘记录</div>
    </div>

    <!-- Quotation Tab -->
    <div v-if="activeTab === 'quotation'" class="tab-content">
      <div class="crm-between tab-header">
        <h2 class="crm-section-title">报价记录</h2>
        <button class="crm-btn crm-btn-primary crm-btn-sm" @click="openQuotationModal()">＋ 添加报价</button>
      </div>
      <div class="timeline" v-if="quotations.length">
        <div v-for="qt in quotations" :key="qt.id" class="timeline-item">
          <span class="tl-dot"></span>
          <div class="crm-card tl-card">
            <div class="crm-between">
              <div class="tl-head">
                <strong>{{ qt.note || '报价记录' }}</strong><time class="crm-small crm-muted">{{ formatDateTime(qt.quotation_time) }}</time>
                <div v-if="qt.price_rows?.length" class="crm-flex" style="gap:5px;flex-wrap:wrap;margin-top:4px">
                  <span v-for="(r, i) in qt.price_rows.slice(0,3)" :key="i" class="crm-pill">CFR {{ r.cfr || '—' }}</span>
                </div>
              </div>
              <div class="crm-flex" style="gap:6px">
                <button class="crm-btn crm-btn-outline crm-btn-sm" @click="openCombinedPreview(qt, 'quotation')">预览</button>
                <button class="crm-btn crm-btn-outline crm-btn-sm" @click="openQuotationModal(qt)">编辑</button>
                <button class="crm-btn crm-btn-danger crm-btn-sm" @click="deleteQuotation(qt)">删除</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="crm-empty" v-else><span class="crm-empty-icon">💰</span>暂无报价记录</div>
    </div>

    <!-- Followup Tab -->
    <div v-if="activeTab === 'followup'" class="tab-content">
      <div class="crm-between tab-header">
        <h2 class="crm-section-title">跟进记录</h2>
        <button class="crm-btn crm-btn-primary crm-btn-sm" @click="openFollowupModal()">＋ 添加跟进</button>
      </div>
      <div class="timeline" v-if="followups.length">
        <div v-for="f in followups" :key="f.id" class="timeline-item">
          <span class="tl-dot"></span>
          <div class="crm-card tl-card">
            <div class="crm-between">
              <div class="tl-head"><strong>{{ f.user_name || '跟进' }}</strong><time class="crm-small crm-muted">{{ formatDateTime(f.created_at) }}</time></div>
              <div class="crm-flex" style="gap:6px">
                <button class="crm-btn crm-btn-outline crm-btn-sm" @click="previewFollowup = f">预览</button>
                <button class="crm-btn crm-btn-outline crm-btn-sm" @click="openFollowupModal(f)">编辑</button>
                <button class="crm-btn crm-btn-danger crm-btn-sm" @click="deleteFollowup(f)">删除</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="crm-empty" v-else><span class="crm-empty-icon">📝</span>暂无跟进记录</div>
    </div>

    <!-- ═══ Send Email Modal ═══ -->
    <div v-if="showSendEmailModal" class="crm-modal-overlay" @click.self="showSendEmailModal = false">
      <div class="crm-modal">
        <div class="crm-modal-head">
          <h3>✉️ 发送邮件给 {{ customer.name }}</h3>
          <button class="crm-modal-close" @click="showSendEmailModal = false">&times;</button>
        </div>
        <div class="crm-modal-body">
          <div class="crm-field">
            <label>收件人</label>
            <input class="crm-input" :value="customer.email" disabled />
          </div>
          <div class="crm-field">
            <label>邮件主题</label>
            <input class="crm-input" v-model="sendEmailForm.subject" placeholder="邮件主题" />
          </div>
          <div class="crm-field">
            <label>邮件正文（HTML）</label>
            <textarea class="crm-textarea" v-model="sendEmailForm.html_body" rows="8" placeholder="支持 HTML"></textarea>
          </div>
        </div>
        <div class="crm-modal-foot">
          <button class="crm-btn crm-btn-outline" @click="showSendEmailModal = false">取消</button>
          <button class="crm-btn crm-btn-primary" :disabled="sendingEmail" @click="sendEmailNow">{{ sendingEmail ? '发送中…' : '发送' }}</button>
        </div>
      </div>
    </div>

    <!-- ═══ Combined Preview Modal ═══ -->
    <div v-if="showCombinedPreview" class="crm-modal-overlay" @click.self="showCombinedPreview = false">
      <div class="crm-modal" style="width:1000px">
        <div class="crm-modal-head">
          <h3>👁️ {{ combinedPreviewType === 'inquiry' ? '询盘' : '报价' }}预览</h3>
          <button class="crm-modal-close" @click="showCombinedPreview = false">&times;</button>
        </div>
        <div class="crm-modal-body">
          <div :class="['preview-split', { 'single-view': !hasMatchingPair }]">
            <div v-if="combinedInquiry" class="preview-panel">
              <h4>📋 询盘内容</h4>
              <div class="preview-meta">{{ combinedInquiry.note }} · {{ formatDateTime(combinedInquiry.inquiry_time) }}</div>
              <div class="preview-html" v-html="sanitizeRichHtml(combinedInquiry.content_html)"></div>
              <div v-if="combinedInquiry.images?.length" class="preview-attach">
                <h5>📷 图片</h5>
                <div class="img-grid">
                  <div v-for="(img, i) in combinedInquiry.images" :key="i" class="img-thumb" @click="previewImg = img">
                    <img :src="img" />
                  </div>
                </div>
              </div>
              <div v-if="combinedInquiry.files?.length" class="preview-attach">
                <h5>📎 附件</h5>
                <div v-for="(f, i) in combinedInquiry.files" :key="i" class="file-item">
                  <a :href="f.url || f" target="_blank" download>📎 {{ f.name || '文件' }}</a>
                </div>
              </div>
            </div>
            <div v-if="combinedQuotation" class="preview-panel">
              <h4>💰 报价内容</h4>
              <div class="preview-meta">{{ combinedQuotation.note }} · {{ formatDateTime(combinedQuotation.quotation_time) }}</div>
              <div class="preview-html" v-html="sanitizeRichHtml(combinedQuotation.content_html)"></div>
              <div v-if="combinedQuotation.price_rows?.length" class="preview-price">
                <table class="price-table">
                  <thead><tr><th>FOB</th><th>港杂费</th><th>汇率</th><th>利润率</th><th>运费</th><th>CFR</th></tr></thead>
                  <tbody>
                    <tr v-for="(r, i) in combinedQuotation.price_rows" :key="i">
                      <td>{{ r.fob || '—' }}</td><td>{{ r.port_charge || '—' }}</td>
                      <td>{{ r.exchange_rate || '—' }}</td><td>{{ r.profit_rate || '—' }}</td>
                      <td>{{ r.freight || '—' }}</td><td class="cfr-val">{{ r.cfr || '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-if="combinedQuotation.images?.length" class="preview-attach">
                <h5>📷 图片</h5>
                <div class="img-grid">
                  <div v-for="(img, i) in combinedQuotation.images" :key="i" class="img-thumb" @click="previewImg = img">
                    <img :src="img" />
                  </div>
                </div>
              </div>
              <div v-if="combinedQuotation.files?.length" class="preview-attach">
                <h5>📎 附件</h5>
                <div v-for="(f, i) in combinedQuotation.files" :key="i" class="file-item">
                  <a :href="f.url || f" target="_blank" download>📎 {{ f.name || '文件' }}</a>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="crm-modal-foot">
          <button class="crm-btn crm-btn-outline" @click="showCombinedPreview = false">关闭</button>
        </div>
      </div>
    </div>

    <!-- ═══ Followup Preview ═══ -->
    <div v-if="previewFollowup" class="crm-modal-overlay" @click.self="previewFollowup = null">
      <div class="crm-modal">
        <div class="crm-modal-head">
          <h3>📝 跟进预览</h3>
          <button class="crm-modal-close" @click="previewFollowup = null">&times;</button>
        </div>
        <div class="crm-modal-body">
          <div class="preview-meta">{{ previewFollowup.user_name }} · {{ formatDateTime(previewFollowup.created_at) }}</div>
          <div v-if="previewFollowup.note" class="preview-meta" style="margin-top:4px;color:var(--crm-text-2);">📌 {{ previewFollowup.note }}</div>
          <div class="preview-html" v-html="sanitizeRichHtml(previewFollowup.content_html)"></div>
          <div v-if="previewFollowup.images?.length || previewFollowup.attachments?.length" class="preview-attach">
            <h5 v-if="previewFollowup.images?.length">📷 图片</h5>
            <div class="img-grid">
              <div v-for="(img, i) in (previewFollowup.images||[])" :key="i" class="img-thumb" @click="previewImg = img">
                <img :src="img" />
              </div>
            </div>
            <h5 v-if="previewFollowup.attachments?.length" style="margin-top:12px">📎 附件</h5>
            <div v-for="(f, i) in (previewFollowup.attachments||[])" :key="'f'+i" class="file-item">
              <a :href="f.url" target="_blank">📎 {{ f.name }}</a>
            </div>
          </div>
        </div>
        <div class="crm-modal-foot">
          <button class="crm-btn crm-btn-outline" @click="previewFollowup = null">关闭</button>
        </div>
      </div>
    </div>

    <!-- ═══ Image Preview Overlay ═══ -->
    <div v-if="previewImg" class="img-overlay" :class="{ pinned: imgPinned }" @click="!imgPinned && (previewImg = null)">
      <img :src="previewImg" @click.stop />
      <div class="img-overlay-toolbar">
        <button class="img-toolbar-btn" @click.stop="imgPinned = !imgPinned">{{ imgPinned ? '📌 取消置顶' : '📌 置顶' }}</button>
        <button class="img-toolbar-btn" @click.stop="previewImg = null; imgPinned = false">✕ 关闭</button>
      </div>
    </div>

    <!-- ═══ Inquiry Modal ═══ -->
    <div v-if="showInquiryModal" class="crm-modal-overlay" @click.self="showInquiryModal = false">
      <div class="crm-modal" style="width:820px">
        <div class="crm-modal-head">
          <h3>{{ editInquiryId ? '编辑询盘' : '添加询盘' }}</h3>
          <button class="crm-modal-close" @click="showInquiryModal = false">&times;</button>
        </div>
        <div class="crm-modal-body">
          <div class="form-row2">
            <div class="crm-field">
              <label>备注</label>
              <input class="crm-input" v-model="inqForm.note" placeholder="例如：20260316巴西xxx客户镀铝锌钢卷询盘" />
            </div>
            <div class="crm-field">
              <label>询盘时间</label>
              <input class="crm-input" v-model="inqForm.inquiry_time" type="datetime-local" />
            </div>
          </div>
          <div class="crm-field">
            <label>询盘内容（支持粘贴Excel表格、富文本、图片）</label>
            <div ref="inqEditorRef" class="rich-editor" contenteditable="true" @paste="handlePaste($event)" v-html="sanitizeRichHtml(inqForm.content_html)"></div>
          </div>
          <div class="crm-field">
            <label>上传图片</label>
            <input type="file" accept="image/*" multiple @change="uploadFiles($event, inqForm.images, 'image')" />
            <div class="img-grid">
              <div v-for="(img, i) in inqForm.images" :key="i" class="img-thumb" @click="previewImg = img">
                <img :src="img" />
                <button class="img-del" @click.stop="inqForm.images.splice(i,1)">×</button>
              </div>
            </div>
          </div>
          <div class="crm-field">
            <label>上传附件</label>
            <input type="file" multiple @change="uploadFiles($event, inqForm.files, 'file')" />
            <div v-for="(f, i) in inqForm.files" :key="i" class="file-item">
              <a :href="f.url" target="_blank">📎 {{ f.name }}</a>
              <button class="crm-btn crm-btn-danger crm-btn-sm" @click="inqForm.files.splice(i,1)">删除</button>
            </div>
          </div>
        </div>
        <div class="crm-modal-foot">
          <button class="crm-btn crm-btn-outline" @click="showInquiryModal = false">取消</button>
          <button class="crm-btn crm-btn-primary" @click="saveInquiry">保存</button>
        </div>
      </div>
    </div>

    <!-- ═══ Quotation Modal ═══ -->
    <div v-if="showQuotationModal" class="crm-modal-overlay" @click.self="showQuotationModal = false">
      <div class="crm-modal" style="width:1100px">
        <div class="crm-modal-head">
          <h3>{{ editQuotationId ? '编辑报价' : '添加报价' }}</h3>
          <button class="crm-modal-close" @click="showQuotationModal = false">&times;</button>
        </div>
        <div class="crm-modal-body">
          <div class="quotation-layout">
            <div class="quot-left">
              <!-- Inquiry reference -->
              <div v-if="inquiries.length" class="inquiry-ref">
                <div class="ref-header">
                  <h4>📋 询盘参考</h4>
                  <select v-model="refInquiryIdx" class="crm-select">
                    <option v-for="(inq, i) in inquiries" :key="inq.id" :value="i">{{ inq.note || `询盘 ${i+1}` }} - {{ formatDateTime(inq.inquiry_time) }}</option>
                  </select>
                </div>
                <div class="ref-content" v-html="sanitizeRichHtml(inquiries[refInquiryIdx]?.content_html)"></div>
              </div>
              <div class="form-row2">
                <div class="crm-field"><label>备注</label><input class="crm-input" v-model="qtForm.note" placeholder="报价备注…" /></div>
                <div class="crm-field"><label>报价时间</label><input class="crm-input" v-model="qtForm.quotation_time" type="datetime-local" /></div>
              </div>
              <div class="crm-field">
                <label>报价内容（支持粘贴Excel表格、图片）</label>
                <div ref="qtEditorRef" class="rich-editor" contenteditable="true" @paste="handlePaste($event)" v-html="sanitizeRichHtml(qtForm.content_html)"></div>
              </div>
              <div class="crm-field">
                <label>报价图片</label>
                <input type="file" accept="image/*" multiple @change="uploadFiles($event, qtForm.images, 'image')" />
                <div class="img-grid">
                  <div v-for="(img, i) in qtForm.images" :key="i" class="img-thumb" @click="previewImg = img">
                    <img :src="img" />
                    <button class="img-del" @click.stop="qtForm.images.splice(i,1)">×</button>
                  </div>
                </div>
              </div>
              <div class="crm-field">
                <label>附件文件</label>
                <input type="file" multiple @change="uploadFiles($event, qtForm.files, 'file')" />
                <div v-for="(f, i) in qtForm.files" :key="i" class="file-item">
                  <a :href="f.url" target="_blank">📎 {{ f.name }}</a>
                  <button class="crm-btn crm-btn-danger crm-btn-sm" @click="qtForm.files.splice(i,1)">删除</button>
                </div>
              </div>
            </div>
            <!-- Right: price calculator -->
            <div class="quot-right">
              <h4>运费信息</h4>
              <div class="crm-field">
                <label>运输方式</label>
                <select class="crm-select" v-model="qtForm.freight_type"><option value="container">集装箱</option><option value="bulk">散货</option></select>
              </div>
              <div v-for="(p, i) in qtForm.ports" :key="i" class="port-row">
                <input class="crm-input" v-model="p.name" placeholder="港口名称" />
                <input class="crm-input" v-model.number="p.freight" placeholder="运费" type="number" step="0.01" />
                <button class="crm-btn crm-btn-danger crm-btn-sm" @click="qtForm.ports.splice(i,1)">×</button>
              </div>
              <button class="crm-btn crm-btn-outline crm-btn-sm" @click="qtForm.ports.push({ name: '', freight: 0 })">＋ 添加港口</button>

              <h4 style="margin-top:20px">价格计算</h4>
              <!-- FOB Search -->
              <div class="fob-search-bar">
                <input class="crm-input" v-model="fobSearchQuery" type="text" placeholder="🔍 搜索FOB价格…" @input="searchFOB" />
              </div>
              <div v-if="fobSearchResults.length" class="fob-search-results">
                <div class="fob-result-header">搜索结果 ({{ fobSearchResults.length }})</div>
                <div v-for="r in fobSearchResults" :key="r.idx" class="fob-result-row">
                  <span>行 {{ r.idx + 1 }}: FOB <strong>{{ r.fob }}</strong></span>
                  <span>CFR <strong class="cfr-val">{{ r.cfr || '—' }}</strong></span>
                </div>
              </div>

              <div class="price-calc-header">
                <span></span><span>FOB</span><span>港杂费</span><span>汇率</span><span>利润率</span><span>运费</span><span>CFR</span><span></span>
              </div>
              <div v-for="(r, i) in qtForm.price_rows" :key="i" class="price-calc-row">
                <span class="row-num">{{ i + 1 }}</span>
                <input :ref="el => { if(el) fobRefs[i] = el }" v-model.number="r.fob" type="number" step="0.01" @input="calcCFR(r)" @keydown.enter.prevent="focusNextFob(i)" placeholder="FOB" />
                <div class="cell-wrap"><input v-model.number="r.port_charge" type="number" step="0.01" @input="calcCFR(r)" placeholder="港杂费" /><button v-if="i < qtForm.price_rows.length - 1" class="cell-fill" @click="fillDown(i,'port_charge')" title="向下填充">⬇</button></div>
                <div class="cell-wrap"><input v-model.number="r.exchange_rate" type="number" step="0.0001" @input="calcCFR(r)" placeholder="汇率" /><button v-if="i < qtForm.price_rows.length - 1" class="cell-fill" @click="fillDown(i,'exchange_rate')" title="向下填充">⬇</button></div>
                <div class="cell-wrap"><input v-model.number="r.profit_rate" type="number" step="0.01" @input="calcCFR(r)" placeholder="利润率" /><button v-if="i < qtForm.price_rows.length - 1" class="cell-fill" @click="fillDown(i,'profit_rate')" title="向下填充">⬇</button></div>
                <div class="cell-wrap"><input v-model.number="r.freight" type="number" step="0.01" @input="calcCFR(r)" placeholder="运费" /><button v-if="i < qtForm.price_rows.length - 1" class="cell-fill" @click="fillDown(i,'freight')" title="向下填充">⬇</button></div>
                <input v-model="r.cfr" readonly class="cfr-input" placeholder="CFR" />
                <button v-if="i > 0" class="fill-down-btn del" @click="qtForm.price_rows.splice(i,1)">×</button>
              </div>
              <div class="price-row-actions">
                <button class="crm-btn crm-btn-outline crm-btn-sm" @click="addPriceRow">＋ 添加行</button>
                <button class="crm-btn crm-btn-outline crm-btn-sm" @click="fillAllRows">📋 全部填充</button>
              </div>
            </div>
          </div>
        </div>
        <div class="crm-modal-foot">
          <button class="crm-btn crm-btn-outline" @click="showQuotationModal = false">取消</button>
          <button class="crm-btn crm-btn-primary" @click="saveQuotation">保存</button>
        </div>
      </div>
    </div>

    <!-- ═══ Followup Modal ═══ -->
    <div v-if="showFollowupModal" class="crm-modal-overlay" @click.self="showFollowupModal = false">
      <div class="crm-modal">
        <div class="crm-modal-head">
          <h3>{{ editFollowupId ? '编辑跟进' : '添加跟进' }}</h3>
          <button class="crm-modal-close" @click="showFollowupModal = false">&times;</button>
        </div>
        <div class="crm-modal-body">
          <div class="crm-field"><label>跟进备注</label><input class="crm-input" v-model="followForm.note" placeholder="跟进说明…" /></div>
          <div class="crm-field">
            <label>跟进内容（支持粘贴截图）</label>
            <div ref="followEditorRef" class="rich-editor" contenteditable="true" @paste="handleFollowupPaste($event)" v-html="sanitizeRichHtml(followForm.content_html)"></div>
          </div>
          <div class="crm-field">
            <label>上传图片</label>
            <input type="file" accept="image/*" multiple @change="uploadFiles($event, followForm.images, 'image')" />
            <div class="img-grid">
              <div v-for="(img, i) in followForm.images" :key="i" class="img-thumb" @click="previewImg = img">
                <img :src="img" />
                <button class="img-del" @click.stop="followForm.images.splice(i,1)">×</button>
              </div>
            </div>
          </div>
          <div class="crm-field">
            <label>上传附件</label>
            <input type="file" multiple @change="uploadFiles($event, followForm.attachments, 'file')" />
            <div v-for="(f, i) in followForm.attachments" :key="i" class="file-item">
              <a :href="f.url" target="_blank">📎 {{ f.name }}</a>
              <button class="crm-btn crm-btn-danger crm-btn-sm" @click="followForm.attachments.splice(i,1)">删除</button>
            </div>
          </div>
        </div>
        <div class="crm-modal-foot">
          <button class="crm-btn crm-btn-outline" @click="showFollowupModal = false">取消</button>
          <button class="crm-btn crm-btn-primary" @click="saveFollowup">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import crmApi from '../../api/crm'
import { sanitizeRichHtml } from '../../utils/sanitizeHtml.js'

const route = useRoute()
const customerId = route.params.id
const customer = ref(null)
const inquiries = ref([])
const quotations = ref([])
const followups = ref([])
const activeTab = ref(route.query.tab || 'inquiry')

// Inquiry form
const showInquiryModal = ref(false)
const editInquiryId = ref(null)
const inqEditorRef = ref(null)
const inqForm = reactive({ content_html: '', note: '', inquiry_time: '', images: [], files: [] })

// Quotation form
const showQuotationModal = ref(false)
const editQuotationId = ref(null)
const qtEditorRef = ref(null)
const refInquiryIdx = ref(0)
const fobRefs = {}
const qtForm = reactive({
  content_html: '', note: '', freight_type: 'container', quotation_time: '',
  ports: [{ name: '', freight: 0 }],
  price_rows: [{ fob: 0, port_charge: 0, exchange_rate: 7.2, profit_rate: 1.05, freight: 0, cfr: '' }],
  files: [], images: []
})

// FOB search
const fobSearchQuery = ref('')
const fobSearchResults = ref([])

// Followup form
const showFollowupModal = ref(false)
const editFollowupId = ref(null)
const followEditorRef = ref(null)
const followForm = reactive({ content_html: '', note: '', images: [], attachments: [] })

// Combined preview
const showCombinedPreview = ref(false)
const combinedPreviewType = ref('')
const combinedInquiry = ref(null)
const combinedQuotation = ref(null)
const hasMatchingPair = computed(() => combinedInquiry.value && combinedQuotation.value)

// Followup preview & image preview
const previewFollowup = ref(null)
const previewImg = ref(null)
const imgPinned = ref(false)

function nowLocal() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

async function loadData() {
  try {
    customer.value = await crmApi.getCustomer(customerId)
    inquiries.value = await crmApi.getInquiries(customerId)
    quotations.value = await crmApi.getQuotations(customerId)
    followups.value = await crmApi.getFollowups(customerId)
  } catch (e) { console.error(e) }
}

// ─── Combined Preview ───────────────────────────────────────────────────────────
function openCombinedPreview(record, type) {
  combinedPreviewType.value = type
  if (type === 'inquiry') {
    combinedInquiry.value = record
    combinedQuotation.value = quotations.value.length ? quotations.value[0] : null
  } else {
    combinedQuotation.value = record
    combinedInquiry.value = inquiries.value.length ? inquiries.value[0] : null
  }
  showCombinedPreview.value = true
}

// ─── Unified upload ─────────────────────────────────────────────────────────────
async function uploadFiles(e, targetArray, type) {
  for (const f of Array.from(e.target.files || [])) {
    try {
      const res = await crmApi.upload(f)
      if (type === 'image') targetArray.push(res.url)
      else targetArray.push({ name: f.name, url: res.url })
    } catch (err) { alert('上传失败: ' + err.message) }
  }
}

// ─── Inquiry CRUD ───────────────────────────────────────────────────────────────
function openInquiryModal(inq) {
  editInquiryId.value = inq?.id || null
  inqForm.content_html = inq?.content_html || ''
  inqForm.note = inq?.note || ''
  inqForm.inquiry_time = inq?.inquiry_time ? inq.inquiry_time.replace(' ', 'T').slice(0, 16) : nowLocal()
  inqForm.images = inq?.images ? [...inq.images] : []
  inqForm.files = inq?.files ? [...inq.files] : []
  showInquiryModal.value = true
}

async function saveInquiry() {
  const data = {
    content_html: inqEditorRef.value?.innerHTML || inqForm.content_html,
    note: inqForm.note,
    inquiry_time: inqForm.inquiry_time,
    images: JSON.parse(JSON.stringify(inqForm.images)),
    files: JSON.parse(JSON.stringify(inqForm.files))
  }
  try {
    if (editInquiryId.value) await crmApi.updateInquiry(editInquiryId.value, data)
    else await crmApi.createInquiry(customerId, data)
    showInquiryModal.value = false; loadData()
  } catch (e) { alert(e.message) }
}

async function deleteInquiry(inq) { if (confirm('确定删除？')) { await crmApi.deleteInquiry(inq.id); loadData() } }

// ─── Quotation CRUD ─────────────────────────────────────────────────────────────
function openQuotationModal(qt) {
  editQuotationId.value = qt?.id || null
  qtForm.content_html = qt?.content_html || ''
  qtForm.note = qt?.note || ''
  qtForm.freight_type = qt?.freight_type || 'container'
  qtForm.quotation_time = qt?.quotation_time ? qt.quotation_time.replace(' ', 'T').slice(0, 16) : nowLocal()
  qtForm.ports = qt?.ports?.length ? qt.ports.map(p => ({...p})) : [{ name: '', freight: 0 }]
  qtForm.price_rows = qt?.price_rows?.length ? qt.price_rows.map(r => ({...r})) : [{ fob: 0, port_charge: 0, exchange_rate: 7.2, profit_rate: 1.05, freight: 0, cfr: '' }]
  qtForm.files = qt?.files ? [...qt.files] : []
  qtForm.images = qt?.images ? [...qt.images] : []
  refInquiryIdx.value = 0
  fobSearchQuery.value = ''
  fobSearchResults.value = []
  showQuotationModal.value = true
}

function calcCFR(r) {
  if (r.fob && r.exchange_rate && r.profit_rate) {
    r.cfr = (((r.fob + (r.port_charge || 0)) / r.exchange_rate) * r.profit_rate + (r.freight || 0)).toFixed(2)
  } else { r.cfr = '' }
}

function addPriceRow() {
  const last = qtForm.price_rows[qtForm.price_rows.length - 1] || {}
  qtForm.price_rows.push({
    fob: 0, port_charge: last.port_charge || 0, exchange_rate: last.exchange_rate || 7.2,
    profit_rate: last.profit_rate || 1.05, freight: last.freight || 0, cfr: ''
  })
  nextTick(() => { const ref = fobRefs[qtForm.price_rows.length - 1]; if (ref) ref.focus() })
}

function focusNextFob(currentIdx) {
  if (currentIdx >= qtForm.price_rows.length - 1) addPriceRow()
  else nextTick(() => { const ref = fobRefs[currentIdx + 1]; if (ref) ref.focus() })
}

function fillDown(fromIdx, field) {
  const val = qtForm.price_rows[fromIdx]?.[field]
  if (val === undefined) return
  for (let i = fromIdx + 1; i < qtForm.price_rows.length; i++) {
    qtForm.price_rows[i][field] = val
    calcCFR(qtForm.price_rows[i])
  }
}

function fillAllRows() {
  if (qtForm.price_rows.length < 2) return
  const f = qtForm.price_rows[0]
  for (let i = 1; i < qtForm.price_rows.length; i++) {
    qtForm.price_rows[i].port_charge = f.port_charge
    qtForm.price_rows[i].exchange_rate = f.exchange_rate
    qtForm.price_rows[i].profit_rate = f.profit_rate
    qtForm.price_rows[i].freight = f.freight
    calcCFR(qtForm.price_rows[i])
  }
}

function searchFOB() {
  const q = parseFloat(fobSearchQuery.value)
  if (isNaN(q)) { fobSearchResults.value = []; return }
  fobSearchResults.value = qtForm.price_rows
    .map((r, i) => ({ ...r, idx: i }))
    .filter(r => r.fob && Math.abs(r.fob - q) < 0.01)
}

async function saveQuotation() {
  const data = {
    content_html: qtEditorRef.value?.innerHTML || qtForm.content_html,
    note: qtForm.note,
    freight_type: qtForm.freight_type,
    quotation_time: qtForm.quotation_time,
    ports: JSON.parse(JSON.stringify(qtForm.ports)),
    price_rows: JSON.parse(JSON.stringify(qtForm.price_rows)),
    files: JSON.parse(JSON.stringify(qtForm.files)),
    images: JSON.parse(JSON.stringify(qtForm.images))
  }
  try {
    if (editQuotationId.value) await crmApi.updateQuotation(editQuotationId.value, data)
    else await crmApi.createQuotation(customerId, data)
    showQuotationModal.value = false; loadData()
  } catch (e) { alert(e.message) }
}

async function deleteQuotation(qt) { if (confirm('确定删除？')) { await crmApi.deleteQuotation(qt.id); loadData() } }

// ─── Followup CRUD ──────────────────────────────────────────────────────────────
function openFollowupModal(f) {
  editFollowupId.value = f?.id || null
  followForm.content_html = f?.content_html || ''
  followForm.note = f?.note || ''
  followForm.images = f?.images ? [...f.images] : []
  followForm.attachments = f?.attachments ? [...f.attachments] : []
  showFollowupModal.value = true
}

async function saveFollowup() {
  const data = {
    content_html: followEditorRef.value?.innerHTML || followForm.content_html,
    note: followForm.note,
    images: JSON.parse(JSON.stringify(followForm.images)),
    attachments: JSON.parse(JSON.stringify(followForm.attachments))
  }
  try {
    if (editFollowupId.value) await crmApi.updateFollowup(editFollowupId.value, data)
    else await crmApi.createFollowup(customerId, data)
    showFollowupModal.value = false; loadData()
  } catch (e) { alert(e.message) }
}

async function deleteFollowup(f) { if (confirm('确定删除？')) { await crmApi.deleteFollowup(f.id); loadData() } }

// ─── Followup paste handler (images → both editor + gallery) ─────────────────
async function handleFollowupPaste(e) {
  const items = e.clipboardData?.items
  if (!items) return
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault()
      try {
        const res = await crmApi.upload(item.getAsFile())
        // Add to inline editor
        document.execCommand('insertHTML', false, `<img src="${res.url}" style="max-width:100%;height:auto;" />`)
        // Also add to images gallery
        followForm.images.push(res.url)
      } catch (err) { console.error(err) }
      return
    }
  }
  // For non-image paste, handle as HTML (tables, text)
  const htmlData = e.clipboardData.getData('text/html')
  if (htmlData) {
    e.preventDefault()
    let clean = htmlData.replace(/<meta[^>]*>/gi, '').replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<xml[^>]*>[\s\S]*?<\/xml>/gi, '').replace(/<!--[\s\S]*?-->/g, '').replace(/class="[^"]*"/gi, '')
    clean = clean.replace(/<table/gi, '<table style="border-collapse:collapse;width:100%"')
    clean = clean.replace(/<td(?=[> ])/gi, '<td style="border:1px solid #ddd;padding:4px 8px"')
    clean = clean.replace(/<th(?=[> ])/gi, '<th style="border:1px solid #ddd;padding:4px 8px;background:#f8fafc"')
    document.execCommand('insertHTML', false, clean)
  }
}

// ─── Paste handler ──────────────────────────────────────────────────────────────
async function handlePaste(e) {
  const items = e.clipboardData?.items
  if (!items) return
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault()
      try {
        const res = await crmApi.upload(item.getAsFile())
        document.execCommand('insertHTML', false, `<img src="${res.url}" style="max-width:100%;height:auto;" />`)
      } catch (err) { console.error(err) }
      return
    }
  }
  const htmlData = e.clipboardData.getData('text/html')
  if (htmlData) {
    e.preventDefault()
    let clean = htmlData.replace(/<meta[^>]*>/gi, '').replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<xml[^>]*>[\s\S]*?<\/xml>/gi, '').replace(/<!--[\s\S]*?-->/g, '').replace(/class="[^"]*"/gi, '')
    clean = clean.replace(/<table/gi, '<table style="border-collapse:collapse;width:100%"')
    clean = clean.replace(/<td(?=[> ])/gi, '<td style="border:1px solid #ddd;padding:4px 8px"')
    clean = clean.replace(/<th(?=[> ])/gi, '<th style="border:1px solid #ddd;padding:4px 8px;background:#f8fafc"')
    document.execCommand('insertHTML', false, clean)
  }
}

function getStatusClass(s) { return { '开发中': 'status-dev', '联系中': 'status-contact', '已成交': 'status-closed', '公海池': 'status-pool' }[s] || '' }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('zh-CN') : '-' }
function formatDateTime(d) { return d ? new Date(d).toLocaleString('zh-CN') : '-' }
onMounted(loadData)

// ── Redesign additions (presentation-level; existing endpoints only) ──
const backPath = computed(() => (route.path.startsWith('/crm/sub') ? '/crm/sub' : '/crm') + '/customers')

const AVATAR_COLORS = ['#1e40af', '#0e7490', '#7c3aed', '#b45309', '#047857', '#be185d']
const avatarColor = AVATAR_COLORS[(String(customer.value?.id || 0)) % AVATAR_COLORS.length]
function statusBadge(status) {
  const map = { '开发中': 'crm-badge-dev', '联系中': 'crm-badge-contact', '已成交': 'crm-badge-closed', '公海池': 'crm-badge-pool' }
  return map[status] || 'crm-badge-pool'
}

const showSendEmailModal = ref(false)
const sendingEmail = ref(false)
const sendEmailForm = reactive({ subject: '', html_body: '' })

async function sendEmailNow() {
  if (sendingEmail.value) return
  sendingEmail.value = true
  try {
    await crmApi.request('/customers/email/send', {
      method: 'POST',
      body: JSON.stringify({
        customer_ids: [customerId],
        subject: sendEmailForm.subject,
        html_body: sendEmailForm.html_body
      })
    })
    alert('✅ 邮件已发送')
    showSendEmailModal.value = false
    sendEmailForm.subject = ''
    sendEmailForm.html_body = ''
  } catch (e) { alert('发送失败: ' + e.message) }
  finally { sendingEmail.value = false }
}

async function quickFollowup() {
  try {
    await crmApi.request('/customers/email/quick-followup', {
      method: 'POST',
      body: JSON.stringify({ customer_id: Number(customerId) })
    })
    alert('✅ 已使用默认跟进模板发送')
  } catch (e) { alert('跟进失败: ' + e.message) }
}

async function moveToPool() {
  if (!confirm(`确认将客户「${customer.value.name}」移入公海池？`)) return
  try {
    await crmApi.moveToPool(customer.value.id)
    await loadData()
  } catch (e) { alert(e.message) }
}

</script>
<style scoped>
.detail-topbar { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.hero-card { display: flex; gap: 18px; align-items: flex-start; flex-wrap: wrap; margin-bottom: 14px; }
.hero-avatar { width: 58px; height: 58px; font-size: 22px; }
.hero-main { flex: 1; min-width: 240px; }
.hero-name-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.hero-name { margin: 0; font-size: 20px; font-weight: 800; }
.hero-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
.hero-meta { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 8px; font-size: 12.5px; color: var(--crm-text-2); }
.hero-note {
  margin-top: 8px; padding: 8px 12px; border-radius: var(--crm-radius-sm);
  background: var(--crm-bg); color: var(--crm-text-2); font-size: 12.5px;
}
.claim-history { margin-top: 8px; display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.claim-history .crm-pill { font-size: 10.5px; }
.claim-history .pool-blue { background: var(--crm-primary-soft); color: var(--crm-primary); }
.hero-actions { display: flex; flex-direction: column; gap: 8px; min-width: 150px; }
.contact-strip { display: flex; gap: 10px; flex-wrap: wrap; padding: 12px 20px; margin-bottom: 16px; }
.contact-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 14px; border-radius: 999px;
  background: var(--crm-bg); border: 1px solid var(--crm-border);
  font-size: 12.5px; color: var(--crm-text);
  text-decoration: none; max-width: 100%;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.contact-chip.link:hover { border-color: var(--crm-primary); color: var(--crm-primary); }
.tabs { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
.tab {
  padding: 8px 18px; border-radius: 999px; border: 1px solid var(--crm-border);
  background: var(--crm-card); color: var(--crm-text-2);
  font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit;
  transition: all .15s;
}
.tab b { font-weight: 700; color: var(--crm-text-3); }
.tab.active { background: var(--crm-primary); border-color: var(--crm-primary); color: #fff; }
.tab.active b { color: rgba(255,255,255,0.8); }
.tab:hover:not(.active) { border-color: var(--crm-primary); color: var(--crm-primary); }
.tab-header { margin-bottom: 14px; }
.timeline { position: relative; padding-left: 20px; display: flex; flex-direction: column; gap: 10px; }
.timeline::before {
  content: ''; position: absolute; left: 5px; top: 8px; bottom: 8px;
  width: 2px; background: var(--crm-border); border-radius: 2px;
}
.timeline-item { position: relative; }
.tl-dot {
  position: absolute; left: -20px; top: 18px;
  width: 12px; height: 12px; border-radius: 50%;
  background: var(--crm-primary); border: 2.5px solid var(--crm-bg);
  box-shadow: 0 0 0 2px var(--crm-primary-soft);
}
.tl-card { padding: 14px 18px; }
.tl-head { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.tl-head strong { font-size: 13.5px; }
.form-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
.preview-split { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.preview-split.single-view { grid-template-columns: 1fr; }
.preview-panel { border: 1px solid var(--crm-border); border-radius: var(--crm-radius-sm); padding: 14px; min-width: 0; }
.preview-panel h4 { margin: 0 0 8px; font-size: 13.5px; }
.preview-meta { font-size: 12px; color: var(--crm-text-3); margin-bottom: 8px; }
.preview-html { font-size: 13px; overflow-x: auto; }
.preview-html :deep(table) { border-collapse: collapse; max-width: 100%; }
.preview-html :deep(td), .preview-html :deep(th) { border: 1px solid var(--crm-border); padding: 4px 8px; font-size: 12px; }
.preview-attach { margin-top: 12px; }
.preview-attach h5 { margin: 0 0 6px; font-size: 12px; color: var(--crm-text-2); }
.img-grid { display: flex; gap: 8px; flex-wrap: wrap; }
.img-thumb { position: relative; width: 72px; height: 72px; border-radius: 8px; overflow: hidden; cursor: zoom-in; border: 1px solid var(--crm-border); }
.img-thumb img { width: 100%; height: 100%; object-fit: cover; }
.img-del {
  position: absolute; top: 2px; right: 2px;
  width: 18px; height: 18px; border-radius: 50%; border: none;
  background: rgba(220,38,38,0.9); color: #fff; font-size: 11px; line-height: 1;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
}
.file-item { display: flex; align-items: center; gap: 8px; font-size: 12.5px; margin-bottom: 4px; }
.file-item a { color: var(--crm-primary); text-decoration: none; }
.price-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.price-table th, .price-table td { border: 1px solid var(--crm-border); padding: 5px 8px; text-align: center; }
.cfr-val { color: var(--crm-primary); font-weight: 700; }
.img-overlay {
  position: fixed; inset: 0; z-index: 1100;
  background: rgba(15,23,42,0.85);
  display: flex; align-items: center; justify-content: center;
}
.img-overlay img { max-width: 92vw; max-height: 88vh; border-radius: 10px; }
.img-overlay.pinned { background: transparent; pointer-events: none; }
.img-overlay.pinned img { pointer-events: auto; box-shadow: 0 8px 40px rgba(15,23,42,0.4); }
.img-overlay-toolbar {
  position: fixed; top: 16px; right: 16px; display: flex; gap: 8px; z-index: 1101;
}
.img-toolbar-btn {
  padding: 6px 12px; border: none; border-radius: 8px;
  background: rgba(255,255,255,0.92); color: var(--crm-text);
  font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit;
}
.rich-editor {
  min-height: 180px; max-height: 380px; overflow-y: auto;
  border: 1px solid var(--crm-border); border-radius: var(--crm-radius-sm);
  padding: 12px; background: var(--crm-card);
  font-size: 13px; line-height: 1.6;
}
.rich-editor:focus { outline: none; border-color: var(--crm-primary); box-shadow: 0 0 0 3px rgba(30,64,175,.08); }
.rich-editor:deep(img) { max-width: 100%; border-radius: 6px; }
.rich-editor:deep(table) { border-collapse: collapse; }
.rich-editor:deep(td), .rich-editor:deep(th) { border: 1px solid var(--crm-border); padding: 4px 8px; }
.quotation-layout { display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px; }
@media (max-width: 1000px) { .quotation-layout { grid-template-columns: 1fr; } }
.inquiry-ref { border: 1px solid var(--crm-border); border-radius: var(--crm-radius-sm); padding: 10px 12px; margin-bottom: 12px; }
.ref-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
.ref-header h4 { margin: 0; font-size: 13px; }
.ref-content { max-height: 160px; overflow-y: auto; font-size: 12px; border-top: 1px dashed var(--crm-border); padding-top: 8px; }
.quot-right h4 { margin: 0 0 10px; font-size: 13.5px; }
.port-row { display: flex; gap: 6px; margin-bottom: 6px; }
.port-row .crm-input { flex: 1; }
.fob-search-bar { margin-bottom: 8px; }
.fob-search-bar .crm-input { width: 100%; }
.fob-search-results { border: 1px solid var(--crm-border); border-radius: var(--crm-radius-sm); margin-bottom: 10px; max-height: 140px; overflow-y: auto; }
.fob-result-header { padding: 6px 10px; font-size: 11px; font-weight: 700; color: var(--crm-text-3); background: var(--crm-bg); position: sticky; top: 0; }
.fob-result-row { display: flex; justify-content: space-between; gap: 10px; padding: 5px 10px; font-size: 12px; border-top: 1px solid var(--crm-border); }
.price-calc-header {
  display: grid; grid-template-columns: 26px 1fr 1fr 1fr 1fr 1fr 1fr 26px;
  gap: 4px; font-size: 10.5px; font-weight: 700; color: var(--crm-text-3);
  margin-bottom: 4px; text-align: center;
}
.price-calc-row {
  display: grid; grid-template-columns: 26px 1fr 1fr 1fr 1fr 1fr 1fr 26px;
  gap: 4px; align-items: center; margin-bottom: 5px;
}
.price-calc-row .crm-input, .price-calc-row input { height: 30px; padding: 0 7px; font-size: 12px; width: 100%; box-sizing: border-box; }
.row-num { text-align: center; color: var(--crm-text-3); font-size: 11px; }
.cell-wrap { display: flex; align-items: center; gap: 2px; min-width: 0; }
.cell-wrap input { flex: 1; min-width: 0; }
.cell-fill {
  flex: none; border: none; background: transparent; cursor: pointer;
  color: var(--crm-text-3); font-size: 11px; padding: 0 1px;
}
.cell-fill:hover { color: var(--crm-primary); }
.cfr-input { font-weight: 700; color: var(--crm-primary); background: var(--crm-primary-soft) !important; }
.fill-down-btn.del {
  width: 26px; height: 30px; border: none; border-radius: 6px;
  background: transparent; color: var(--crm-danger); cursor: pointer; font-size: 14px;
}
.fill-down-btn.del:hover { background: #fef2f2; }
.price-row-actions { display: flex; gap: 8px; margin-top: 8px; }
</style>