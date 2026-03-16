<template>
  <div class="mailer-page">
    <h1>📤 批量发邮件</h1>

    <!-- Tabs -->
    <div class="tabs">
      <button :class="['tab', tab === 'templates' && 'active']" @click="tab='templates'">📝 模板</button>
      <button :class="['tab', tab === 'contacts' && 'active']" @click="tab='contacts'">👥 联系人</button>
      <button :class="['tab', tab === 'tasks' && 'active']" @click="tab='tasks'">🚀 发送任务</button>
      <button :class="['tab', tab === 'logs' && 'active']" @click="tab='logs'">📋 发送记录</button>
    </div>

    <!-- ═══ Templates Tab ═══ -->
    <div v-if="tab === 'templates'" class="tab-body">
      <div class="toolbar"><button class="btn btn-primary" @click="openTplEditor()">+ 新建模板</button></div>
      <div v-if="!templates.length" class="empty">暂无模板</div>
      <div v-for="t in templates" :key="t.id" class="list-card">
        <div class="lc-main">
          <strong>{{ t.name }}</strong>
          <span class="lc-sub">主题：{{ t.subject }}</span>
          <span v-if="t.note" class="lc-note">{{ t.note }}</span>
        </div>
        <div class="lc-actions">
          <button class="btn btn-sm btn-outline" @click="openTplEditor(t)">编辑</button>
          <button class="btn btn-sm btn-outline" @click="duplicateTemplate(t.id)">📋 复制</button>
          <button class="btn btn-sm btn-outline" @click="previewTpl(t)">预览</button>
          <button class="btn btn-sm btn-outline err-btn" @click="deleteTpl(t.id)">删除</button>
        </div>
      </div>
    </div>

    <!-- ═══ Contacts Tab ═══ -->
    <div v-if="tab === 'contacts'" class="tab-body">
      <div class="toolbar" style="flex-wrap:wrap;gap:8px">
        <button class="btn btn-primary" @click="openContactEditor()">+ 添加联系人</button>
        <button class="btn btn-outline" @click="openImportModal">📥 批量导入</button>
        <button v-if="selectedContacts.length" class="btn btn-outline err-btn" @click="bulkDeleteContacts">🗑️ 删除选中 ({{ selectedContacts.length }})</button>
        <!-- Move to group -->
        <select v-if="selectedContacts.length" v-model="moveTargetGroup" class="form-control" style="width:auto;min-width:120px;font-size:12px;padding:4px 8px">
          <option :value="null">移动到分组...</option>
          <option :value="0">— 未分组 —</option>
          <option v-for="g in contactGroups" :key="g.id" :value="g.id">{{ g.name }}</option>
        </select>
        <button v-if="selectedContacts.length && moveTargetGroup !== null" class="btn btn-sm btn-outline" style="color:#7c3aed;border-color:#c4b5fd" @click="moveToGroup">✅ 确认移动</button>
        <div style="flex:1"></div>
        <!-- Group management -->
        <button class="btn btn-sm btn-outline" @click="addGroup" style="color:#7c3aed;border-color:#c4b5fd">📁 新建分组</button>
      </div>

      <!-- Group filter pills -->
      <div class="group-bar" v-if="contactGroups.length">
        <span class="group-pill" :class="{ active: contactGroupFilter === '' }" @click="contactGroupFilter=''">全部 ({{ contacts.length }})</span>
        <span class="group-pill" :class="{ active: contactGroupFilter === 'none' }" @click="contactGroupFilter='none'">未分组 ({{ contacts.filter(c=>!c.group_id).length }})</span>
        <span v-for="g in contactGroups" :key="g.id" class="group-pill" :class="{ active: contactGroupFilter === g.id }"
              @click="contactGroupFilter=g.id" @dblclick="renameGroup(g)">
          {{ g.name }} ({{ g.contact_count }})
          <span class="group-del" @click.stop="deleteGroup(g.id)" title="删除分组">×</span>
        </span>
      </div>

      <!-- Fuzzy search -->
      <div style="margin-bottom:12px">
        <input v-model="contactSearch" class="form-control" placeholder="🔍 搜索邮箱、姓名、公司、分组..." style="max-width:400px" />
      </div>

      <div v-if="!filteredContacts.length" class="empty">{{ contactSearch ? '无匹配结果' : '暂无联系人' }}</div>
      <template v-else>
        <div v-for="dg in domainGroupedContacts" :key="dg.domain" class="domain-group">
          <div class="domain-header" @click="toggleDomain(dg.domain)">
            <span>{{ domainExpanded.has(dg.domain) ? '▼' : '▶' }}</span>
            <strong>{{ dg.domain }}</strong>
            <span class="domain-count">({{ dg.contacts.length }})</span>
          </div>
          <table v-if="domainExpanded.has(dg.domain)" class="data-table" style="margin-bottom:0">
            <thead><tr><th style="width:30px"><input type="checkbox" @change="toggleDomainAll(dg, $event)" :checked="dg.contacts.every(c=>selectedContacts.includes(c.id))" /></th><th>邮箱</th><th>姓名</th><th>公司</th><th>分组</th><th>操作</th></tr></thead>
            <tbody><tr v-for="c in dg.contacts" :key="c.id">
              <td><input type="checkbox" v-model="selectedContacts" :value="c.id" /></td>
              <td>{{ c.email }}</td><td>{{ c.name }}</td><td>{{ c.company }}</td>
              <td><span v-if="c.group_name" class="log-badge" style="font-size:11px">{{ c.group_name }}</span><span v-else style="color:#94a3b8;font-size:11px">—</span></td>
              <td class="row-actions">
                <button class="btn btn-sm btn-outline" @click="openContactEditor(c)">编辑</button>
                <button class="btn btn-sm btn-outline err-btn" @click="deleteContact(c.id)">删除</button>
              </td>
            </tr></tbody>
          </table>
        </div>
      </template>
    </div>

    <!-- ═══ Tasks Tab ═══ -->
    <div v-if="tab === 'tasks'" class="tab-body">
      <div class="toolbar"><button class="btn btn-primary" @click="openTaskCreator()">+ 创建发送任务</button></div>
      <div v-if="!tasks.length" class="empty">暂无任务</div>
      <div v-for="t in tasks" :key="t.id" class="list-card task-card">
        <div class="lc-main">
          <div style="display:flex;align-items:center;gap:8px">
            <strong>{{ t.name || '未命名任务' }}</strong>
            <span v-if="t.priority" class="tag-urgent">⚡ 紧急</span>
            <span v-if="t.schedule_at && t.status==='pending'" class="tag-sched">⏰ 定时中</span>
          </div>
          <span class="lc-sub">状态：<span :class="'status-'+t.status">{{ statusLabel(t.status) }}</span> | 进度：<b>{{ t.sent_count }}</b>/{{ t.total_count }}</span>
          <!-- Real-time countdown -->
          <div v-if="rtData[t.id]" class="rt-info">
            <span>📬 即将发送：{{ rtData[t.id].nextEmail }}</span>
            <span v-if="rtData[t.id].countdownMs > 0"> | ⏱ {{ Math.ceil(rtData[t.id].countdownMs/1000) }}秒后</span>
            <span> | 剩余 {{ rtData[t.id].remaining }} 封</span>
          </div>
          <span class="lc-note">
            创建：{{ new Date(t.created_at).toLocaleString('zh-CN') }}
            <span v-if="t.schedule_at"> · 定时：{{ new Date(t.schedule_at).toLocaleString('zh-CN') }}</span>
          </span>
        </div>
        <div class="lc-actions">
          <!-- Pending: Start, Schedule, Edit, Delete -->
          <button v-if="t.status==='pending'" class="btn btn-sm btn-primary" @click="startTask(t.id)">▶ 启动</button>
          <button v-if="['pending','paused','failed','cancelled'].includes(t.status)" class="btn btn-sm btn-outline" style="color:#6366f1;border-color:#a5b4fc" @click="openSchedule(t)">⏰ 定时</button>

          <!-- Running: Pause -->
          <button v-if="t.status==='running'" class="btn btn-sm btn-outline" style="color:#f59e0b;border-color:#fcd34d" @click="pauseTask(t.id)">⏸ 暂停</button>

          <!-- Paused/Failed: Resume, Restart -->
          <button v-if="t.status==='paused' || t.status==='failed'" class="btn btn-sm btn-primary" @click="resumeTask(t.id)">▶ 续发</button>
          <button v-if="t.status==='paused' || t.status==='failed'" class="btn btn-sm btn-outline" @click="startTask(t.id)" title="从头开始">↺ 重发</button>

          <button v-if="['pending','paused','failed','cancelled'].includes(t.status)" class="btn btn-sm btn-outline" @click="openTaskCreator(t)">编辑</button>

          <!-- Done: Follow-up -->
          <button v-if="t.status==='done'" class="btn btn-sm btn-outline" style="color:#3b82f6;border-color:#93c5fd" @click="followUpTask(t)">💬 跟进</button>

          <button class="btn btn-sm btn-outline" @click="viewLogs(t.id)">查看记录</button>
          <button v-if="t.status !== 'running'" class="btn btn-sm btn-outline err-btn" @click="deleteTask(t.id)">删除</button>
        </div>
      </div>
    </div>

    <!-- ═══ Logs Tab ═══ -->
    <div v-if="tab === 'logs'" class="tab-body">
      <div class="toolbar" style="flex-wrap:wrap;gap:10px">
        <select v-model="logTaskFilter" class="form-control" style="width:240px" @change="loadLogs">
          <option value="">所有记录</option>
          <option v-for="t in tasks" :key="t.id" :value="t.id">{{ t.name || '任务#'+t.id }}</option>
        </select>
        <button v-if="selectedLogIds.length" class="btn btn-outline err-btn" @click="bulkDeleteLogs">
          🗑️ 批量删除 ({{ selectedLogIds.length }})
        </button>
      </div>

      <div v-if="!groupedLogs.length" class="empty">暂无记录</div>

      <!-- Grouped by contact_email -->
      <div v-for="g in groupedLogs" :key="g.contact_email" class="log-group">
        <div class="log-group-header" @click="toggleLogGroup(g.contact_email)">
          <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">
            <input type="checkbox" @click.stop @change="toggleGroupCheck(g, $event)" :checked="groupAllChecked(g)" />
            <span class="log-email">{{ g.contact_name ? g.contact_name+'<'+g.contact_email+'>' : g.contact_email }}</span>
            <span class="log-badge">发送 {{ g.send_count }} 次</span>
            <span v-if="g.follow_count" class="log-badge follow">跟进 {{ g.follow_count }} 次</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
            <span class="log-time">{{ g.last_sent_at ? new Date(g.last_sent_at).toLocaleString('zh-CN') : '' }}</span>
            <span>{{ expandedGroups.has(g.contact_email) ? '▲' : '▼' }}</span>
          </div>
        </div>

        <!-- Expanded: per-send history -->
        <div v-if="expandedGroups.has(g.contact_email)" class="log-records">
          <div v-for="(r, idx) in g.records" :key="r.id" class="log-record">
            <input type="checkbox" v-model="selectedLogIds" :value="r.id" style="margin-right:8px" />
            <div class="log-record-body">
              <span class="log-round">{{ followLabel(g, idx) }}</span>
              <span class="log-subj">{{ r.subject }}</span>
              <span :class="'check '+(r.status==='sent'?'gray':'red')">
                {{ r.status === 'sent' ? '✓✓ 已发送' : '✗ 失败' }}
              </span>
              <span class="log-time">{{ r.sent_at ? new Date(r.sent_at).toLocaleString('zh-CN') : '' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ Template Editor Modal ═══ -->
    <div class="modal-overlay" v-if="showTplEditor" @click.self="closeTplEditor">
      <div class="modal-box modal-lg">
        <h3>{{ editTpl.id ? '编辑模板' : '新建模板' }}</h3>
        <div class="grid grid-2">
          <div class="form-group"><label>模板名称</label><input v-model="editTpl.name" class="form-control" placeholder="如：新产品推介" /></div>
          <div class="form-group"><label>邮件主题</label><input v-model="editTpl.subject" class="form-control" placeholder="支持 {{name}} {{company}} 变量" /></div>
        </div>
        <div class="form-group"><label>备注</label><input v-model="editTpl.note" class="form-control" placeholder="选填" /></div>
        <div class="form-group">
          <label>正文内容（支持直接粘贴截图、复制Foxmail内容格式完整保留）</label>
          <!-- Native rich-text toolbar -->
          <div class="rte-toolbar">
            <select @change="rteCmd('fontName', $event.target.value);$event.target.value=''" style="width:100px">
              <option value="">字体</option>
              <option>Arial</option><option>Times New Roman</option><option>Verdana</option><option>Courier New</option>
            </select>
            <select @change="rteCmd('fontSize', $event.target.value);$event.target.value=''" style="width:60px">
              <option value="">号</option>
              <option value="1">10</option><option value="2">12</option><option value="3">14</option>
              <option value="4">16</option><option value="5">18</option><option value="6">24</option><option value="7">36</option>
            </select>
            <button class="rte-btn" @click.prevent="rteCmd('bold')" title="粗体"><b>B</b></button>
            <button class="rte-btn" @click.prevent="rteCmd('italic')" title="斜体"><i>I</i></button>
            <button class="rte-btn" @click.prevent="rteCmd('underline')" title="下划线"><u>U</u></button>
            <button class="rte-btn" @click.prevent="rteCmd('strikeThrough')" title="删除线"><s>S</s></button>
            <span class="rte-sep"></span>
            <label class="rte-btn" title="字体颜色">A <input type="color" @input="rteCmd('foreColor', $event.target.value)" style="opacity:0;position:absolute;width:1px;height:1px" /></label>
            <label class="rte-btn" title="背景色">🖊<input type="color" @input="rteCmd('backColor', $event.target.value)" style="opacity:0;position:absolute;width:1px;height:1px" /></label>
            <span class="rte-sep"></span>
            <button class="rte-btn" @click.prevent="rteCmd('justifyLeft')" title="左对齐">≡</button>
            <button class="rte-btn" @click.prevent="rteCmd('justifyCenter')" title="居中">≡</button>
            <button class="rte-btn" @click.prevent="rteCmd('justifyRight')" title="右对齐">≡</button>
            <span class="rte-sep"></span>
            <button class="rte-btn" @click.prevent="rteCmd('insertUnorderedList')" title="无序列表">≡</button>
            <button class="rte-btn" @click.prevent="rteCmd('insertOrderedList')" title="有序列表">1.</button>
            <button class="rte-btn" @click.prevent="rteCmd('insertHorizontalRule')" title="插入横线">—</button>
            <span class="rte-sep"></span>
            <button class="rte-btn" @click.prevent="rteInsertLink" title="插入链接">🔗</button>
            <button class="rte-btn" @click.prevent="rteUploadImage" title="插入图片">🖼</button>
            <button class="rte-btn" @click.prevent="rteCmd('removeFormat')" title="清除格式">✖</button>
          </div>
          <!-- iframe: designMode='on' = Foxmail-like native editing, zero sanitization -->
          <iframe ref="editorFrame" class="rte-frame" @load="onFrameLoad"></iframe>
        </div>
        <div class="modal-actions">
          <button class="btn btn-primary" @click="saveTpl" :disabled="savingTpl">{{ savingTpl ? '保存中...' : '💾 保存' }}</button>
          <button class="btn btn-outline" @click="closeTplEditor">取消</button>
        </div>
      </div>
    </div>


    <!-- ═══ Contact Editor Modal ═══ -->
    <div class="modal-overlay" v-if="showContactEditor" @click.self="showContactEditor=false">
      <div class="modal-box">
        <h3>{{ editContact.id ? '编辑联系人' : '添加联系人' }}</h3>
        <div class="form-group"><label>邮箱 *</label><input v-model="editContact.email" class="form-control" type="email" /></div>
        <div class="grid grid-2">
          <div class="form-group"><label>姓名</label><input v-model="editContact.name" class="form-control" /></div>
          <div class="form-group"><label>公司</label><input v-model="editContact.company" class="form-control" /></div>
        </div>
        <div class="form-group">
          <label>分组</label>
          <select v-model="editContact.group_id" class="form-control">
            <option :value="null">— 不分组 —</option>
            <option v-for="g in contactGroups" :key="g.id" :value="g.id">{{ g.name }}</option>
          </select>
        </div>
        <div class="modal-actions">
          <button class="btn btn-primary" @click="saveContact">💾 保存</button>
          <button class="btn btn-outline" @click="showContactEditor=false">取消</button>
        </div>
      </div>
    </div>

    <!-- ═══ Import Modal ═══ -->
    <div class="modal-overlay" v-if="showImport" @click.self="showImport=false">
      <div class="modal-box">
        <h3>📥 批量导入联系人</h3>
        <div class="form-group">
          <label>导入到分组</label>
          <select v-model="importGroupId" class="form-control">
            <option :value="null">— 不分组 —</option>
            <option v-for="g in contactGroups" :key="g.id" :value="g.id">{{ g.name }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>每行一个，格式：邮箱,姓名,公司</label>
          <textarea v-model="importText" class="form-control" rows="8" placeholder="john@example.com,John,ACME Corp&#10;jane@example.com,Jane,XYZ Inc"></textarea>
        </div>
        <div class="modal-actions">
          <button class="btn btn-primary" @click="doImport">导入</button>
          <button class="btn btn-outline" @click="showImport=false">取消</button>
        </div>
      </div>
    </div>

    <!-- ═══ Task Creator Modal ═══ -->
    <div class="modal-overlay" v-if="showTaskCreator" @click.self="showTaskCreator=false">
      <div class="modal-box modal-lg">
        <h3>🚀 {{ newTask.id ? '编辑发送任务' : '创建发送任务' }}</h3>
        <div class="form-group"><label>任务名称</label><input v-model="newTask.name" class="form-control" placeholder="如：3月产品推广" /></div>

        <div class="form-group">
          <label>选择模板（勾选多个则轮流发送）</label>
          <div class="check-list">
            <label v-for="t in templates" :key="t.id" class="check-item">
              <input type="checkbox" v-model="newTask.template_ids" :value="t.id" /> {{ t.name }} — {{ t.subject }}
            </label>
          </div>
        </div>

        <div class="form-group">
          <label>选择联系人</label>
          <!-- Follow-up: contacts locked to parent task -->
          <div v-if="newTask.parent_task_id" class="followup-contacts-locked">
            <span>🔒 跟进邮件自动发送给上次任务的相同收件人 ({{ newTask.contact_ids.length }} 人)</span>
            <p class="form-hint">跟进邮件收件人与上次任务相同，无需重新选择，确保不会搞错跟进对象。</p>
          </div>
          <div v-else>
            <!-- Group quick select + search -->
            <div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;align-items:center">
              <span v-for="g in contactGroups" :key="g.id" class="group-pill small" @click="selectGroupContacts(g.id)"
                    :title="'点击选择'+g.name+'下所有联系人'">📁 {{ g.name }}</span>
              <input v-model="taskContactSearch" class="form-control" placeholder="🔍 搜索联系人..." style="flex:1;min-width:150px;max-width:250px" />
            </div>
            <div class="check-list" style="max-height:200px">
              <div class="check-item-header">
                <label><input type="checkbox" @change="toggleAllNewTaskContacts" :checked="newTaskAllContactsSel" /> 全选</label>
              </div>
              <label v-for="c in taskFilteredContacts" :key="c.id" class="check-item">
                <input type="checkbox" v-model="newTask.contact_ids" :value="c.id" /> {{ c.email }} {{ c.name ? '('+c.name+')' : '' }}
                <span v-if="c.group_name" class="log-badge" style="font-size:10px;margin-left:4px">{{ c.group_name }}</span>
                <span v-if="c.domain_group" class="log-badge" style="font-size:10px;margin-left:4px;background-color:#e0f2fe;color:#0284c7">{{ c.domain_group }}</span>
              </label>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>选择发件账号（勾选多个则轮流使用）</label>
          <div class="check-list">
            <label v-for="a in smtpAccounts" :key="a.id" class="check-item">
              <input type="checkbox" v-model="newTask.account_ids" :value="a.id" /> {{ a.name }} ({{ a.smtp_user }})
            </label>
          </div>
        </div>

        <div class="grid grid-2">
          <div class="form-group"><label>最小间隔（秒）</label><input v-model.number="newTask.interval_min" class="form-control" type="number" min="1" /></div>
          <div class="form-group"><label>最大间隔（秒）</label><input v-model.number="newTask.interval_max" class="form-control" type="number" min="1" /></div>
        </div>

        <div class="form-group"><label>抄送（CC，留空则不抄送）</label><input v-model="newTask.cc" class="form-control" placeholder="boss@company.com" /></div>

        <div class="grid grid-2">
          <div class="form-group">
            <label class="toggle-label"><input type="checkbox" v-model="newTask.read_receipt" /><span>请求已读回执</span></label>
            <p class="form-hint">对方邮件客户端提示发送阅读回执</p>
          </div>
          <div class="form-group">
            <label>跳过X天内发送过的邮箱</label>
            <input v-model.number="newTask.skip_days" class="form-control" type="number" min="0" placeholder="0 = 不跳过" />
            <p class="form-hint">填 0 不过滤。如填 7，则自动跳过 7 天内已发送过的邮箱，跟进任务不受影响。</p>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn btn-primary" @click="createTask">🚀 {{ newTask.id ? '保存修改' : '创建任务' }}</button>
          <button class="btn btn-outline" @click="showTaskCreator=false">取消</button>
        </div>
      </div>
    </div>

    <!-- ═══ Schedule Modal ═══ -->
    <div class="modal-overlay" v-if="showSchedule" @click.self="showSchedule=false">
      <div class="modal-box">
        <h3>⏰ 定时发送任务</h3>
        <p class="form-hint" style="margin-bottom:14px">任务：{{ scheduleTask_.name }}</p>
        <div class="form-group">
          <label>选择发送时间</label>
          <input type="datetime-local" v-model="scheduleTime" class="form-control" />
        </div>
        <div class="modal-actions">
          <button class="btn btn-primary" @click="confirmSchedule">✅ 确认定时</button>
          <button class="btn btn-outline" @click="showSchedule=false">取消</button>
        </div>
      </div>
    </div>

    <!-- ═══ Preview Modal ═══ -->
    <div class="modal-overlay" v-if="showPreview" @click.self="showPreview=false">
      <div class="modal-box modal-lg">
        <h3>📧 模板预览</h3>
        <div class="preview-frame" v-html="previewHtml"></div>
        <div class="modal-actions"><button class="btn btn-outline" @click="showPreview=false">关闭</button></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick, onUnmounted } from 'vue'
import api from '../../api'

// ─── iframe-based native editor (Foxmail-style) ───────────────────────────────
const editorFrame = ref(null)
const savingTpl = ref(false)

function getFrameDoc() {
  return editorFrame.value?.contentDocument || editorFrame.value?.contentWindow?.document
}

function rteCmd(cmd, val = null) {
  const doc = getFrameDoc()
  if (!doc) return
  doc.execCommand(cmd, false, val)
  editorFrame.value?.contentWindow?.focus()
  syncFrameContent()
}

function syncFrameContent() {
  const doc = getFrameDoc()
  if (doc) editTpl.html_body = doc.body?.innerHTML || ''
}

function onFrameLoad() {
  const doc = getFrameDoc()
  if (!doc) return
  doc.open(); doc.write(`<!DOCTYPE html><html><head>
<style>
  body { margin:8px; font-family:Arial,sans-serif; font-size:13px; line-height:1.6;
         min-height:240px; outline:none; word-wrap:break-word; }
  img { max-width:100%; cursor:pointer; }
  img.img-selected { outline:2px solid #3b82f6; outline-offset:2px; }
  hr { border:none; border-top:1px solid #aaa; margin:12px 0; }
  a { color:#0563c1; }
  .img-handle { position:absolute; width:10px; height:10px; background:#3b82f6; border:1px solid #fff;
                border-radius:2px; cursor:nwse-resize; z-index:999; }
</style>
<script>
(function(){
  var activeImg = null, overlay = null, handles = [];
  function clearOverlay() {
    if (overlay) { overlay.remove(); overlay = null; }
    handles = [];
    document.querySelectorAll('img.img-selected').forEach(function(i){ i.classList.remove('img-selected'); });
    activeImg = null;
  }
  function showHandles(img) {
    clearOverlay();
    activeImg = img;
    img.classList.add('img-selected');
    overlay = document.createElement('div');
    overlay.style.cssText = 'position:absolute;pointer-events:none;z-index:998';
    document.body.appendChild(overlay);
    var corners = ['nw','ne','sw','se'];
    corners.forEach(function(dir) {
      var h = document.createElement('div');
      h.className = 'img-handle';
      h.style.pointerEvents = 'all';
      if (dir[1]==='w') h.style.cursor = dir==='nw' ? 'nwse-resize' : 'nesw-resize';
      else h.style.cursor = dir==='ne' ? 'nesw-resize' : 'nwse-resize';
      document.body.appendChild(h);
      handles.push(h);
      h.addEventListener('mousedown', function(e) { startDrag(e, img, dir); });
    });
    positionHandles(img);
  }
  function positionHandles(img) {
    var r = img.getBoundingClientRect();
    var sx = window.scrollX, sy = window.scrollY;
    var positions = [
      [r.left+sx-5, r.top+sy-5],
      [r.right+sx-5, r.top+sy-5],
      [r.left+sx-5, r.bottom+sy-5],
      [r.right+sx-5, r.bottom+sy-5]
    ];
    handles.forEach(function(h, i) {
      h.style.position = 'absolute';
      h.style.left = positions[i][0]+'px';
      h.style.top = positions[i][1]+'px';
    });
  }
  function startDrag(e, img, dir) {
    e.preventDefault(); e.stopPropagation();
    var startX = e.clientX, startW = img.offsetWidth, ratio = img.offsetHeight / img.offsetWidth;
    function onMove(ev) {
      var dx = (dir.indexOf('e')>=0) ? ev.clientX - startX : startX - ev.clientX;
      var newW = Math.max(30, startW + dx);
      img.style.width = newW + 'px';
      img.style.height = Math.round(newW * ratio) + 'px';
      positionHandles(img);
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      positionHandles(img);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }
  document.addEventListener('click', function(e) {
    if (e.target.tagName === 'IMG') { showHandles(e.target); }
    else if (!e.target.classList.contains('img-handle')) { clearOverlay(); }
  });
  document.addEventListener('dblclick', function(e) {
    if (e.target.tagName !== 'IMG') return;
    var img = e.target;
    var natW = img.naturalWidth || img.offsetWidth;
    var curPct = img.style.width ? Math.round(parseInt(img.style.width) / natW * 100) : 100;
    var pct = prompt('设置图片大小比例 (当前: '+curPct+'%)：', curPct);
    if (pct && !isNaN(+pct)) {
      var newW = Math.round(natW * (+pct) / 100);
      img.style.width = newW + 'px';
      img.style.height = 'auto';
      if (activeImg === img) positionHandles(img);
    }
  });
})();
<\/script></head><body></body></html>`); doc.close()
  doc.designMode = 'on'
  // Monitor input to sync back
  doc.addEventListener('input', syncFrameContent)
  doc.addEventListener('keyup', syncFrameContent)
  // Load existing content if editing
  if (editTpl.html_body) doc.body.innerHTML = editTpl.html_body
}

function rteInsertLink() {
  const url = prompt('请输入链接地址：', 'https://')
  if (url) rteCmd('createLink', url)
}

async function rteUploadImage() {
  const input = document.createElement('input')
  input.type = 'file'; input.accept = 'image/*'; input.click()
  input.onchange = async () => {
    const file = input.files[0]; if (!file) return
    const fd = new FormData(); fd.append('image', file)
    try {
      savingTpl.value = true
      const token = localStorage.getItem('token')
      const res = await fetch('/api/upload/image', {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '服务器错误')
      const url = `${window.location.origin}${data.url}`
      rteCmd('insertImage', url)
    } catch (e) { alert('图片上传失败: ' + e.message) }
    finally { savingTpl.value = false }
  }
}

const tab = ref('templates')
const templates = ref([])
const contacts = ref([])
const tasks = ref([])
const smtpAccounts = ref([])
const selectedContacts = ref([])

// Contact groups & search
const contactGroups = ref([])
const contactGroupFilter = ref('')
const contactSearch = ref('')
const taskContactSearch = ref('')
const importGroupId = ref(null)
const moveTargetGroup = ref(null)

// Fuzzy search helper
function fuzzyMatch(text, query) {
  if (!query) return true
  const q = query.toLowerCase()
  return (text || '').toLowerCase().includes(q)
}

// Filtered contacts for contacts tab (group filter + fuzzy search)
const filteredContacts = computed(() => {
  let list = contacts.value
  // Group filter
  if (contactGroupFilter.value === 'none') list = list.filter(c => !c.group_id)
  else if (contactGroupFilter.value) list = list.filter(c => c.group_id === contactGroupFilter.value)
  // Fuzzy search
  if (contactSearch.value) {
    const q = contactSearch.value.toLowerCase()
    list = list.filter(c => fuzzyMatch(c.email, q) || fuzzyMatch(c.name, q) || fuzzyMatch(c.company, q) || fuzzyMatch(c.group_name, q))
  }
  return list
})

// Domain-grouped contacts for display
const domainExpanded = ref(new Set())
const domainGroupedContacts = computed(() => {
  const map = {}
  for (const c of filteredContacts.value) {
    const domain = (c.email || '').split('@')[1] || 'unknown'
    if (!map[domain]) map[domain] = []
    map[domain].push(c)
  }
  // Auto-expand all domains
  const allDomains = Object.keys(map).sort()
  // Ensure new domains are auto-expanded
  const expanded = domainExpanded.value
  if (expanded.size === 0 || filteredContacts.value.length <= 50) {
    allDomains.forEach(d => expanded.add(d))
  }
  return allDomains.map(domain => ({ domain, contacts: map[domain] }))
})
function toggleDomain(domain) {
  const s = new Set(domainExpanded.value)
  if (s.has(domain)) s.delete(domain)
  else s.add(domain)
  domainExpanded.value = s
}
function toggleDomainAll(dg, e) {
  const ids = dg.contacts.map(c => c.id)
  if (e.target.checked) {
    selectedContacts.value = [...new Set([...selectedContacts.value, ...ids])]
  } else {
    selectedContacts.value = selectedContacts.value.filter(id => !ids.includes(id))
  }
}

// Filtered contacts for task creator (fuzzy search only)
const taskFilteredContacts = computed(() => {
  if (!taskContactSearch.value) return contacts.value
  const q = taskContactSearch.value.toLowerCase()
  return contacts.value.filter(c => fuzzyMatch(c.email, q) || fuzzyMatch(c.name, q) || fuzzyMatch(c.company, q) || fuzzyMatch(c.group_name, q))
})

// Group CRUD
async function addGroup() {
  const name = prompt('请输入分组名称：')
  if (!name) return
  try {
    await api.request('/mailer/contact-groups', { method: 'POST', body: JSON.stringify({ name }) })
    await loadGroups()
  } catch (e) { alert('创建失败: ' + e.message) }
}
async function renameGroup(g) {
  const name = prompt('修改分组名称：', g.name)
  if (!name || name === g.name) return
  await api.request(`/mailer/contact-groups/${g.id}`, { method: 'PUT', body: JSON.stringify({ name }) })
  await loadGroups(); await loadAll()
}
async function deleteGroup(id) {
  if (!confirm('删除分组？分组内的联系人将变为未分组。')) return
  await api.request(`/mailer/contact-groups/${id}`, { method: 'DELETE' })
  contactGroupFilter.value = ''
  await loadGroups(); await loadAll()
}
async function loadGroups() {
  contactGroups.value = await api.request('/mailer/contact-groups') || []
}
function selectGroupContacts(gid) {
  const ids = contacts.value.filter(c => c.group_id === gid).map(c => c.id)
  // Toggle: if all already selected, deselect; otherwise select
  const allIn = ids.every(id => newTask.contact_ids.includes(id))
  if (allIn) {
    newTask.contact_ids = newTask.contact_ids.filter(id => !ids.includes(id))
  } else {
    newTask.contact_ids = [...new Set([...newTask.contact_ids, ...ids])]
  }
}
async function bulkDeleteContacts() {
  if (!selectedContacts.value.length) return
  if (!confirm(`确认删除 ${selectedContacts.value.length} 个联系人？`)) return
  try {
    await api.request('/mailer/contacts/bulk-delete', { method: 'POST', body: JSON.stringify({ ids: selectedContacts.value }) })
    selectedContacts.value = []
    await loadAll(); await loadGroups()
  } catch (e) { alert('删除失败: ' + e.message) }
}
async function moveToGroup() {
  if (!selectedContacts.value.length || moveTargetGroup.value === null) return
  const gid = moveTargetGroup.value === 0 ? null : moveTargetGroup.value
  try {
    await api.request('/mailer/contacts/move-group', { method: 'POST', body: JSON.stringify({ ids: selectedContacts.value, group_id: gid }) })
    selectedContacts.value = []
    moveTargetGroup.value = null
    await loadAll()
  } catch (e) { alert('移动失败: ' + e.message) }
}

// Contact editor
const showContactEditor = ref(false)
const editContact = reactive({ id: null, email: '', name: '', company: '', group_id: null })

// Import
const showImport = ref(false)
const importText = ref('')

function openContactEditor(c) {
  const defaultGroup = (contactGroupFilter.value && contactGroupFilter.value !== '' && contactGroupFilter.value !== 'none') ? contactGroupFilter.value : null
  Object.assign(editContact, c || { id: null, email: '', name: '', company: '', group_id: defaultGroup })
  showContactEditor.value = true
}
function openImportModal() {
  importGroupId.value = (contactGroupFilter.value && contactGroupFilter.value !== '' && contactGroupFilter.value !== 'none') ? contactGroupFilter.value : null
  showImport.value = true
}


// Task creator
const showTaskCreator = ref(false)
const newTask = reactive({ id: null, name: '', template_ids: [], contact_ids: [], account_ids: [], interval_min: 10, interval_max: 120, cc: '', read_receipt: true, priority: false, schedule_at: null, parent_task_id: null, skip_days: 0 })

// Schedule modal
const showSchedule = ref(false)
const scheduleTask_ = ref({})
const scheduleTime = ref('')

// Real-time polling
const rtData = ref({}) // taskId -> { nextEmail, countdownMs, remaining }

// Preview
const showPreview = ref(false)
const previewHtml = ref('')

// Logs grouped view
const groupedLogs = ref([])
const selectedLogIds = ref([])
const expandedGroups = ref(new Set())
const logTaskFilter = ref('')

function toggleLogGroup(email) {
  const s = new Set(expandedGroups.value)
  if (s.has(email)) s.delete(email)
  else s.add(email)
  expandedGroups.value = s
}
function groupAllChecked(g) {
  return g.records.every(r => selectedLogIds.value.includes(r.id))
}
function toggleGroupCheck(g, e) {
  const ids = g.records.map(r => r.id)
  if (e.target.checked) {
    selectedLogIds.value = [...new Set([...selectedLogIds.value, ...ids])]
  } else {
    selectedLogIds.value = selectedLogIds.value.filter(id => !ids.includes(id))
  }
}
function followLabel(g, idx) {
  // Count how many follow-ups appear before this record
  let followCount = 0
  for (let i = 0; i <= idx; i++) {
    const r = g.records[i]
    if (r.task_name && r.task_name.includes('跟进')) {
      if (i === idx) return `第${followCount + 1}次跟进`
      followCount++
    }
  }
  return '第一次发送'
}
async function bulkDeleteLogs() {
  if (!selectedLogIds.value.length) return
  if (!confirm(`确认删除 ${selectedLogIds.value.length} 条记录？`)) return
  try {
    await api.request('/mailer/logs/bulk-delete', { method: 'POST', body: JSON.stringify({ ids: selectedLogIds.value }) })
    selectedLogIds.value = []
    await loadLogs()
  } catch (e) { alert('删除失败: ' + e.message) }
}

const allContactsSelected = computed(() => filteredContacts.value.length > 0 && filteredContacts.value.every(c => selectedContacts.value.includes(c.id)))
const newTaskAllContactsSel = computed(() => taskFilteredContacts.value.length > 0 && taskFilteredContacts.value.every(c => newTask.contact_ids.includes(c.id)))

function statusLabel(s) { return { pending: '待发送', running: '发送中', done: '已完成', cancelled: '已取消', failed: '失败' }[s] || s }
function toggleAllContacts(e) {
  const ids = filteredContacts.value.map(c => c.id)
  selectedContacts.value = e.target.checked ? ids : []
}
function toggleAllNewTaskContacts(e) {
  const ids = taskFilteredContacts.value.map(c => c.id)
  if (e.target.checked) {
    newTask.contact_ids = [...new Set([...newTask.contact_ids, ...ids])]
  } else {
    newTask.contact_ids = newTask.contact_ids.filter(id => !ids.includes(id))
  }
}

async function loadAll() {
  const [tpl, ct, tk, accts, grps] = await Promise.all([
    api.request('/mailer/templates'), api.request('/mailer/contacts'),
    api.request('/mailer/tasks'), api.request('/email/accounts'),
    api.request('/mailer/contact-groups')
  ])
  templates.value = tpl || []; contacts.value = ct || []; tasks.value = tk || []; smtpAccounts.value = accts || []; contactGroups.value = grps || []
}
async function loadLogs() {
  const q = logTaskFilter.value ? `?task_id=${logTaskFilter.value}` : ''
  groupedLogs.value = await api.request('/mailer/logs/grouped' + q) || []
}
let rtInterval = null
let taskPollInterval = null
async function pollRealtime() {
  try {
    const data = await api.request('/mailer/tasks/realtime')
    rtData.value = data || {}
  } catch (e) {}
}
async function pollTasks() {
  // Always refresh task list so status changes (running→done) are picked up
  try {
    const freshTasks = await api.request('/mailer/tasks')
    if (freshTasks) tasks.value = freshTasks
  } catch (e) {}
}
onMounted(() => {
  loadAll()
  loadLogs()
  rtInterval = setInterval(pollRealtime, 1500)    // realtime countdown every 1.5s
  taskPollInterval = setInterval(pollTasks, 3000) // task status every 3s always
})
onUnmounted(() => { clearInterval(rtInterval); clearInterval(taskPollInterval) })

// ─── Template editor (iframe-based) ──────────────────────────────────────────
const showTplEditor = ref(false)
const editTpl = reactive({ id: null, name: '', subject: '', html_body: '', note: '' })
const editorRef = ref(null) // kept for backward compat, not used

function openTplEditor(t) {
  Object.assign(editTpl, t || { id: null, name: '', subject: '', html_body: '', note: '' })
  showTplEditor.value = true
  // iframe @load handles injecting content
}

function closeTplEditor() {
  syncFrameContent()
  showTplEditor.value = false
}

async function saveTpl() {
  syncFrameContent() // make sure latest iframe HTML is captured
  savingTpl.value = true
  try {
    if (editTpl.id) {
      await api.request(`/mailer/templates/${editTpl.id}`, { method: 'PUT', body: JSON.stringify(editTpl) })
    } else {
      await api.request('/mailer/templates', { method: 'POST', body: JSON.stringify(editTpl) })
    }
    await loadAll(); showTplEditor.value = false
  } catch (e) { alert('保存失败: ' + e.message) }
  finally { savingTpl.value = false }
}
async function deleteTpl(id) { if (!confirm('确认删除？')) return; await api.request(`/mailer/templates/${id}`, { method: 'DELETE' }); await loadAll() }
function previewTpl(t) { previewHtml.value = t.html_body; showPreview.value = true }
async function duplicateTemplate(id) {
  try {
    await api.request(`/mailer/templates/${id}/duplicate`, { method: 'POST' })
    await loadAll()
  } catch (e) { alert('复制失败: ' + e.message) }
}



// ─── Contacts ─────────────────────────────────────────────────────────────────
async function saveContact() {
  try {
    if (editContact.id) {
      await api.request(`/mailer/contacts/${editContact.id}`, { method: 'PUT', body: JSON.stringify(editContact) })
    } else {
      await api.request('/mailer/contacts', { method: 'POST', body: JSON.stringify(editContact) })
    }
    await loadAll(); showContactEditor.value = false
  } catch (e) { alert('保存失败: ' + e.message) }
}
async function deleteContact(id) { if (!confirm('确认删除？')) return; await api.request(`/mailer/contacts/${id}`, { method: 'DELETE' }); await loadAll() }
async function doImport() {
  const lines = importText.value.split('\n').map(l => l.trim()).filter(Boolean)
  if (!lines.length) return
  await api.request('/mailer/contacts/import', { method: 'POST', body: JSON.stringify({ lines, group_id: importGroupId.value }) })
  importText.value = ''; importGroupId.value = null; showImport.value = false; await loadAll()
}

// ─── Tasks ─────────────────────────────────────────────────────────────────
function openTaskCreator(existingTask = null) {
  if (existingTask) {
    Object.assign(newTask, existingTask)
    newTask.template_ids = JSON.parse(existingTask.template_ids || '[]')
    newTask.contact_ids = JSON.parse(existingTask.contact_ids || '[]')
    newTask.account_ids = JSON.parse(existingTask.account_ids || '[]')
    newTask.priority = !!existingTask.priority
    newTask.parent_task_id = existingTask.parent_task_id || null
  } else {
    Object.assign(newTask, { id: null, name: '', template_ids: [], contact_ids: selectedContacts.value.slice(), account_ids: [], interval_min: 10, interval_max: 120, cc: '', read_receipt: true, priority: false, schedule_at: null, parent_task_id: null })
  }
  showTaskCreator.value = true
}

async function createTask() {
  if (!newTask.template_ids.length) return alert('请选择至少一个模板')
  if (!newTask.contact_ids.length) return alert('请选择至少一个联系人')
  try {
    if (newTask.id) {
      await api.request(`/mailer/tasks/${newTask.id}`, { method: 'PUT', body: JSON.stringify(newTask) })
    } else {
      await api.request('/mailer/tasks', { method: 'POST', body: JSON.stringify(newTask) })
    }
    showTaskCreator.value = false; await loadAll()
  } catch (e) { alert('保存失败: ' + e.message) }
}

async function startTask(id) { await api.request(`/mailer/tasks/${id}/start`, { method: 'POST' }); await loadAll() }
async function pauseTask(id) { await api.request(`/mailer/tasks/${id}/stop`, { method: 'POST' }); await loadAll() }
async function resumeTask(id) { await api.request(`/mailer/tasks/${id}/resume`, { method: 'POST' }); await loadAll() }
// stopTask is removed (replaced by pauseTask)
async function deleteTask(id) { if (!confirm('确认删除？对应的发送记录也将被删除')) return; await api.request(`/mailer/tasks/${id}`, { method: 'DELETE' }); await loadAll() }
function viewLogs(taskId) { logTaskFilter.value = taskId; tab.value = 'logs'; loadLogs() }

async function followUpTask(t) {
  openTaskCreator()
  newTask.name = (t.name || '未命名').replace(' 的跟进', '') + ' 的跟进'
  newTask.contact_ids = JSON.parse(t.contact_ids || '[]')
  newTask.account_ids = JSON.parse(t.account_ids || '[]')
  newTask.parent_task_id = t.id  // link to parent → backend uses In-Reply-To header
  alert('已为您创建跟进任务，联系人和发件账号已从原任务复制。\n请选择跟进模板后点击创建。\n\nℹ️ 跟进邮件将内嵌上次发送的邮件，收件人能看到上次消息记录。')
}

function openSchedule(t) {
  scheduleTask_.value = t
  if (t.schedule_at) {
    const d = new Date(t.schedule_at)
    scheduleTime.value = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  } else {
    const d = new Date(Date.now() + 3600000)
    scheduleTime.value = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  }
  showSchedule.value = true
}
async function confirmSchedule() {
  if (!scheduleTime.value) return alert('请选择时间')
  try {
    await api.request(`/mailer/tasks/${scheduleTask_.value.id}/schedule`, {
      method: 'POST',
      body: JSON.stringify({ schedule_at: new Date(scheduleTime.value).toISOString() })
    })
    showSchedule.value = false
    await loadAll()
    alert(`定时已设置！将于 ${new Date(scheduleTime.value).toLocaleString('zh-CN')} 自动开始发送`)
  } catch (e) { alert('设置失败: ' + e.message) }
}

</script>

<style scoped>
.mailer-page { padding: 0 }
h1 { font-size: 24px; font-weight: 700; margin-bottom: 24px; color: #1e293b }

/* Tabs */
.tabs { display: flex; gap: 4px; margin-bottom: 20px; background: #f1f5f9; border-radius: 10px; padding: 4px }
.tab { padding: 8px 18px; border: none; background: none; cursor: pointer; border-radius: 8px; font-size: 13px; font-weight: 600; color: #64748b; transition: all 0.15s }
.tab.active { background: #fff; color: #1e293b; box-shadow: 0 1px 3px rgba(0,0,0,0.08) }

.tab-body { background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 20px }
.toolbar { display: flex; gap: 10px; margin-bottom: 16px }
.empty { text-align: center; color: #94a3b8; font-size: 14px; padding: 30px }

/* List cards */
.list-card { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid #f1f5f9 }
.list-card:last-child { border-bottom: none }
.lc-main { display: flex; flex-direction: column; gap: 3px }
.lc-main strong { font-size: 14px; color: #1e293b }
.lc-sub { font-size: 12px; color: #64748b }
.lc-note { font-size: 11px; color: #94a3b8 }
.lc-actions { display: flex; gap: 6px; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end }

/* Task card extras */
.task-card { align-items: flex-start }
.rt-info { font-size: 12px; color: #059669; font-weight: 500; padding: 3px 8px; background: #f0fdf4; border-radius: 6px; margin-top: 2px }
.tag-urgent { font-size: 11px; font-weight: 700; color: #dc2626; background: #fef2f2; border: 1px solid #fca5a5; border-radius: 4px; padding: 1px 6px }
.tag-sched { font-size: 11px; font-weight: 700; color: #6366f1; background: #eff6ff; border: 1px solid #a5b4fc; border-radius: 4px; padding: 1px 6px }

/* Contact groups */
.group-bar { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px; padding:8px 0 }
.group-pill { font-size:12px; padding:4px 12px; border-radius:16px; border:1px solid #e2e8f0; background:#f8fafc; color:#475569; cursor:pointer; user-select:none; transition:all 0.15s; display:inline-flex; align-items:center; gap:4px }
.group-pill:hover { background:#e5e7eb; border-color:#94a3b8 }
.group-pill.active { background:#3b82f6; color:#fff; border-color:#3b82f6 }
.group-pill.small { font-size:11px; padding:2px 8px; border-radius:12px; border-color:#c4b5fd; color:#7c3aed; background:#f5f3ff }
.group-pill.small:hover { background:#ede9fe }
.group-del { font-size:14px; color:#94a3b8; cursor:pointer; line-height:1; margin-left:2px }
.group-del:hover { color:#ef4444 }

/* Domain groups */
.domain-group { margin-bottom:2px }
.domain-header { display:flex; align-items:center; gap:8px; padding:8px 12px; background:#f1f5f9; border-radius:6px; cursor:pointer; user-select:none; font-size:13px }
.domain-header:hover { background:#e2e8f0 }
.domain-header strong { color:#1e293b }
.domain-count { color:#64748b; font-size:12px }

/* Table */
.data-table { width: 100%; border-collapse: collapse; font-size: 13px }
.data-table th { background: #f8fafc; padding: 10px 12px; text-align: left; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0 }
.data-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9 }
.data-table tbody tr:hover { background: #f8fafc }
.row-actions { display: flex; gap: 6px }

/* Status */
.status-pending { color: #94a3b8 }
.status-running { color: #f59e0b; font-weight: 700 }
.status-done { color: #059669; font-weight: 700 }
.status-cancelled { color: #dc2626 }
.status-failed { color: #dc2626 }

/* Checks (read status) */
.check { font-weight: 700; font-size: 14px; letter-spacing: -2px }
.check.gray { color: #94a3b8 }
.check.blue { color: #3b82f6 }
.check.red { color: #dc2626 }

/* Form */
.grid { display: grid; gap: 14px }
.grid-2 { grid-template-columns: 1fr 1fr }
.form-group { margin-bottom: 12px }
.form-group label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 4px; color: #374151 }
.form-control { width: 100%; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; box-sizing: border-box }
textarea.form-control { resize: vertical; font-family: inherit }
.form-hint { font-size: 11px; color: #94a3b8; margin: 3px 0 0 }
.toggle-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px }

/* Buttons */
.btn { padding: 8px 18px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; border: none; transition: all 0.15s }
.btn-primary { background: #3b82f6; color: #fff }
.btn-primary:hover { background: #2563eb }
.btn-outline { background: #fff; color: #374151; border: 1px solid #d1d5db }
.btn-outline:hover { background: #f9fafb }
.btn-sm { padding: 5px 12px; font-size: 12px }
.btn:disabled { opacity: 0.5; cursor: not-allowed }
.err-btn { color: #dc2626 !important; border-color: #fca5a5 !important }

/* Rich editor */
.editor-toolbar { display: flex; gap: 2px; flex-wrap: wrap; padding: 6px; background: #f8fafc; border: 1px solid #e2e8f0; border-bottom: none; border-radius: 8px 8px 0 0 }
.editor-toolbar button { padding: 4px 8px; border: 1px solid #e2e8f0; background: #fff; border-radius: 4px; cursor: pointer; font-size: 12px; color: #374151; min-width: 30px }
.editor-toolbar button:hover { background: #eff6ff }
.editor-toolbar .sep { width: 1px; background: #e2e8f0; margin: 0 4px }
.rich-editor { min-height: 250px; max-height: 500px; overflow-y: auto; padding: 14px; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px; font-size: 14px; line-height: 1.7; outline: none }
.rich-editor:focus { border-color: #93c5fd }
.rich-editor img { max-width: 100%; cursor: pointer }

/* Modals */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 1000 }
.modal-box { background: #fff; border-radius: 14px; padding: 28px; width: 520px; max-width: 95vw; max-height: 90vh; overflow-y: auto }
.modal-lg { width: 700px }
.modal-box h3 { margin: 0 0 18px; font-size: 18px; font-weight: 700 }
.modal-actions { display: flex; gap: 10px; margin-top: 16px }

/* Check list */
.check-list { max-height: 160px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px }
.check-item { display: flex; align-items: center; gap: 8px; padding: 5px 8px; cursor: pointer; font-size: 13px; border-radius: 4px }
.check-item:hover { background: #f0f4ff }
.check-item-header { padding: 4px 8px; border-bottom: 1px solid #f1f5f9; margin-bottom: 2px }

/* Preview */
.preview-frame { border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; max-height: 500px; overflow-y: auto }

/* Image resize popup */
.img-resize-popup { background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.12); padding: 8px 12px; display: flex; align-items: center; gap: 8px; font-size: 13px; white-space: nowrap }

/* Follow-up contact lock */
.followup-contacts-locked { background: #fefce8; border: 1px solid #fde047; border-radius: 8px; padding: 12px 14px; font-size: 13px; color: #854d0e }
.followup-contacts-locked p { margin: 4px 0 0; color: #78350f; opacity: 0.8 }

/* Realtime countdown */
.rt-info { font-size: 12px; color: #059669; font-weight: 500; padding: 3px 8px; background: #f0fdf4; border-radius: 6px; margin-top: 2px }
.tag-urgent { font-size: 11px; font-weight: 700; color: #dc2626; background: #fef2f2; border: 1px solid #fca5a5; border-radius: 4px; padding: 1px 6px }
.tag-sched { font-size: 11px; font-weight: 700; color: #6366f1; background: #eff6ff; border: 1px solid #a5b4fc; border-radius: 4px; padding: 1px 6px }

/* Rich editor */
/* Native RTE (iframe editor) */
.rte-toolbar { display:flex; flex-wrap:wrap; align-items:center; gap:2px; padding:6px 8px; background:#f8fafc; border:1px solid #e2e8f0; border-bottom:none; border-radius:8px 8px 0 0 }
.rte-btn { background:none; border:1px solid transparent; border-radius:4px; cursor:pointer; padding:3px 7px; font-size:13px; color:#374151; position:relative; transition:background 0.1s }
.rte-btn:hover { background:#e5e7eb; border-color:#d1d5db }
.rte-sep { width:1px; height:18px; background:#d1d5db; margin:0 4px; align-self:center }
.rte-frame { width:100%; height:320px; border:1px solid #e2e8f0; border-radius:0 0 8px 8px; background:#fff; display:block }

/* Grouped logs */
.log-group { border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 8px; overflow: hidden }
.log-group-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: #f8fafc; cursor: pointer; user-select: none; gap: 8px }
.log-group-header:hover { background: #f0f4ff }
.log-email { font-size: 13px; font-weight: 600; color: #1e293b; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
.log-badge { font-size: 11px; font-weight: 700; color: #3b82f6; background: #eff6ff; border: 1px solid #93c5fd; border-radius: 4px; padding: 1px 7px; white-space: nowrap }
.log-badge.follow { color: #7c3aed; background: #f5f3ff; border-color: #c4b5fd }
.log-time { font-size: 11px; color: #94a3b8 }
.log-records { border-top: 1px solid #e2e8f0; padding: 6px 0 }
.log-record { display: flex; align-items: center; padding: 7px 16px; font-size: 12px; border-bottom: 1px solid #f8fafc; gap: 4px }
.log-record:last-child { border-bottom: none }
.log-record-body { display: flex; align-items: center; gap: 10px; flex: 1; flex-wrap: wrap }
.log-round { font-weight: 700; color: #1e293b; min-width: 72px }
.log-subj { color: #64748b; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0 }

</style>
