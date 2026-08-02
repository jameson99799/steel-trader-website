<template>
  <div class="customer-detail" v-if="customer">
    <div class="detail-header">
      <button class="btn-back" @click="$router.push(($route.path.startsWith('/crm/sub') ? '/crm/sub' : '/crm') + '/customers')">← 返回</button>
      <h1>{{ customer.name }}</h1>
      <span :class="['status-badge', getStatusClass(customer.status)]">{{ customer.status }}</span>
    </div>

    <!-- Info Card -->
    <div class="info-card">
      <div class="info-grid">
        <div class="info-item"><label>🏢 公司</label><span>{{ customer.company || '-' }}</span></div>
        <div class="info-item"><label>🌍 国家</label><span>{{ customer.country || '-' }}</span></div>
        <div class="info-item"><label>📞 电话</label><span>{{ customer.phone || '-' }}</span></div>
        <div class="info-item"><label>✉️ 邮箱</label><span>{{ customer.email || '-' }}</span></div>
        <div class="info-item"><label><svg viewBox="0 0 24 24" width="14" height="14" fill="#25D366" style="vertical-align:-2px"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.116.553 4.103 1.515 5.834L0 24l6.335-1.652A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.7 9.7 0 01-5.25-1.537l-.375-.225-3.885 1.02 1.035-3.795-.247-.393A9.72 9.72 0 012.25 12 9.75 9.75 0 0112 2.25 9.75 9.75 0 0121.75 12 9.75 9.75 0 0112 21.75z"/></svg> WhatsApp</label><span>{{ customer.whatsapp || '-' }}</span></div>
        <div class="info-item"><label><svg viewBox="0 0 24 24" width="14" height="14" fill="#07C160" style="vertical-align:-2px"><path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.534c0 2.22 1.174 4.205 3.008 5.564l-.757 2.271 2.638-1.355c.88.251 1.825.39 2.802.39.317 0 .629-.018.937-.048a5.9 5.9 0 01-.234-1.634c0-3.526 3.281-6.387 7.33-6.387.32 0 .635.022.945.059C16.145 4.83 12.756 2.188 8.691 2.188zm-3.11 4.497a1.028 1.028 0 110 2.055 1.028 1.028 0 010-2.055zm5.2 0a1.028 1.028 0 110 2.055 1.028 1.028 0 010-2.055zM15.724 8.5c-3.506 0-6.353 2.431-6.353 5.432 0 3.001 2.847 5.432 6.353 5.432.694 0 1.363-.1 1.99-.28L20.1 20.5l-.615-1.843c1.548-1.146 2.539-2.835 2.539-4.724C22.024 10.931 19.23 8.5 15.724 8.5zm-2.669 3.38a.867.867 0 110 1.733.867.867 0 010-1.733zm4.385 0a.867.867 0 110 1.733.867.867 0 010-1.733z"/></svg> 微信</label><span>{{ customer.wechat || '-' }}</span></div>
        <div class="info-item"><label>👤 负责人</label><span>{{ customer.owner_name || '-' }}</span></div>
        <div class="info-item"><label>📅 添加时间</label><span>{{ formatDate(customer.created_at) }}</span></div>
        <div class="info-item"><label>🔄 公海次数</label><span>{{ customer.sea_pool_count || 0 }}</span></div>
      </div>
      <div v-if="customer.note" class="note-row"><label>📝 备注:</label> {{ customer.note }}</div>
      <div v-if="customer.tags?.length" class="tag-row">
        <span v-for="t in customer.tags" :key="t" class="tag-badge">{{ t }}</span>
      </div>
      <div v-if="customer.claim_history?.length" class="claim-history">
        <label>📜 申领历史:</label>
        <span v-for="(h, i) in customer.claim_history" :key="i" class="claim-item">
          <span :class="{ 'pool-blue': h.action === 'auto_pool' }">{{ h.action === 'auto_pool' ? '→公海池' : h.to_name || '申领' }}</span>
          <small>{{ formatDate(h.created_at) }}</small>
        </span>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button :class="['tab', { active: activeTab === 'inquiry' }]" @click="activeTab='inquiry'">📋 询盘 ({{ inquiries.length }})</button>
      <button :class="['tab', { active: activeTab === 'quotation' }]" @click="activeTab='quotation'">💰 报价 ({{ quotations.length }})</button>
      <button :class="['tab', { active: activeTab === 'followup' }]" @click="activeTab='followup'">📝 跟进 ({{ followups.length }})</button>
    </div>

    <!-- Inquiry Tab -->
    <div v-if="activeTab === 'inquiry'" class="tab-content">
      <div class="tab-header">
        <h3>询盘记录</h3>
        <button class="btn btn-primary" @click="openInquiryModal()">➕ 添加询盘</button>
      </div>
      <div v-for="inq in inquiries" :key="inq.id" class="record-row">
        <div class="record-left">
          <div class="record-note">{{ inq.note || '询盘记录' }}</div>
          <div class="record-time">{{ formatDateTime(inq.inquiry_time) }}</div>
        </div>
        <div class="record-right">
          <button class="btn-sm btn-view" @click="openCombinedPreview(inq, 'inquiry')">预览</button>
          <button class="btn-sm btn-edit" @click="openInquiryModal(inq)">编辑</button>
          <button class="btn-sm btn-danger" @click="deleteInquiry(inq)">删除</button>
        </div>
      </div>
      <p v-if="!inquiries.length" class="empty">暂无询盘记录</p>
    </div>

    <!-- Quotation Tab -->
    <div v-if="activeTab === 'quotation'" class="tab-content">
      <div class="tab-header">
        <h3>报价记录</h3>
        <button class="btn btn-primary" @click="openQuotationModal()">➕ 添加报价</button>
      </div>
      <div v-for="qt in quotations" :key="qt.id" class="record-row">
        <div class="record-left">
          <div class="record-note">{{ qt.note || '报价记录' }}</div>
          <div class="record-time">{{ formatDateTime(qt.quotation_time) }}</div>
          <div v-if="qt.price_rows?.length" class="record-cfr">
            <span v-for="(r, i) in qt.price_rows.slice(0,3)" :key="i" class="cfr-chip">CFR {{ r.cfr || '-' }}</span>
          </div>
        </div>
        <div class="record-right">
          <button class="btn-sm btn-view" @click="openCombinedPreview(qt, 'quotation')">预览</button>
          <button class="btn-sm btn-edit" @click="openQuotationModal(qt)">编辑</button>
          <button class="btn-sm btn-danger" @click="deleteQuotation(qt)">删除</button>
        </div>
      </div>
      <p v-if="!quotations.length" class="empty">暂无报价记录</p>
    </div>

    <!-- Followup Tab -->
    <div v-if="activeTab === 'followup'" class="tab-content">
      <div class="tab-header">
        <h3>跟进记录</h3>
        <button class="btn btn-primary" @click="openFollowupModal()">➕ 添加跟进</button>
      </div>
      <div v-for="f in followups" :key="f.id" class="record-row">
        <div class="record-left">
          <div class="record-note">{{ f.user_name || '跟进' }} · {{ formatDateTime(f.created_at) }}</div>
        </div>
        <div class="record-right">
          <button class="btn-sm btn-view" @click="previewFollowup = f">预览</button>
          <button class="btn-sm btn-edit" @click="openFollowupModal(f)">编辑</button>
          <button class="btn-sm btn-danger" @click="deleteFollowup(f)">删除</button>
        </div>
      </div>
      <p v-if="!followups.length" class="empty">暂无跟进记录</p>
    </div>

    <!-- ═══ Combined Preview Modal ═══ -->
    <div v-if="showCombinedPreview" class="modal-overlay">
      <div class="modal modal-xl">
        <div class="modal-header">
          <h3>👁️ {{ combinedPreviewType === 'inquiry' ? '询盘' : '报价' }}预览</h3>
          <button class="modal-close" @click="showCombinedPreview = false">&times;</button>
        </div>
        <div class="modal-body">
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
                      <td>{{ r.fob || '-' }}</td><td>{{ r.port_charge || '-' }}</td>
                      <td>{{ r.exchange_rate || '-' }}</td><td>{{ r.profit_rate || '-' }}</td>
                      <td>{{ r.freight || '-' }}</td><td class="cfr-val">{{ r.cfr || '-' }}</td>
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
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showCombinedPreview = false">关闭</button>
        </div>
      </div>
    </div>

    <!-- ═══ Followup Preview ═══ -->
    <div v-if="previewFollowup" class="modal-overlay">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3>📝 跟进预览</h3>
          <button class="modal-close" @click="previewFollowup = null">&times;</button>
        </div>
        <div class="modal-body">
          <div class="preview-meta">{{ previewFollowup.user_name }} · {{ formatDateTime(previewFollowup.created_at) }}</div>
          <div v-if="previewFollowup.note" class="preview-meta" style="margin-top:4px;color:#475569;">📌 {{ previewFollowup.note }}</div>
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
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="previewFollowup = null">关闭</button>
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
    <div v-if="showInquiryModal" class="modal-overlay">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3>{{ editInquiryId ? '编辑询盘' : '添加询盘' }}</h3>
          <button class="modal-close" @click="showInquiryModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-row2">
            <div class="form-group">
              <label>备注</label>
              <input v-model="inqForm.note" placeholder="例如：20260316巴西xxx客户镀铝锌钢卷询盘" />
            </div>
            <div class="form-group">
              <label>询盘时间</label>
              <input v-model="inqForm.inquiry_time" type="datetime-local" />
            </div>
          </div>
          <div class="form-group">
            <label>询盘内容（支持粘贴Excel表格、富文本、图片）</label>
            <div ref="inqEditorRef" class="rich-editor" contenteditable="true" @paste="handlePaste($event)" v-html="sanitizeRichHtml(inqForm.content_html)"></div>
          </div>
          <div class="form-group">
            <label>上传图片</label>
            <input type="file" accept="image/*" multiple @change="uploadFiles($event, inqForm.images, 'image')" />
            <div class="img-grid">
              <div v-for="(img, i) in inqForm.images" :key="i" class="img-thumb" @click="previewImg = img">
                <img :src="img" />
                <button class="img-del" @click.stop="inqForm.images.splice(i,1)">×</button>
              </div>
            </div>
          </div>
          <div class="form-group">
            <label>上传附件</label>
            <input type="file" multiple @change="uploadFiles($event, inqForm.files, 'file')" />
            <div v-for="(f, i) in inqForm.files" :key="i" class="file-item">
              <a :href="f.url" target="_blank">📎 {{ f.name }}</a>
              <button class="btn-sm btn-danger" @click="inqForm.files.splice(i,1)">删除</button>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showInquiryModal = false">取消</button>
          <button class="btn btn-primary" @click="saveInquiry">保存</button>
        </div>
      </div>
    </div>

    <!-- ═══ Quotation Modal ═══ -->
    <div v-if="showQuotationModal" class="modal-overlay">
      <div class="modal modal-xl">
        <div class="modal-header">
          <h3>{{ editQuotationId ? '编辑报价' : '添加报价' }}</h3>
          <button class="modal-close" @click="showQuotationModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="quotation-layout">
            <div class="quot-left">
              <!-- Inquiry reference -->
              <div v-if="inquiries.length" class="inquiry-ref">
                <div class="ref-header">
                  <h4>📋 询盘参考</h4>
                  <select v-model="refInquiryIdx" class="ref-select">
                    <option v-for="(inq, i) in inquiries" :key="inq.id" :value="i">{{ inq.note || `询盘 ${i+1}` }} - {{ formatDateTime(inq.inquiry_time) }}</option>
                  </select>
                </div>
                <div class="ref-content" v-html="sanitizeRichHtml(inquiries[refInquiryIdx]?.content_html)"></div>
              </div>
              <div class="form-row2">
                <div class="form-group"><label>备注</label><input v-model="qtForm.note" placeholder="报价备注..." /></div>
                <div class="form-group"><label>报价时间</label><input v-model="qtForm.quotation_time" type="datetime-local" /></div>
              </div>
              <div class="form-group">
                <label>报价内容（支持粘贴Excel表格、图片）</label>
                <div ref="qtEditorRef" class="rich-editor" contenteditable="true" @paste="handlePaste($event)" v-html="sanitizeRichHtml(qtForm.content_html)"></div>
              </div>
              <div class="form-group">
                <label>报价图片</label>
                <input type="file" accept="image/*" multiple @change="uploadFiles($event, qtForm.images, 'image')" />
                <div class="img-grid">
                  <div v-for="(img, i) in qtForm.images" :key="i" class="img-thumb" @click="previewImg = img">
                    <img :src="img" />
                    <button class="img-del" @click.stop="qtForm.images.splice(i,1)">×</button>
                  </div>
                </div>
              </div>
              <div class="form-group">
                <label>附件文件</label>
                <input type="file" multiple @change="uploadFiles($event, qtForm.files, 'file')" />
                <div v-for="(f, i) in qtForm.files" :key="i" class="file-item">
                  <a :href="f.url" target="_blank">📎 {{ f.name }}</a>
                  <button class="btn-sm btn-danger" @click="qtForm.files.splice(i,1)">删除</button>
                </div>
              </div>
            </div>
            <!-- Right: price calculator -->
            <div class="quot-right">
              <h4>运费信息</h4>
              <div class="form-group">
                <label>运输方式</label>
                <select v-model="qtForm.freight_type"><option value="container">集装箱</option><option value="bulk">散货</option></select>
              </div>
              <div v-for="(p, i) in qtForm.ports" :key="i" class="port-row">
                <input v-model="p.name" placeholder="港口名称" class="port-input" />
                <input v-model.number="p.freight" placeholder="运费" type="number" step="0.01" class="port-input" />
                <button class="btn-sm btn-danger" @click="qtForm.ports.splice(i,1)">×</button>
              </div>
              <button class="btn btn-sm btn-secondary" @click="qtForm.ports.push({ name: '', freight: 0 })">+ 添加港口</button>

              <h4 style="margin-top:20px">价格计算</h4>
              <!-- FOB Search -->
              <div class="fob-search-bar">
                <input v-model="fobSearchQuery" type="text" placeholder="🔍 搜索FOB价格..." class="fob-search-input" @input="searchFOB" />
              </div>
              <div v-if="fobSearchResults.length" class="fob-search-results">
                <div class="fob-result-header">搜索结果 ({{ fobSearchResults.length }})</div>
                <div v-for="r in fobSearchResults" :key="r.idx" class="fob-result-row">
                  <span>行 {{ r.idx + 1 }}: FOB <strong>{{ r.fob }}</strong></span>
                  <span>CFR <strong class="cfr-val">{{ r.cfr || '-' }}</strong></span>
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
                <button class="btn btn-sm btn-secondary" @click="addPriceRow">+ 添加行</button>
                <button class="btn btn-sm btn-outline" @click="fillAllRows">📋 全部填充</button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showQuotationModal = false">取消</button>
          <button class="btn btn-primary" @click="saveQuotation">保存</button>
        </div>
      </div>
    </div>

    <!-- ═══ Followup Modal ═══ -->
    <div v-if="showFollowupModal" class="modal-overlay">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3>{{ editFollowupId ? '编辑跟进' : '添加跟进' }}</h3>
          <button class="modal-close" @click="showFollowupModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group"><label>跟进备注</label><input v-model="followForm.note" placeholder="跟进说明..." /></div>
          <div class="form-group">
            <label>跟进内容（支持粘贴截图）</label>
            <div ref="followEditorRef" class="rich-editor" contenteditable="true" @paste="handleFollowupPaste($event)" v-html="sanitizeRichHtml(followForm.content_html)"></div>
          </div>
          <div class="form-group">
            <label>上传图片</label>
            <input type="file" accept="image/*" multiple @change="uploadFiles($event, followForm.images, 'image')" />
            <div class="img-grid">
              <div v-for="(img, i) in followForm.images" :key="i" class="img-thumb" @click="previewImg = img">
                <img :src="img" />
                <button class="img-del" @click.stop="followForm.images.splice(i,1)">×</button>
              </div>
            </div>
          </div>
          <div class="form-group">
            <label>上传附件</label>
            <input type="file" multiple @change="uploadFiles($event, followForm.attachments, 'file')" />
            <div v-for="(f, i) in followForm.attachments" :key="i" class="file-item">
              <a :href="f.url" target="_blank">📎 {{ f.name }}</a>
              <button class="btn-sm btn-danger" @click="followForm.attachments.splice(i,1)">删除</button>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showFollowupModal = false">取消</button>
          <button class="btn btn-primary" @click="saveFollowup">保存</button>
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
</script>

<style scoped>
.detail-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.detail-header h1 { margin: 0; font-size: 24px; }
.btn-back { background: none; border: none; cursor: pointer; font-size: 16px; color: #2563eb; font-weight: 600; }
.status-badge { padding: 4px 12px; border-radius: 10px; font-size: 13px; font-weight: 600; }
.status-dev { background: #fef3c7; color: #92400e; } .status-contact { background: #ede9fe; color: #5b21b6; }
.status-closed { background: #d1fae5; color: #065f46; } .status-pool { background: #f1f5f9; color: #64748b; }

.info-card { background: #fff; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
.info-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
.info-item label { display: block; font-size: 12px; color: #64748b; margin-bottom: 2px; }
.info-item span { font-size: 14px; font-weight: 600; color: #0f172a; }
.note-row { margin-top: 12px; font-size: 13px; color: #475569; padding: 8px 12px; background: #f8fafc; border-radius: 6px; }
.tag-row { margin-top: 12px; display: flex; gap: 6px; }
.tag-badge { background: #f0fdf4; color: #166534; padding: 3px 8px; border-radius: 4px; font-size: 12px; }

.tabs { display: flex; gap: 4px; margin-bottom: 16px; }
.tab { padding: 10px 20px; border: none; border-radius: 8px 8px 0 0; cursor: pointer; font-size: 14px; font-weight: 600; background: #e2e8f0; color: #64748b; }
.tab.active { background: #fff; color: #2563eb; box-shadow: 0 -2px 0 #2563eb inset; }

.tab-content { background: #fff; border-radius: 0 12px 12px 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
.tab-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.tab-header h3 { margin: 0; }

.record-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 8px; }
.record-row:hover { background: #fafafe; }
.record-left { flex: 1; }
.record-note { font-size: 14px; font-weight: 600; color: #0f172a; }
.record-time { font-size: 12px; color: #64748b; margin-top: 2px; }
.record-cfr { margin-top: 4px; display: flex; gap: 6px; }
.cfr-chip { background: #f0fdf4; color: #059669; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; }
.record-right { display: flex; gap: 6px; flex-shrink: 0; }
.empty { color: #94a3b8; text-align: center; padding: 20px; }

.preview-split { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.preview-split.single-view { grid-template-columns: 1fr; }
.preview-panel { border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; max-height: 60vh; overflow-y: auto; }
.preview-panel h4 { margin: 0 0 8px; font-size: 15px; }
.preview-meta { font-size: 12px; color: #64748b; margin-bottom: 10px; }
.preview-html { font-size: 14px; line-height: 1.6; }
.preview-html :deep(img) { max-width: 100%; height: auto; cursor: pointer; }
.preview-html :deep(table) { border-collapse: collapse; width: 100%; }
.preview-html :deep(td), .preview-html :deep(th) { border: 1px solid #ddd; padding: 6px 8px; }
.preview-price { margin-top: 12px; }
.price-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.price-table th { background: #f8fafc; padding: 6px 8px; text-align: center; font-size: 12px; border: 1px solid #e2e8f0; }
.price-table td { padding: 6px 8px; text-align: center; border: 1px solid #e2e8f0; }
.cfr-val { font-weight: 700; color: #059669; }

/* Image preview overlay */
.img-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 3000; cursor: pointer; }
.img-overlay.pinned { pointer-events: none; background: rgba(0,0,0,0.3); }
.img-overlay.pinned img, .img-overlay.pinned .img-overlay-toolbar { pointer-events: auto; }
.img-overlay img { max-width: 90vw; max-height: 80vh; object-fit: contain; border-radius: 8px; cursor: default; }
.img-overlay-toolbar { display: flex; gap: 10px; margin-top: 12px; pointer-events: auto; }
.img-toolbar-btn { background: rgba(255,255,255,0.2); color: #fff; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; }
.img-toolbar-btn:hover { background: rgba(255,255,255,0.4); }

/* Claim history */
.claim-history { margin-top: 10px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 13px; }
.claim-history label { font-weight: 600; color: #334155; }
.claim-item { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; background: #f8fafc; border-radius: 4px; border: 1px solid #e2e8f0; }
.claim-item small { color: #94a3b8; font-size: 11px; }
.pool-blue { color: #2563eb; font-weight: 600; }

/* Cell-wrap with fill-down button */
.cell-wrap { position: relative; min-width: 0; }
.cell-wrap input { width: 100%; }
.cell-fill { position: absolute; right: 1px; bottom: 1px; width: 16px; height: 16px; border: none; background: #2563eb; color: #fff; font-size: 9px; cursor: pointer; border-radius: 2px; opacity: 0; transition: opacity 0.15s; display: flex; align-items: center; justify-content: center; padding: 0; }
.cell-wrap:hover .cell-fill { opacity: 1; }

.btn-sm { padding: 4px 10px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; }
.btn-edit { background: #eff6ff; color: #2563eb; } .btn-view { background: #f0fdf4; color: #15803d; }
.btn-danger { background: #fef2f2; color: #dc2626; } .btn-outline { background: #fff; border: 1px solid #e2e8f0; color: #334155; }
.btn-sm:hover { opacity: 0.85; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: #fff; border-radius: 14px; max-height: 90vh; overflow-y: auto; }
.modal-lg { width: 720px; max-width: 95vw; } .modal-xl { width: 1200px; max-width: 95vw; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; background: #fff; z-index: 1; border-radius: 14px 14px 0 0; }
.modal-header h3 { margin: 0; }
.modal-close { background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b; }
.modal-body { padding: 24px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid #e2e8f0; position: sticky; bottom: 0; background: #fff; border-radius: 0 0 14px 14px; }

.form-group { margin-bottom: 14px; }
.form-group label { display: block; margin-bottom: 4px; font-size: 13px; font-weight: 600; color: #334155; }
.form-group input, .form-group select { width: 100%; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 14px; box-sizing: border-box; }
.form-group input:focus, .form-group select:focus { outline: none; border-color: #2563eb; }
.form-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

.rich-editor { min-height: 180px; padding: 14px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; line-height: 1.6; overflow-y: auto; max-height: 400px; }
.rich-editor:focus { outline: none; border-color: #2563eb; }
.rich-editor img { max-width: 100%; height: auto; } .rich-editor table { border-collapse: collapse; width: 100%; }
.rich-editor td, .rich-editor th { border: 1px solid #ddd; padding: 4px 8px; }

.quotation-layout { display: grid; grid-template-columns: 1fr 480px; gap: 24px; }
@media (max-width: 900px) { .quotation-layout { grid-template-columns: 1fr; } }
.inquiry-ref { margin-bottom: 16px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; background: #fafafe; }
.ref-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.ref-header h4 { margin: 0; font-size: 14px; }
.ref-select { font-size: 12px; padding: 4px 8px; border: 1px solid #e2e8f0; border-radius: 4px; max-width: 300px; }
.ref-content { max-height: 200px; overflow-y: auto; font-size: 13px; line-height: 1.5; }
.ref-content :deep(img) { max-width: 100%; } .ref-content :deep(table) { border-collapse: collapse; width: 100%; }
.ref-content :deep(td), .ref-content :deep(th) { border: 1px solid #ddd; padding: 4px 6px; font-size: 12px; }

.quot-right { background: #f8fafc; border-radius: 10px; padding: 16px; }
.quot-right h4 { margin: 0 0 12px; font-size: 15px; color: #0f172a; }
.port-row { display: flex; gap: 6px; margin-bottom: 6px; }
.port-input { flex: 1; padding: 6px 8px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 13px; }

/* FOB search */
.fob-search-bar { margin-bottom: 10px; }
.fob-search-input { width: 100%; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px; box-sizing: border-box; }
.fob-search-input:focus { outline: none; border-color: #2563eb; }
.fob-search-results { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px; margin-bottom: 10px; }
.fob-result-header { font-size: 12px; font-weight: 700; color: #92400e; margin-bottom: 6px; }
.fob-result-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; border-bottom: 1px solid #fef3c7; }

/* Price calc grid */
.price-calc-header { display: grid; grid-template-columns: 30px 1fr 1fr 1fr 1fr 1fr 1fr 24px; gap: 4px; font-size: 11px; font-weight: 600; color: #475569; text-align: center; margin-bottom: 4px; }
.price-calc-row { display: grid; grid-template-columns: 30px 1fr 1fr 1fr 1fr 1fr 1fr 24px; gap: 4px; margin-bottom: 4px; align-items: center; }
.row-num { font-size: 11px; color: #94a3b8; text-align: center; font-weight: 600; }
.price-calc-row input { padding: 6px 4px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 12px; text-align: center; width: 100%; box-sizing: border-box; min-width: 0; }
.cfr-input { background: #f0fdf4 !important; font-weight: 700; color: #059669; }
.fill-down-btn { padding: 2px 4px; border: 1px solid #e2e8f0; border-radius: 3px; background: #fff; cursor: pointer; font-size: 10px; color: #64748b; }
.fill-down-btn:hover { background: #eff6ff; color: #2563eb; }
.fill-down-btn.del { background: #fef2f2; color: #dc2626; border-color: #fecaca; }
.price-row-actions { display: flex; gap: 8px; margin-top: 8px; }

.img-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.img-thumb { position: relative; width: 80px; height: 80px; border-radius: 6px; overflow: hidden; cursor: pointer; border: 1px solid #e2e8f0; }
.img-thumb img { width: 100%; height: 100%; object-fit: cover; }
.img-del { position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,0.6); color: #fff; border: none; border-radius: 50%; width: 18px; height: 18px; cursor: pointer; font-size: 12px; }
.file-item { display: flex; align-items: center; gap: 8px; padding: 6px; background: #f8fafc; border-radius: 4px; margin-top: 4px; font-size: 13px; }
.file-item a { color: #2563eb; text-decoration: none; font-weight: 500; }
.file-item a:hover { text-decoration: underline; }
.preview-attach { margin-top: 16px; padding-top: 12px; border-top: 1px solid #e2e8f0; }
.preview-attach h5 { margin: 0 0 8px; font-size: 13px; color: #64748b; }

.btn { padding: 9px 20px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
.btn-primary { background: #2563eb; color: #fff; } .btn-primary:hover { background: #1d4ed8; }
.btn-secondary { background: #f1f5f9; color: #334155; }
</style>
