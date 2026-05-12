<template>
  <div class="translations-page">
    <h1>🤖 AI 翻译管理</h1>

    <!-- AI 渠道管理 (可折叠) -->
    <div class="card">
      <div class="card-header-row" style="cursor:pointer" @click="channelCollapsed = !channelCollapsed">
        <h3>{{ channelCollapsed ? '▶' : '▼' }} 🤖 AI 渠道管理</h3>
        <div style="display:flex;align-items:center;gap:12px">
          <div class="multilingual-toggle">
            <span>多语言开关</span>
            <label class="switch">
              <input type="checkbox" v-model="settings.multilingual_enabled" @change="saveSettings" />
              <span class="slider"></span>
            </label>
            <span class="toggle-status" :class="settings.multilingual_enabled ? 'on' : 'off'">
              {{ settings.multilingual_enabled ? '已开启' : '已关闭' }}
            </span>
          </div>
          <button class="btn btn-primary btn-sm" @click="openChannelDialog()">➕ 添加渠道</button>
        </div>
      </div>
      <div class="card-body" v-show="!channelCollapsed">
        <div v-if="channels.length === 0" class="empty-tip">暂无 AI 渠道，请点击「添加渠道」创建</div>
        <div v-else class="channel-list">
          <div v-for="ch in channels" :key="ch.id" class="channel-card" :class="{ 'is-default': ch.is_default }">
            <div class="ch-header">
              <div class="ch-name" style="cursor:pointer" @click.stop="toggleChExpanded(ch.id)">
                <span style="color:#94a3b8;font-size:12px;margin-right:4px">{{ chExpanded[ch.id] ? '▼' : '▶' }}</span>
                <span class="ch-badge" v-if="ch.is_default">默认渠道</span>
                {{ ch.name }}
                <span v-if="ch.default_model && !chExpanded[ch.id]" class="model-tag" style="background:#dcfce7;color:#166534;margin-left:8px;font-size:11px">{{ ch.default_model }}</span>
              </div>
              <div class="ch-actions">
                <button class="btn btn-outline btn-xs" @click="testChannel(ch)" :disabled="ch._testing">🔌 {{ ch._testing ? '测试中...' : '测试' }}</button>
                <button class="btn btn-outline btn-xs" @click="openChannelDialog(ch)">✏️ 编辑</button>
                <button class="btn btn-outline btn-xs" @click="setDefaultChannel(ch.id)" v-if="!ch.is_default">⭐ 设为默认</button>
                <button class="btn btn-outline btn-xs btn-danger" @click="deleteChannel(ch.id)">🗑️</button>
              </div>
            </div>
            <div v-if="ch._testResult" class="ch-test-result" :class="ch._testResult.ok ? 'test-ok' : 'test-fail'">
              {{ ch._testResult.ok ? '✅ 连接成功' : '❌ 连接失败' }}: {{ ch._testResult.msg }}
            </div>
            <div class="ch-info" v-show="chExpanded[ch.id]">
              <div><span class="ch-label">API:</span> {{ ch.api_url }}</div>
              <div><span class="ch-label">Key:</span> {{ ch.api_key_display }}</div>
              <div><span class="ch-label">模型:</span>
                <span v-if="ch.models && ch.models.length" class="ch-models">
                  <span v-for="m in ch.models" :key="m" class="model-tag">{{ m }}</span>
                </span>
                <span v-else class="ch-no-model">未选择模型</span>
              </div>
              <div v-if="ch.default_model"><span class="ch-label">默认模型:</span> <span class="model-tag" style="background:#dcfce7;color:#166534">{{ ch.default_model }}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Channel Dialog -->
    <div class="modal-overlay" v-if="showChannelDialog" @click.self="showChannelDialog = false">
      <div class="modal-box">
        <h3>{{ editingChannel ? '编辑渠道' : '添加渠道' }}</h3>
        <div class="form-group">
          <label>渠道名称</label>
          <input v-model="channelForm.name" class="form-control" placeholder="例如：OpenAI / DeepSeek / 硅基流动" />
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label>API 地址</label>
            <input v-model="channelForm.api_url" class="form-control" placeholder="https://api.openai.com/v1" />
          </div>
          <div class="form-group">
            <label>API 密钥</label>
            <input v-model="channelForm.api_key" class="form-control" type="password" :placeholder="editingChannel ? '留空保持不变' : 'sk-...'" autocomplete="new-password" />
          </div>
        </div>
        <div class="form-group">
          <label>模型选择 <button class="btn btn-outline btn-xs" @click="fetchChannelModels" :disabled="fetchingChModels" style="margin-left:8px">{{ fetchingChModels ? '获取中...' : '🔍 一键获取可用模型' }}</button></label>
          <div style="display:flex; gap:8px; margin-bottom:8px;">
            <input v-model="modelSearchQuery" class="form-control" placeholder="🔍 搜索已获取的模型，或手动输入模型名称按回车添加..." @keyup.enter="addManualModel" style="flex:1;" />
            <button class="btn btn-outline" @click="addManualModel" :disabled="!modelSearchQuery.trim()">➕ 添加</button>
          </div>
          <div class="model-list" v-if="filteredChannelModelList.length">
            <div v-for="m in filteredChannelModelList" :key="m" class="model-item"
                 :class="{ selected: channelForm.models.includes(m) }"
                 @click="toggleModel(m)">
              <span class="model-check">{{ channelForm.models.includes(m) ? '☑' : '☐' }}</span> {{ m }}
            </div>
          </div>
          <div v-else-if="channelModelList.length && !filteredChannelModelList.length" class="empty-tip" style="padding: 10px 0;">未找到匹配的模型</div>
          <div v-else-if="!channelModelList.length" class="empty-tip" style="padding: 10px 0;">点击上方「一键获取可用模型」，或直接在输入框手动添加</div>
          <div v-if="channelForm.models.length" class="selected-models">
            <span class="ch-label">已选模型：</span>
            <span v-for="m in channelForm.models" :key="m" class="model-tag removable" @click="removeModel(m)">{{ m }} ×</span>
          </div>
        </div>
        <div class="form-group" v-if="channelForm.models.length">
          <label>默认翻译模型</label>
          <select v-model="channelForm.default_model" class="form-control">
            <option value="">自动选择（使用列表第一个）</option>
            <option v-for="m in channelForm.models" :key="m" :value="m">{{ m }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="channelForm.is_default" /> 设为默认渠道（翻译时使用）
          </label>
        </div>
        <div class="btn-row" style="justify-content:flex-end">
          <button class="btn btn-outline" @click="showChannelDialog = false">取消</button>
          <button class="btn btn-primary" @click="saveChannel" :disabled="savingChannel">
            {{ savingChannel ? '保存中...' : '💾 保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── 后台翻译任务面板 ── -->
    <div class="card" style="margin-top:20px">
      <div class="card-header-row" style="cursor:pointer" @click="jobPanelCollapsed = !jobPanelCollapsed">
        <h3>{{ jobPanelCollapsed ? '▶' : '▼' }} 🖥️ 后台翻译任务
          <span v-if="activeJob && activeJob.status === 'running'" class="badge-running">运行中</span>
          <span v-else-if="latestJob && latestJob.status === 'done'" class="badge-done">已完成</span>
          <span v-else-if="latestJob && latestJob.status === 'aborted'" class="badge-aborted">已中止</span>
        </h3>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn btn-outline btn-xs" @click.stop="clearJobLogs" v-if="jobList.length" title="清空所有日志">🗑️ 清空日志</button>
          <button class="btn btn-outline btn-xs" @click.stop="loadJobList">🔄 刷新</button>
        </div>
      </div>
      <div class="card-body" v-show="!jobPanelCollapsed">
        <p class="page-desc">翻译任务在服务器后台运行，关闭浏览器后仍会继续。日志保留 3 天，可手动清空。</p>

        <!-- Active job progress -->
        <div v-if="activeJob" class="job-active-box">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <strong>🔄 任务 #{{ activeJob.id }} — 正在运行</strong>
            <button class="btn btn-sm btn-danger-outline" @click="abortJob(activeJob.id)">⛔ 中止</button>
          </div>
          <div class="progress-bar-wrap">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: activeJobPct + '%' }"></div>
            </div>
            <div class="progress-text">
              {{ activeJob.done_items }}/{{ activeJob.total_items }} 项 | ✅ {{ activeJob.ok_items }} | ⚠️ {{ activeJob.error_items }} 错误
            </div>
          </div>
          <!-- Live log panel -->
          <div class="log-panel" style="margin-top:12px" ref="jobLogPanelRef">
            <div class="log-header">
              <span>📝 实时日志 ({{ activeJobLogs.length }} 条)</span>
              <span style="font-size:12px;color:#94a3b8">每 2 秒自动刷新</span>
            </div>
            <div class="log-body">
              <div v-for="log in activeJobLogs" :key="log.id" :class="['log-entry', log.level]">
                <span class="log-time">{{ log.created_at?.slice(11,19) }}</span>
                <span class="log-icon">{{ log.level === 'ok' ? '✅' : log.level === 'error' ? '❌' : log.level === 'warn' ? '⚠️' : 'ℹ️' }}</span>
                <span class="log-msg">{{ log.message }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Latest completed job display -->
        <div v-else-if="latestJob && !activeJob">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span>
              任务 #{{ latestJob.id }} —
              <span v-if="latestJob.status==='done'" style="color:#22c55e">✅ 已完成</span>
              <span v-else-if="latestJob.status==='aborted'" style="color:#f59e0b">⛔ 已中止</span>
              <span v-else-if="latestJob.status==='error'" style="color:#ef4444">❌ 错误</span>
              | 成功 {{ latestJob.ok_items }} | 失败 {{ latestJob.error_items }}
            </span>
            <button class="btn btn-outline btn-xs" @click="viewJobLogs(latestJob.id)">📋 查看日志</button>
          </div>
          <!-- Failed items -->
          <div v-if="latestJob.failed_items?.length" style="margin-top:12px">
            <div class="result-summary has-error" style="margin-bottom:8px">
              ⚠️ {{ latestJob.failed_items.length }} 个项目{{ latestJob.auto_retried ? '（已自动重试一次）' : '' }}失败，需手动重试
            </div>
            <div style="max-height:120px;overflow-y:auto;font-size:12px;color:#94a3b8;margin-bottom:8px">
              <div v-for="(f, i) in latestJob.failed_items.slice(0,20)" :key="i">
                [{{ f.targetLang }}] {{ f.itemName || f.type + '#' + f.id }}
              </div>
              <div v-if="latestJob.failed_items.length > 20" style="color:#f59e0b">...还有 {{ latestJob.failed_items.length - 20 }} 项</div>
            </div>
            <button class="btn btn-warning" @click="retryJobFailed(latestJob.id)" :disabled="!!activeJob">
              🔄 手动重试失败项目 ({{ latestJob.failed_items.length }})
            </button>
          </div>
          <!-- Job log panel after completion -->
          <div v-if="latestJobLogs.length" class="log-panel" style="margin-top:12px">
            <div class="log-header"><span>📝 任务日志 ({{ latestJobLogs.length }} 条)</span></div>
            <div class="log-body">
              <div v-for="log in latestJobLogs" :key="log.id" :class="['log-entry', log.level]">
                <span class="log-time">{{ log.created_at?.slice(11,19) }}</span>
                <span class="log-icon">{{ log.level === 'ok' ? '✅' : log.level === 'error' ? '❌' : log.level === 'warn' ? '⚠️' : 'ℹ️' }}</span>
                <span class="log-msg">{{ log.message }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="empty-tip">暂无翻译任务记录。点击「🚀 在服务器后台启动翻译」开始。</div>

        <!-- Job history list -->
        <div v-if="jobList.length > 1" style="margin-top:16px">
          <div class="section-title" style="font-size:13px;margin-bottom:8px">历史任务记录</div>
          <div class="job-history-list">
            <div v-for="job in jobList.slice(0, 10)" :key="job.id" class="job-history-item"
                 :class="job.status" @click="viewJobLogs(job.id)">
              <span>#{{ job.id }}</span>
              <span>{{ job.target_lang === 'all' ? '🌍 全部语言' : job.target_lang }}</span>
              <span :class="'badge-' + job.status">{{ { running:'运行中', done:'✅完成', aborted:'⛔中止', error:'❌错误', pending:'等待中' }[job.status] || job.status }}</span>
              <span style="color:#94a3b8;font-size:11px">{{ job.ok_items }}/{{ job.total_items }}</span>
              <span style="color:#94a3b8;font-size:11px">{{ job.created_at?.slice(5,16) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Per-language per-page Translation -->
    <div class="card" style="margin-top:20px">
      <div class="card-body">
        <h3 class="section-title">🌐 全站翻译</h3>
        <p class="page-desc">选择目标语言和翻译范围，点击「后台启动」在服务器后台运行翻译任务（关闭浏览器不中断），或点击「浏览器内翻译」在本地执行（关闭浏览器会停止）。</p>

        <div v-if="nonEnLangs.length === 0" class="empty-tip">
          请先在 <a href="/admin/languages">🌍 语言管理</a> 中添加目标语言
        </div>

        <div v-else class="translate-panel">
          <!-- Target language selector -->
          <div class="panel-row">
            <div class="form-group" style="flex:1">
              <label>目标语言</label>
              <select v-model="selectedLang" class="form-control">
                <option value="all">🌍 全部语言</option>
                <option v-for="l in nonEnLangs" :key="l.code" :value="l.code">
                  {{ l.flag }} {{ l.name }} — {{ l.ai_translated ? '✓ 已翻译' : '待翻译' }}
                </option>
              </select>
            </div>
            <div class="form-group" style="flex:1">
              <label>翻译范围 <small style="color:#94a3b8;font-weight:400">(可多选)</small></label>
              <div class="scope-checks">
                <label class="scope-check" v-for="p in allPages" :key="p">
                  <input type="checkbox" :value="p" v-model="selectedPages" />
                  <span>{{ pageLabels[p] || p }}</span>
                </label>
                <button type="button" class="btn btn-xs btn-outline" @click="selectedPages = [...allPages]" style="margin-left:8px">全选</button>
                <button type="button" class="btn btn-xs btn-outline" @click="selectedPages = []" style="margin-left:4px">清空</button>
              </div>
            </div>
            <div class="form-group" style="width:120px">
              <label>并发数</label>
              <select v-model="concurrency" class="form-control">
                <option v-for="n in 10" :key="n" :value="n">{{ n }} 并发</option>
              </select>
            </div>
          </div>
          <div class="btn-row" style="gap:8px">
            <button class="btn btn-primary" @click="startBackgroundTranslate" :disabled="!!activeJob || !selectedLang">
              {{ activeJob ? '⏳ 后台任务运行中...' : '🚀 在服务器后台启动翻译' }}
            </button>
            <button class="btn btn-outline" @click="startTranslate" :disabled="translating || !selectedLang" style="font-size:12px">
              {{ translating ? '⏳ 翻译中...' : '💻 浏览器内翻译（调试用）' }}
            </button>
            <button v-if="failedItems.length" class="btn btn-warning" @click="retryFailed" :disabled="translating">
              🔄 重新翻译全部未完成 ({{ failedItems.length }})
            </button>
            <button v-if="translating" class="btn btn-outline" @click="abortTranslation">
              ⛔ 停止
            </button>
          </div>

          <!-- Real-time Progress Bar -->
          <div v-if="progressTotal > 0" class="progress-bar-wrap">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: progressPct + '%' }" :class="{ error: progressErrors > 0 }"></div>
            </div>
            <div class="progress-text">
              {{ progressDone }}/{{ progressTotal }} 项任务  |  ✅ {{ progressOk }} 项  |  ⚠️ {{ progressErrors }} 错误
              <span v-if="translating" class="spin">⏳</span>
            </div>
          </div>

          <!-- Real-time Log -->
          <div v-if="logEntries.length" class="log-panel" ref="logPanelRef">
            <div class="log-header">
              <span>📝 实时日志 ({{ logEntries.length }} 条)</span>
              <button class="btn btn-sm btn-outline" @click="logEntries = []">× 清空</button>
            </div>
            <div class="log-body">
              <div v-for="(log, i) in logEntries" :key="i" :class="['log-entry', log.type]">
                <span class="log-time">{{ log.time }}</span>
                <span class="log-icon">{{ log.type === 'ok' ? '✅' : log.type === 'error' ? '❌' : log.type === 'warn' ? '⚠️' : 'ℹ️' }}</span>
                <span class="log-msg">{{ log.msg }}</span>
              </div>
            </div>
          </div>
        </div>  <!-- end translate-panel -->

        <!-- Translation Results -->
        <div v-if="translateResult" class="result-panel">
          <div class="result-summary" :class="translateResult.errors?.length ? 'has-error' : 'all-ok'">
            <strong>翻译完成：</strong>
            成功 {{ translateResult.translated }} / {{ translateResult.total }} 项
            <span v-if="translateResult.errors?.length" class="err-count">
              ，{{ translateResult.errors.length }} 个错误
            </span>
          </div>

          <!-- Error logs -->
          <div v-if="translateResult.errors?.length" class="error-log">
            <h4>⚠️ 错误日志 ({{ translateResult.errors.length }} 个)</h4>
            <div v-for="(e, i) in translateResult.errors" :key="i" class="error-row">
              <code>{{ e.errorCode || 'ERR' }}</code>
              <strong>[{{ e.targetLang || '?' }}] {{ e.itemName || e.item || e.page || `Batch ${e.batch}` }}</strong>: {{ e.error }}
            </div>
          </div>
        </div>
      </div>
    </div>


    <!-- ── Granular Translation (Products / Articles) ── -->
    <div class="card" style="margin-top:20px">
      <div class="card-header-row" style="cursor:pointer" @click="granularCollapsed = !granularCollapsed">
        <h3>{{ granularCollapsed ? '▶' : '▼' }} 🎯 精细化翻译</h3>
      </div>
      <div class="card-body" v-show="!granularCollapsed">
        <p class="page-desc">选择特定产品或文章，翻译到指定语言。支持批量选择、实时进度、失败重试。</p>

        <!-- Tabs -->
        <div class="gt-tabs">
          <button class="gt-tab" :class="{ active: granularTab === 'product' }" @click="switchGranularTab('product')">📦 产品翻译</button>
          <button class="gt-tab" :class="{ active: granularTab === 'news' }" @click="switchGranularTab('news')">📰 文章翻译</button>
        </div>

        <!-- Toolbar -->
        <div class="gt-toolbar">
          <div class="form-group" v-if="granularTab === 'product'" style="flex:1;min-width:160px">
            <label>产品分组</label>
            <select v-model="gtCategoryId" class="form-control" @change="filterGranularItems">
              <option value="">全部产品</option>
              <option v-for="cat in gtCategories" :key="cat.id" :value="cat.id">{{ cat.name_en }}</option>
            </select>
          </div>
          <div class="form-group" style="flex:1;min-width:160px">
            <label>目标语言</label>
            <select v-model="gtSelectedLang" class="form-control">
              <option value="all">🌍 全部语言</option>
              <option v-for="l in gtLangs" :key="l.code" :value="l.code">{{ l.flag }} {{ l.name }}</option>
            </select>
          </div>
          <div class="form-group" style="width:110px">
            <label>并发数</label>
            <select v-model="gtConcurrency" class="form-control">
              <option v-for="n in 10" :key="n" :value="n">{{ n }} 并发</option>
            </select>
          </div>
        </div>

        <!-- Actions bar -->
        <div class="gt-actions">
          <label class="gt-select-all">
            <input type="checkbox" :checked="gtAllSelected" @change="toggleGtSelectAll" /> 全选
          </label>
          <span class="gt-selected-count" v-if="gtSelectedIds.length">已选 {{ gtSelectedIds.length }} 项</span>
          <div style="flex:1"></div>
          <button class="btn btn-primary" @click="startGranularTranslation" :disabled="gtTranslating || !gtSelectedIds.length">
            {{ gtTranslating ? '⏳ 翻译中...' : '🚀 开始翻译' }}
          </button>
          <button v-if="gtFailedIds.length" class="btn btn-warning" @click="retryGranularFailed" :disabled="gtTranslating">
            🔄 重试失败 ({{ [...new Set(gtFailedIds.map(f => f.id))].length }} 项 {{ gtFailedIds.length }} 语言)
          </button>
          <button v-if="gtTranslating" class="btn btn-outline" @click="stopGranularTranslation()">⛔ 停止</button>
        </div>

        <!-- Loading -->
        <div v-if="gtLoading" class="empty-tip">⏳ 加载中...</div>

        <!-- Item list -->
        <div v-else class="gt-list">
          <div v-for="item in gtFilteredItems" :key="item.id" class="gt-item" :class="gtOverallStatus(item)">
            <label class="gt-item-check">
              <input type="checkbox" :value="item.id" v-model="gtSelectedIds" />
            </label>
            <span class="gt-status-dot" :class="gtOverallStatus(item)"></span>
            <div class="gt-item-info">
              <span class="gt-item-name">{{ item.name }}</span>
              <span class="gt-item-category" v-if="item.category_name">{{ item.category_name }}</span>
            </div>
            <div class="gt-lang-tags">
              <span v-for="l in gtLangs" :key="l.code"
                    class="gt-lang-tag" :class="item.languages[l.code] || 'none'"
                    :title="l.name + ': ' + (item.languages[l.code] === 'full' ? '已翻译' : item.languages[l.code] === 'partial' ? '部分翻译' : '未翻译')">
                {{ l.flag || l.code }}
              </span>
            </div>
          </div>
          <div v-if="!gtFilteredItems.length" class="empty-tip">暂无{{ granularTab === 'product' ? '产品' : '文章' }}数据</div>
        </div>

        <!-- Pagination (news) -->
        <div v-if="granularTab === 'news' && gtTotalPages > 1" class="gt-pagination">
          <button class="btn btn-outline btn-sm" :disabled="gtPage <= 1" @click="gtPage--; filterGranularItems()">← 上一页</button>
          <span>第 {{ gtPage }} / {{ gtTotalPages }} 页</span>
          <button class="btn btn-outline btn-sm" :disabled="gtPage >= gtTotalPages" @click="gtPage++; filterGranularItems()">下一页 →</button>
        </div>

        <!-- Progress -->
        <div v-if="gtProgressTotal > 0" class="progress-bar-wrap">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: gtProgressPct + '%' }" :class="{ error: gtProgressErrors > 0 }"></div>
          </div>
          <div class="progress-text">
            {{ gtProgressDone }}/{{ gtProgressTotal }} 项  |  ✅ {{ gtProgressOk }}  |  ⚠️ {{ gtProgressErrors }} 错误
            <span v-if="gtTranslating" class="spin">⏳</span>
          </div>
        </div>

        <!-- Log -->
        <div v-if="gtLogEntries.length" class="log-panel" ref="gtLogPanelRef">
          <div class="log-header">
            <span>📝 翻译日志 ({{ gtLogEntries.length }})</span>
            <button class="btn btn-sm btn-outline" @click="gtLogEntries = []">× 清空</button>
          </div>
          <div class="log-body">
            <div v-for="(log, i) in gtLogEntries" :key="i" :class="['log-entry', log.type]">
              <span class="log-time">{{ log.time }}</span>
              <span class="log-icon">{{ log.type === 'ok' ? '✅' : log.type === 'error' ? '❌' : log.type === 'warn' ? '⚠️' : 'ℹ️' }}</span>
              <span class="log-msg">{{ log.msg }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>


    <!-- ── Translation Audit ── -->
    <div class="card" style="margin-top:20px">
      <div class="card-header-row" style="cursor:pointer" @click="auditCollapsed = !auditCollapsed">
        <h3>{{ auditCollapsed ? '▶' : '▼' }} 🔍 翻译完整性检查</h3>
      </div>
      <div class="card-body" v-show="!auditCollapsed">
        <p class="page-desc">AI 全自动检查所有产品和文章在各语言下的翻译情况，生成完整报告。可一键翻译缺失项。</p>

        <div class="gt-actions" style="margin-bottom:16px">
          <button class="btn btn-primary" @click="runAudit" :disabled="auditRunning">
            {{ auditRunning ? '⏳ 检查中...' : '🔍 开始检查' }}
          </button>
          <div class="form-group" style="width:110px;margin:0">
            <select v-model="auditConcurrency" class="form-control">
              <option v-for="n in 10" :key="n" :value="n">{{ n }} 并发</option>
            </select>
          </div>
          <button v-if="auditMissingAll.length" class="btn btn-warning" @click="translateAuditMissing" :disabled="auditTranslating">
            {{ auditTranslating ? '⏳ 翻译中...' : '🚀 一键翻译全部缺失 (' + auditMissingAll.length + ' 项)' }}
          </button>
          <button v-if="auditTranslating" class="btn btn-outline" @click="stopAuditTranslation()">⛔ 停止</button>
        </div>

        <!-- Audit Report -->
        <div v-if="auditReport.length" class="audit-report">
          <div v-for="lang in auditReport" :key="lang.code" class="audit-lang-section">
            <div class="audit-lang-header" @click="lang._expanded = !lang._expanded">
              <span class="audit-lang-flag">{{ lang.flag }}</span>
              <span class="audit-lang-name">{{ lang.name }}</span>
              <span v-if="auditLangTotalMissing(lang) === 0" class="audit-badge complete">✅ 全部翻译完成</span>
              <span v-else class="audit-badge incomplete">⚠️ {{ auditLangTotalMissing(lang) }} 项未完成</span>
              <span class="audit-stats">
                产品: {{ lang.products.complete }}/{{ lang.products.total }} |
                文章: {{ lang.news.complete }}/{{ lang.news.total }} |
                UI: {{ lang.ui_texts?.translated || 0 }}/{{ lang.ui_texts?.total || 0 }} |
                其他: {{ (lang.company?.complete||0) + (lang.page_texts?.complete||0) + (lang.categories?.complete||0) + (lang.news_categories?.complete||0) + (lang.hero?.complete||0) }}/{{ (lang.company?.total||0) + (lang.page_texts?.total||0) + (lang.categories?.total||0) + (lang.news_categories?.total||0) + (lang.hero?.total||0) }}
              </span>
              <span class="audit-expand">{{ lang._expanded ? '▼' : '▶' }}</span>
            </div>
            <div v-if="lang._expanded" class="audit-lang-body">
              <!-- UI Texts missing -->
              <div v-if="lang.ui_texts && lang.ui_texts.missing.length" class="audit-missing-section">
                <div class="audit-missing-title">🔤 缺失 UI 静态文字 ({{ lang.ui_texts.missing.length }}/{{ lang.ui_texts.total }})</div>
                <div class="audit-ui-keys">
                  <span v-for="k in lang.ui_texts.missing" :key="k" class="audit-ui-key">{{ k }}</span>
                </div>
                <button class="btn btn-sm btn-outline" style="margin-top:8px"
                  @click="translateSingleAuditItem('ui_text', 'static', lang.code)" :disabled="auditTranslating">
                  🚀 翻译全部缺失 UI 文字
                </button>
              </div>
              <!-- Company missing -->
              <div v-if="lang.company?.missing?.length" class="audit-missing-section">
                <div class="audit-missing-title">🏢 缺失公司信息翻译 ({{ lang.company.missing.length }})</div>
                <div v-for="m in lang.company.missing" :key="'co'+m.id" class="audit-missing-item">
                  <span class="gt-status-dot" :class="m.status"></span>
                  <span class="audit-item-name">{{ m.name }}</span>
                  <span class="audit-item-progress">{{ m.translated }}/{{ m.total }} 字段</span>
                  <button class="btn btn-sm btn-outline" @click="translateSingleAuditItem('company', m.id, lang.code)" :disabled="auditTranslating">翻译</button>
                </div>
              </div>
              <!-- Page texts missing -->
              <div v-if="lang.page_texts?.missing?.length" class="audit-missing-section">
                <div class="audit-missing-title">📝 缺失页面文字翻译 ({{ lang.page_texts.missing.length }})</div>
                <div v-for="m in lang.page_texts.missing" :key="'pt'+m.id" class="audit-missing-item">
                  <span class="gt-status-dot" :class="m.status"></span>
                  <span class="audit-item-name">{{ m.name }}</span>
                  <span class="audit-item-progress">{{ m.translated }}/{{ m.total }} 字段</span>
                  <button class="btn btn-sm btn-outline" @click="translateSingleAuditItem('page_text', m.id, lang.code)" :disabled="auditTranslating">翻译</button>
                </div>
              </div>
              <!-- Categories missing -->
              <div v-if="lang.categories?.missing?.length" class="audit-missing-section">
                <div class="audit-missing-title">📂 缺失分类翻译 ({{ lang.categories.missing.length }})</div>
                <div v-for="m in lang.categories.missing" :key="'cat'+m.id" class="audit-missing-item">
                  <span class="gt-status-dot" :class="m.status"></span>
                  <span class="audit-item-name">{{ m.name }}</span>
                  <span class="audit-item-progress">{{ m.translated }}/{{ m.total }} 字段</span>
                  <button class="btn btn-sm btn-outline" @click="translateSingleAuditItem('category', m.id, lang.code)" :disabled="auditTranslating">翻译</button>
                </div>
              </div>
              <!-- News Categories missing (产品介绍、案例) -->
              <div v-if="lang.news_categories?.missing?.length" class="audit-missing-section">
                <div class="audit-missing-title">📰 缺失新闻分组翻译 ({{ lang.news_categories.missing.length }})</div>
                <div v-for="m in lang.news_categories.missing" :key="'nc'+m.id" class="audit-missing-item">
                  <span class="gt-status-dot" :class="m.status"></span>
                  <span class="audit-item-name">{{ m.name }}</span>
                  <span class="audit-item-progress">{{ m.translated }}/{{ m.total }} 字段</span>
                  <button class="btn btn-sm btn-outline" @click="translateSingleAuditItem('news_category', m.id, lang.code)" :disabled="auditTranslating">翻译</button>
                </div>
              </div>
              <!-- Hero missing -->
              <div v-if="lang.hero?.missing?.length" class="audit-missing-section">
                <div class="audit-missing-title">🏠 缺失 Hero 区域翻译 ({{ lang.hero.missing.length }})</div>
                <div v-for="m in lang.hero.missing" :key="'hero'+m.id" class="audit-missing-item">
                  <span class="gt-status-dot" :class="m.status"></span>
                  <span class="audit-item-name">{{ m.name }}</span>
                  <span class="audit-item-progress">{{ m.translated }}/{{ m.total }} 字段</span>
                  <button class="btn btn-sm btn-outline" @click="translateSingleAuditItem('hero', m.id, lang.code)" :disabled="auditTranslating">翻译</button>
                </div>
              </div>
              <!-- Missing products -->
              <div v-if="lang.products.missing.length" class="audit-missing-section">
                <div class="audit-missing-title">📦 缺失产品翻译 ({{ lang.products.missing.length }})</div>
                <div v-for="m in lang.products.missing" :key="'p'+m.id" class="audit-missing-item">
                  <span class="gt-status-dot" :class="m.status"></span>
                  <span class="audit-item-name">{{ m.name }}</span>
                  <span class="audit-item-cat" v-if="m.category_name">{{ m.category_name }}</span>
                  <span class="audit-item-progress">{{ m.translated }}/{{ m.total }} 字段</span>
                  <span class="audit-missing-fields" v-if="m.missingFields?.length" :title="m.missingFields.join(', ')">缺: {{ m.missingFields.slice(0,3).join(', ') }}{{ m.missingFields.length > 3 ? '...' : '' }}</span>
                  <button class="btn btn-sm btn-outline" @click="translateSingleAuditItem('product', m.id, lang.code)" :disabled="auditTranslating">翻译</button>
                </div>
              </div>
              <!-- Missing news -->
              <div v-if="lang.news.missing.length" class="audit-missing-section">
                <div class="audit-missing-title">📰 缺失文章翻译 ({{ lang.news.missing.length }})</div>
                <div v-for="m in lang.news.missing" :key="'n'+m.id" class="audit-missing-item">
                  <span class="gt-status-dot" :class="m.status"></span>
                  <span class="audit-item-name">{{ m.name }}</span>
                  <span class="audit-item-progress">{{ m.translated }}/{{ m.total }} 字段</span>
                  <span class="audit-missing-fields" v-if="m.missingFields?.length" :title="m.missingFields.join(', ')">缺: {{ m.missingFields.slice(0,3).join(', ') }}{{ m.missingFields.length > 3 ? '...' : '' }}</span>
                  <button class="btn btn-sm btn-outline" @click="translateSingleAuditItem('news', m.id, lang.code)" :disabled="auditTranslating">翻译</button>
                </div>
              </div>
              <div v-if="auditLangTotalMissing(lang) === 0" class="empty-tip" style="padding:12px">
                🎉 该语言所有内容均已翻译完成！
              </div>
            </div>
          </div>
        </div>

        <!-- Audit Progress -->
        <div v-if="auditProgressTotal > 0" class="progress-bar-wrap" style="margin-top:16px">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: auditProgressPct + '%' }"></div>
          </div>
          <div class="progress-text">
            {{ auditProgressDone }}/{{ auditProgressTotal }} |  ✅ {{ auditProgressOk }}  |  ⚠️ {{ auditProgressErrors }} 错误
            <span v-if="auditTranslating" class="spin">⏳</span>
          </div>
        </div>

        <!-- Audit Log -->
        <div v-if="auditLogEntries.length" class="log-panel" ref="auditLogPanelRef" style="margin-top:12px">
          <div class="log-header">
            <span>📝 检查/翻译日志 ({{ auditLogEntries.length }})</span>
            <button class="btn btn-sm btn-outline" @click="auditLogEntries = []">× 清空</button>
          </div>
          <div class="log-body">
            <div v-for="(log, i) in auditLogEntries" :key="i" :class="['log-entry', log.type]">
              <span class="log-time">{{ log.time }}</span>
              <span class="log-icon">{{ log.type === 'ok' ? '✅' : log.type === 'error' ? '❌' : log.type === 'warn' ? '⚠️' : 'ℹ️' }}</span>
              <span class="log-msg">{{ log.msg }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Manual Search & Replace -->
    <div class="card" style="margin-top:20px">
      <div class="card-body">
        <h3 class="section-title">✏️ 手动搜索 &amp; 替换翻译</h3>
        <p class="page-desc">搜索前台未翻译的内容，手动输入翻译并保存。保存后 AI 翻译时会优先参考这些记录。</p>

        <div class="search-row">
          <select v-model="searchLang" class="form-control" style="width:160px;flex-shrink:0">
            <option value="" disabled>选择目标语言</option>
            <option v-for="l in nonEnLangs" :key="l.code" :value="l.code">{{ l.flag }} {{ l.name }}</option>
          </select>
          <select v-model="searchPage" class="form-control" style="width:160px;flex-shrink:0">
            <option value="all">所有页面</option>
            <option value="products">产品</option>
            <option value="news">新闻</option>
            <option value="company">公司信息</option>
            <option value="page_texts">页面文字</option>
            <option value="ral_colors">🎨 RAL颜色</option>
          </select>
          <input v-model="searchQuery" class="form-control" placeholder="关键词（留空查全部未翻译）" @keyup.enter="doSearch" />
          <button class="btn btn-outline" @click="doSearch" :disabled="searching || !searchLang">
            {{ searching ? '搜索中...' : '搜索' }}
          </button>
        </div>

        <div v-if="searchResults.length" class="search-results">
          <div v-for="(item, idx) in searchResults" :key="idx" class="result-item">
            <div class="result-meta">📄 {{ item.page }} — {{ item.field }}</div>
            <div class="result-original">{{ item.original }}</div>
            <div class="result-replace">
              <input v-model="item.replacement" class="form-control"
                     :placeholder="`输入 ${searchLang} 翻译...`" />
              <button class="btn btn-sm btn-primary" @click="saveOverride(item)" :disabled="item.saving">
                {{ item.saving ? '...' : '保存' }}
              </button>
            </div>
            <div v-if="item.saved" class="result-saved">✅ 已保存</div>
          </div>
        </div>
        <p v-else-if="searched && !searching" class="empty-tip">
          {{ searchResults.length === 0 ? '✅ 未找到未翻译的内容（可能已全部翻译）' : '' }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, nextTick } from 'vue'
import api from '../../api'

defineOptions({ name: 'TranslationsPage' })

const settings = reactive({
  api_url: 'https://api.openai.com/v1',
  api_key: '',
  model_name: 'gpt-3.5-turbo',
  multilingual_enabled: true,
  source_lang: 'en'
})

// AI Channel CRUD
const channels = ref([])
const showChannelDialog = ref(false)
const editingChannel = ref(null)
const channelModelList = ref([])
const modelSearchQuery = ref('')
const filteredChannelModelList = computed(() => {
  if (!modelSearchQuery.value) return channelModelList.value
  const q = modelSearchQuery.value.toLowerCase()
  return channelModelList.value.filter(m => m.toLowerCase().includes(q))
})

function addManualModel() {
  const m = modelSearchQuery.value.trim()
  if (!m) return
  if (!channelForm.models.includes(m)) {
    channelForm.models.push(m)
  }
  if (!channelModelList.value.includes(m)) {
    channelModelList.value.push(m)
  }
  modelSearchQuery.value = ''
}

const fetchingChModels = ref(false)
const savingChannel = ref(false)
const channelForm = reactive({
  name: '', api_url: 'https://api.openai.com/v1', api_key: '', models: [], is_default: false, default_model: ''
})

// Channel expand state — separate reactive to avoid recomputing the list
const chExpanded = reactive({})
function toggleChExpanded(id) { chExpanded[id] = !chExpanded[id] }

async function testChannel(ch) {
  ch._testing = true
  ch._testResult = null
  try {
    const res = await api.testAIChannel(ch.id)
    ch._testResult = { ok: true, msg: res.reply?.slice(0, 80) || '模型响应正常' }
  } catch (e) {
    ch._testResult = { ok: false, msg: e.message?.slice(0, 120) || '连接失败' }
  } finally {
    ch._testing = false
  }
}

const languages = ref([])
const models = ref([])
const fetchingModels = ref(false)
const saving = ref(false)
const savedMsg = ref(false)

const selectedLang = ref('')
const allPages = ['products', 'news', 'company', 'page_texts', 'categories', 'hero', 'ui_texts_static', 'ral_colors']
const pageLabels = { products: '产品', news: '新闻', company: '公司信息', page_texts: '页面文字', categories: '产品分类', hero: 'Hero区域', ui_texts_static: 'UI静态文字', ral_colors: '🎨 RAL颜色' }
const selectedPages = ref([...allPages])
const concurrency = ref(3)
const translating = ref(false)
const translateResult = ref(null)
const logEntries = ref([])
const logPanelRef = ref(null)
const failedPages = ref([])
const progressTotal = ref(0)
const progressDone = ref(0)
const progressOk = ref(0)
const progressErrors = ref(0)
let aborted = false

const searchLang = ref('')
const searchPage = ref('all')
const searchQuery = ref('')
const searchResults = ref([])
const searching = ref(false)
const searched = ref(false)

// ── Background Job System State ──────────────────────────────────────────────
const jobPanelCollapsed = ref(false)
const jobList = ref([])
const activeJob = ref(null)        // currently running job (or null)
const latestJob = ref(null)        // most recently completed job
const activeJobLogs = ref([])      // live logs for active job
const latestJobLogs = ref([])      // logs for latest completed job
const jobLogPanelRef = ref(null)
let jobPollTimer = null
let lastLogId = 0

const activeJobPct = computed(() =>
  activeJob.value?.total_items
    ? Math.min(100, Math.round(activeJob.value.done_items / activeJob.value.total_items * 100))
    : 0
)

async function loadJobList() {
  try {
    const jobs = await api.getTranslationJobs()
    jobList.value = jobs || []
    const running = jobs.find(j => j.status === 'running')
    if (running) {
      activeJob.value = running
      if (!jobPollTimer) startJobPolling(running.id)
    } else {
      activeJob.value = null
      stopJobPolling()
      if (jobs.length) {
        latestJob.value = jobs[0]
        if (!latestJobLogs.value.length) await viewJobLogs(jobs[0].id)
      }
    }
  } catch (e) { /* silent */ }
}

function startJobPolling(jobId) {
  lastLogId = 0
  activeJobLogs.value = []
  stopJobPolling()
  jobPollTimer = setInterval(() => pollJobStatus(jobId), 2000)
  pollJobStatus(jobId) // immediate first poll
}

function stopJobPolling() {
  if (jobPollTimer) { clearInterval(jobPollTimer); jobPollTimer = null }
}

async function pollJobStatus(jobId) {
  try {
    const res = await api.getTranslationJobLogsSince(jobId, lastLogId)
    if (res.logs?.length) {
      activeJobLogs.value.push(...res.logs)
      lastLogId = res.logs[res.logs.length - 1].id
      // Auto-scroll log panel
      await nextTick()
      const el = jobLogPanelRef.value?.querySelector?.('.log-body')
      if (el) el.scrollTop = el.scrollHeight
    }
    if (res.job) {
      if (activeJob.value) Object.assign(activeJob.value, res.job)
      if (res.job.status !== 'running') {
        stopJobPolling()
        activeJob.value = null
        await loadJobList()
      }
    }
  } catch (e) { /* silent */ }
}

async function viewJobLogs(jobId) {
  try {
    const detail = await api.getTranslationJob(jobId)
    latestJob.value = { ...detail, logs: undefined }
    latestJobLogs.value = detail.logs || []
  } catch (e) { /* silent */ }
}

async function startBackgroundTranslate() {
  if (!selectedLang.value) return alert('请选择目标语言')
  if (!selectedPages.value.length) return alert('请至少选择一个翻译范围')
  if (activeJob.value) return alert('当前已有后台任务在运行，请等待完成或先中止')
  if (!confirm(`确定在服务器后台启动翻译任务？\n目标语言: ${selectedLang.value === 'all' ? '全部语言' : selectedLang.value}\n范围: ${selectedPages.value.join(', ')}`)) return
  try {
    const res = await api.createTranslationJob({ lang: selectedLang.value, pages: selectedPages.value, concurrency: concurrency.value })
    jobPanelCollapsed.value = false
    // Immediately reflect new running state
    activeJob.value = { id: res.jobId, status: 'running', total_items: 0, done_items: 0, ok_items: 0, error_items: 0 }
    activeJobLogs.value = []
    lastLogId = 0
    await loadJobList()
    startJobPolling(res.jobId)
    // Scroll to job panel
    setTimeout(() => document.querySelector('.card')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }), 300)
  } catch (e) {
    alert('启动失败: ' + e.message)
  }
}

async function abortJob(jobId) {
  if (!confirm('确定中止当前翻译任务？')) return
  try {
    await api.abortTranslationJob(jobId)
    stopJobPolling()
    activeJob.value = null
    await loadJobList()
  } catch (e) { alert('中止失败: ' + e.message) }
}

async function retryJobFailed(jobId) {
  if (!confirm('确定手动重试所有失败项目？')) return
  try {
    const res = await api.retryFailedTranslationJob(jobId)
    activeJob.value = { id: res.jobId, status: 'running', total_items: 0, done_items: 0, ok_items: 0, error_items: 0 }
    activeJobLogs.value = []
    lastLogId = 0
    jobPanelCollapsed.value = false
    startJobPolling(res.jobId)
    await loadJobList()
  } catch (e) { alert('创建重试任务失败: ' + e.message) }
}

async function clearJobLogs() {
  if (!confirm('确定清空所有翻译日志？（任务记录保留，日志内容删除）')) return
  try {
    await api.clearTranslationJobLogs()
    activeJobLogs.value = []
    latestJobLogs.value = []
    await loadJobList()
  } catch (e) { alert('清空失败: ' + e.message) }
}
// ── End Background Job System ────────────────────────────────────────────────

const nonEnLangs = computed(() => languages.value.filter(l => l.code !== 'en'))

const progressPct = computed(() => progressTotal.value ? Math.round(progressDone.value / progressTotal.value * 100) : 0)

onMounted(async () => {
  try {
    const [s, langs] = await Promise.all([
      api.getTranslationSettings(),
      api.getLanguages()
    ])
    if (s) {
      settings.api_url = s.api_url || 'https://api.openai.com/v1'
      settings.api_key = ''
      settings.model_name = s.model_name || 'gpt-3.5-turbo'
      settings.multilingual_enabled = !!s.multilingual_enabled
    }
    languages.value = langs || []
    await loadChannels()
    if (nonEnLangs.value.length > 0) {
      selectedLang.value = 'all'
      searchLang.value = nonEnLangs.value[0].code
    }
    // Load granular translation data
    loadGranularStatus()
    // Load background job list
    await loadJobList()
  } catch (e) {
    console.error('Failed to load settings:', e)
  }
})


const saveSettings = async () => {
  saving.value = true; savedMsg.value = false
  try {
    await api.saveTranslationSettings({
      api_url: settings.api_url,
      api_key: settings.api_key,
      model_name: settings.model_name,
      multilingual_enabled: settings.multilingual_enabled ? 1 : 0
    })
    savedMsg.value = true
    setTimeout(() => { savedMsg.value = false }, 3000)
  } catch (e) {
    alert('\u4fdd\u5b58\u5931\u8d25: ' + e.message)
  } finally {
    saving.value = false
  }
}

const fetchModels = async () => {
  if (!settings.api_key) return alert('\u8bf7\u5148\u586b\u5165 API \u5bc6\u94a5')
  fetchingModels.value = true; models.value = []
  try {
    const res = await api.fetchAIModels({ api_url: settings.api_url, api_key: settings.api_key })
    models.value = res.models || []
    if (!models.value.length) alert('\u672a\u83b7\u53d6\u5230\u6a21\u578b\u5217\u8868')
  } catch (e) {
    alert('\u83b7\u53d6\u6a21\u578b\u5931\u8d25: ' + e.message)
  } finally { fetchingModels.value = false }
}

// Channel CRUD Methods
async function loadChannels() {
  try {
    const data = await api.getAIChannels()
    // Sort newest first, add UI state
    channels.value = (data || [])
      .sort((a, b) => (b.id || 0) - (a.id || 0))
      .map(ch => ({ ...ch, _testing: false, _testResult: null }))
  } catch (e) { console.error('Load channels failed:', e) }
}

function openChannelDialog(ch = null) {
  editingChannel.value = ch
  channelModelList.value = ch?.models || []
  modelSearchQuery.value = ''
  if (ch) {
    channelForm.name = ch.name
    channelForm.api_url = ch.api_url
    channelForm.api_key = ''
    channelForm.models = [...(ch.models || [])]
    channelForm.is_default = !!ch.is_default
    channelForm.default_model = ch.default_model || ''
  } else {
    channelForm.name = ''
    channelForm.api_url = 'https://api.openai.com/v1'
    channelForm.api_key = ''
    channelForm.models = []
    channelForm.is_default = channels.value.length === 0
    channelForm.default_model = ''
  }
  showChannelDialog.value = true
}

function toggleModel(m) {
  const idx = channelForm.models.indexOf(m)
  if (idx >= 0) channelForm.models.splice(idx, 1)
  else channelForm.models.push(m)
}

function removeModel(m) {
  channelForm.models = channelForm.models.filter(x => x !== m)
}

async function fetchChannelModels() {
  if (editingChannel.value) {
    fetchingChModels.value = true
    try {
      const res = await fetch('/api/ai/channels/' + editingChannel.value.id + '/models', {
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
      })
      if (res.ok) {
        const data = await res.json()
        channelModelList.value = data.models || []
      } else {
        const err = await res.json().catch(() => ({}))
        alert('获取模型失败: ' + (err.error || res.statusText))
      }
    } catch (e) { alert('获取模型失败: ' + e.message) }
    finally { fetchingChModels.value = false }
  } else {
    if (!channelForm.api_key || !channelForm.api_url) return alert('请先填入 API 地址和密钥')
    fetchingChModels.value = true
    try {
      const res = await api.fetchAIModels({ api_url: channelForm.api_url, api_key: channelForm.api_key })
      channelModelList.value = res.models || []
      if (!channelModelList.value.length) alert('未获取到模型列表')
    } catch (e) { alert('获取模型失败: ' + e.message) }
    finally { fetchingChModels.value = false }
  }
}

async function saveChannel() {
  if (!channelForm.name) return alert('请填入渠道名称')
  if (!channelForm.api_url) return alert('请填入 API 地址')
  if (!editingChannel.value && !channelForm.api_key) return alert('请填入 API 密钥')
  savingChannel.value = true
  try {
    const body = { name: channelForm.name, api_url: channelForm.api_url, models: channelForm.models, is_default: channelForm.is_default, default_model: channelForm.default_model }
    if (channelForm.api_key) body.api_key = channelForm.api_key
    const headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') }
    if (editingChannel.value) {
      await fetch('/api/ai/channels/' + editingChannel.value.id, { method: 'PUT', headers, body: JSON.stringify(body) })
    } else {
      body.api_key = channelForm.api_key
      await fetch('/api/ai/channels', { method: 'POST', headers, body: JSON.stringify(body) })
    }
    showChannelDialog.value = false
    await loadChannels()
  } catch (e) { alert('保存失败: ' + e.message) }
  finally { savingChannel.value = false }
}

async function deleteChannel(id) {
  if (!confirm('确定删除此渠道？')) return
  try {
    await fetch('/api/ai/channels/' + id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } })
    await loadChannels()
  } catch (e) { alert('删除失败: ' + e.message) }
}

async function setDefaultChannel(id) {
  try {
    await fetch('/api/ai/channels/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') },
      body: JSON.stringify({ is_default: true })
    })
    await loadChannels()
  } catch (e) { alert('设置失败: ' + e.message) }
}

function addLog(type, msg) {
  const now = new Date()
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
  logEntries.value.push({ type, msg, time })
  setTimeout(() => {
    const el = logPanelRef.value?.querySelector('.log-body')
    if (el) el.scrollTop = el.scrollHeight
  }, 50)
}

function abortTranslation() {
  aborted = true
  addLog('warn', '用户停止了翻译')
  // Reset translating state after a short delay to let workers finish
  setTimeout(() => {
    translating.value = false
    addLog('info', '📛 翻译已停止，可以重新开始')
  }, 1000)
}


const failedItems = ref([])
const channelCollapsed = ref(true)

const startTranslate = async () => {
  if (!selectedLang.value) return alert('请选择目标语言')
  if (!selectedPages.value.length) return alert('请至少选择一个翻译范围')
  aborted = false
  const pages = [...selectedPages.value]
  await runPages(pages)
}

async function retryFailed() {
  if (!failedItems.value.length) return
  const items = [...failedItems.value]
  failedItems.value = []
  addLog('info', `🔄 重试 ${items.length} 个失败项目`)
  aborted = false
  await runItems(items)
}

async function runPages(pages) {
  translating.value = true
  translateResult.value = null
  failedPages.value = []
  failedItems.value = []
  progressTotal.value = 0
  progressDone.value = 0
  progressOk.value = 0
  progressErrors.value = 0

  addLog('info', `开始翻译 → 目标语言: ${selectedLang.value === 'all' ? '全部语言' : selectedLang.value}，范围: ${pages.map(p => pageLabels[p] || p).join(', ')}`)

  addLog('info', `📋 正在获取待翻译内容列表...`)
  let allItemsList = []
  try {
    for (const page of pages) {
      const items = await api.getTranslationItems(page)
      allItemsList.push(...(items || []))
    }
    addLog('ok', `📋 共发现 ${allItemsList.length} 个基础待翻译项目`)
  } catch (e) {
    addLog('error', `❌ 获取翻译列表失败: ${e.message}`)
    translating.value = false
    return
  }

  if (allItemsList.length === 0) {
    addLog('ok', `✔ 无需翻译（已全部翻译）`)
    translating.value = false
    return
  }

  let finalItems = []
  if (selectedLang.value === 'all') {
    const langs = nonEnLangs.value.map(l => l.code)
    for (const item of allItemsList) {
      for (const lang of langs) {
        finalItems.push({ ...item, targetLang: lang })
      }
    }
  } else {
    for (const item of allItemsList) {
      finalItems.push({ ...item, targetLang: selectedLang.value })
    }
  }

  await runItems(finalItems)
}

async function runItems(itemsList) {
  translating.value = true
  progressTotal.value = itemsList.length
  progressDone.value = 0
  progressOk.value = 0
  progressErrors.value = 0
  const allResults = []
  const allErrors = []
  const newFailed = []

  const CONCURRENCY = concurrency.value || 3
  const BULK_SIZE = 1

  addLog('info', `⚡ 陪读蛙模式: ${CONCURRENCY} 个项目同时翻译, 每个项目内部多段并发`)

  let queueIdx = 0
  let consecutiveFailures = 0
  const MAX_CONSECUTIVE_FAILURES = 3

  async function worker() {
    while (queueIdx < itemsList.length) {
      if (aborted) break
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) break

      const chunk = []
      while (queueIdx < itemsList.length && chunk.length < BULK_SIZE) {
        chunk.push(itemsList[queueIdx++])
      }
      if (chunk.length === 0) break

      if (aborted || consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        for (const item of chunk) { newFailed.push(item); progressDone.value++ }
        addLog('warn', `⏭ 跳过 ${chunk.length} 个项目（已停止）`)
        continue
      }

      const totalFields = chunk.reduce((s, c) => s + (c.fields?.length || 0), 0)
      addLog('info', `→ 正在翻译: [${chunk[0].targetLang}] ${chunk[0].itemName} (${totalFields} 个字段)...`)

      try {
        const item = chunk[0]
        const res = await api.runTranslationOne(item.targetLang, item.type, item.id)
        const ok = res.results?.length || 0
        const errs = res.errors?.length || 0
        progressOk.value += ok
        progressErrors.value += errs

        if (res.results) allResults.push(...res.results.map(r => ({ ...r, targetLang: item.targetLang })))
        if (res.errors) allErrors.push(...res.errors.map(e => ({ ...e, targetLang: item.targetLang })))

        if (errs > 0 && ok === 0) {
          consecutiveFailures++
          for (const e of res.errors) {
            const code = e.errorCode ? `[${e.errorCode}]` : ''
            addLog('error', `   ❌ [${item.targetLang}] ${e.itemName || ''} ${code}: ${(e.error || '').slice(0, 120)}`)
          }
          for (const it of chunk) newFailed.push(it)
          if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            addLog('error', `🛑 连续 ${MAX_CONSECUTIVE_FAILURES} 次失败，自动停止翻译！请检查API密钥或网络连接`)
            aborted = true
          }
        } else if (errs > 0) {
          consecutiveFailures = 0  // 有成功就重置
          if (ok > 0) addLog('warn', `   ⚠️ [${item.targetLang}]「${chunk[0].itemName}」: ${ok} 成功, ${errs} 错误`)
          for (const it of chunk) newFailed.push(it)
        } else if (ok === 0) {
          consecutiveFailures = 0
          addLog('ok', `   ✔ [${item.targetLang}]「${chunk[0].itemName}」无需翻译`)
        } else {
          consecutiveFailures = 0
          addLog('ok', `   ✅ [${item.targetLang}]「${chunk[0].itemName}」翻译成功: ${ok} 个字段`)
        }
      } catch (e) {
        consecutiveFailures++
        progressErrors.value += chunk.length
        for (const it of chunk) {
          allErrors.push({ item: it.itemName, error: e.message, errorCode: 'ERR_API', targetLang: it.targetLang })
          newFailed.push(it)
        }
        addLog('error', `   ❌ [${chunk[0].targetLang}]「${chunk[0].itemName}」翻译失败 (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}): ${e.message}`)
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          addLog('error', `🛑 连续 ${MAX_CONSECUTIVE_FAILURES} 次失败，自动停止翻译！请检查API密钥或网络连接`)
          aborted = true
        }
      }

      progressDone.value += chunk.length
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, Math.ceil(itemsList.length / BULK_SIZE)) }, () => worker())
  await Promise.all(workers)

  failedItems.value = newFailed
  failedPages.value = newFailed.length > 0 ? ['has_failures'] : []
  translateResult.value = {
    total: progressOk.value + progressErrors.value,
    translated: progressOk.value,
    results: allResults,
    errors: allErrors
  }

  addLog('info', `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  addLog(newFailed.length ? 'warn' : 'ok',
    `🏁 翻译完成: 成功 ${progressOk.value} 项, 错误 ${progressErrors.value} 项` +
    (newFailed.length ? ` | ${newFailed.length} 个项目需要重新翻译` : ' | 全部成功！')
  )
  if (newFailed.length) {
    addLog('info', `💡 点击「🔄 重新翻译全部未完成」可重新翻译所有有错误和失败的项目: ${newFailed.map(i => i.itemName).slice(0, 5).join(', ')}${newFailed.length > 5 ? '...' : ''}`)
  }
  addLog('info', `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)

  translating.value = false
  languages.value = await api.getLanguages()
}

// ── Search mode: untranslated or translated content ──
const searchMode = ref('translated')  // 'untranslated' | 'translated'
const findText = ref('')
const replaceText = ref('')
const batchReplacing = ref(false)

const doSearch = async () => {
  if (!searchLang.value) return alert('请选择目标语言')
  if (!searchQuery.value.trim()) return alert('请输入搜索关键词')
  searching.value = true; searched.value = false; searchResults.value = []
  try {
    let res
    if (searchMode.value === 'translated') {
      res = await api.searchTranslations(searchLang.value, searchQuery.value, searchPage.value)
      searchResults.value = (res || []).map(r => ({ ...r, original: r.original_text, replacement: '', saving: false, saved: false, field: r.content_field, content_type: r.content_type }))
    } else {
      res = await api.searchUntranslated(searchLang.value, searchQuery.value, searchPage.value)
      searchResults.value = (res || []).map(r => ({ ...r, replacement: '', saving: false, saved: false }))
    }
    searched.value = true
    // Auto-fill findText
    if (searchQuery.value) findText.value = searchQuery.value
  } catch (e) {
    alert(e.message)
  } finally {
    searching.value = false
  }
}

const saveOverride = async (item) => {
  if (!item.replacement.trim()) return alert('请输入翻译内容')
  item.saving = true
  try {
    if (searchMode.value === 'translated' && item.id) {
      // Replace within existing translation
      await api.replaceTranslation(item.id, findText.value || item.translated_text, item.replacement)
    } else {
      await api.saveTranslationOverride({
        language_code: searchLang.value,
        content_type: item.content_type,
        content_id: item.content_id || item.id,
        content_field: item.field,
        original_text: item.original,
        translated_text: item.replacement
      })
    }
    item.saved = true
    setTimeout(() => {
      searchResults.value = searchResults.value.filter(r => r !== item)
    }, 1500)
  } catch (e) { alert(e.message) } finally { item.saving = false }
}

// Batch replace all matching translations
const doBatchReplace = async () => {
  if (!searchLang.value) return alert('请选择目标语言')
  if (!findText.value.trim()) return alert('请输入要查找的文字')
  if (!confirm(`确认将所有包含「${findText.value}」的翻译替换为「${replaceText.value}」？此操作不可撤销！`)) return
  batchReplacing.value = true
  try {
    const res = await api.batchReplace(searchLang.value, findText.value, replaceText.value, searchPage.value)
    alert(`替换完成: 找到 ${res.found} 条, 替换 ${res.replaced} 条`)
    if (searchQuery.value) await doSearch()  // Refresh results
  } catch (e) {
    alert('替换失败: ' + e.message)
  } finally {
    batchReplacing.value = false
  }
}

// ── Granular Translation State ──────────────────────────────────────────────
const granularCollapsed = ref(false)
const granularTab = ref('product')
const gtCategoryId = ref('')
const gtCategories = ref([])
const gtLangs = ref([])
const gtSelectedLang = ref('all')
const gtConcurrency = ref(3)
const gtAllItems = ref([])
const gtFilteredItems = ref([])
const gtSelectedIds = ref([])
const gtLoading = ref(false)
const gtTranslating = ref(false)
let gtAborted = false   // plain boolean — Vue ref auto-unwrap in templates breaks assignment
const gtFailedIds = ref([])  // Array of { id, lang, itemName }
const gtLogEntries = ref([])
const gtLogPanelRef = ref(null)
const gtProgressTotal = ref(0)
const gtProgressDone = ref(0)
const gtProgressOk = ref(0)
const gtProgressErrors = ref(0)
const gtPage = ref(1)
const gtPageSize = 20
const gtTotalPages = ref(1)

const gtAllSelected = computed(() => gtFilteredItems.value.length > 0 && gtSelectedIds.value.length === gtFilteredItems.value.length)
const gtProgressPct = computed(() => gtProgressTotal.value ? Math.round(gtProgressDone.value / gtProgressTotal.value * 100) : 0)

function gtAddLog(type, msg) {
  const now = new Date()
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
  gtLogEntries.value.push({ type, msg, time })
  setTimeout(() => {
    const el = gtLogPanelRef.value?.querySelector?.('.log-body')
    if (el) el.scrollTop = el.scrollHeight
  }, 50)
}

function gtOverallStatus(item) {
  const statuses = Object.values(item.languages || {})
  if (!statuses.length) return 'none'
  const allFull = statuses.every(s => s === 'full')
  const hasAny = statuses.some(s => s === 'full' || s === 'partial')
  if (allFull) return 'full'
  if (hasAny) return 'partial'
  return 'none'
}

function toggleGtSelectAll() {
  if (gtAllSelected.value) {
    gtSelectedIds.value = []
  } else {
    gtSelectedIds.value = gtFilteredItems.value.map(i => i.id)
  }
}

async function switchGranularTab(tab) {
  granularTab.value = tab
  gtPage.value = 1
  gtCategoryId.value = ''
  gtSelectedIds.value = []
  await loadGranularStatus()
}

async function loadGranularStatus() {
  gtLoading.value = true
  try {
    const res = await api.getTranslationStatus(granularTab.value)
    gtAllItems.value = res.items || []
    gtLangs.value = res.languages || []
    if (granularTab.value === 'product') {
      const cats = await api.getCategories()
      gtCategories.value = cats || []
    }
    filterGranularItems()
  } catch (e) {
    console.error('Load translation status failed:', e)
    gtAllItems.value = []
    gtFilteredItems.value = []
  } finally {
    gtLoading.value = false
  }
}

function filterGranularItems() {
  let items = [...gtAllItems.value]
  if (granularTab.value === 'product' && gtCategoryId.value) {
    items = items.filter(i => String(i.category_id) === String(gtCategoryId.value))
  }
  if (granularTab.value === 'news') {
    gtTotalPages.value = Math.ceil(items.length / gtPageSize) || 1
    if (gtPage.value > gtTotalPages.value) gtPage.value = gtTotalPages.value
    const start = (gtPage.value - 1) * gtPageSize
    items = items.slice(start, start + gtPageSize)
  }
  gtFilteredItems.value = items
}

async function startGranularTranslation() {
  if (!gtSelectedIds.value.length) return alert('请选择要翻译的项目')
  const ids = [...gtSelectedIds.value]
  // Cancel any previous session's pending HTTP requests immediately
  if (window._gtAbortController) window._gtAbortController.abort()
  window._gtAbortController = new AbortController()
  const signal = window._gtAbortController.signal
  gtAborted = false
  gtTranslating.value = true
  gtFailedIds.value = []

  const langs = gtSelectedLang.value === 'all'
    ? gtLangs.value.map(l => l.code)
    : [gtSelectedLang.value]
  const langNames = gtSelectedLang.value === 'all'
    ? '全部语言'
    : (gtLangs.value.find(l => l.code === gtSelectedLang.value)?.name || gtSelectedLang.value)
  const type = granularTab.value
  // CONCURRENCY = 每个项目内「语言」的并发数（并发数越大速度越快，但需注意 API 限流）
  const CONCURRENCY = gtConcurrency.value || 3

  gtProgressTotal.value = ids.length * langs.length
  gtProgressDone.value = 0
  gtProgressOk.value = 0
  gtProgressErrors.value = 0

  gtAddLog('info',
    '开始精细化翻译 → ' + (type === 'product' ? '产品' : '文章') +
    ' ' + ids.length + ' 项, 语言: ' + langNames +
    ', 语言并发: ' + Math.min(CONCURRENCY, langs.length))
  gtAddLog('info', '📋 策略：每个项目的所有语言并发翻译，项目之间顺序执行')

  // ── 翻译单个项目的单种语言（含重试，超时不重试）──
  async function translateOneLang(itemId, langCode, itemName) {
    if (gtAborted) return false
    const langObj = gtLangs.value.find(l => l.code === langCode)
    const langLabel = langObj ? (langObj.flag || '') + ' ' + langObj.name : langCode
    gtAddLog('info', '  🔄「' + itemName + '」→ ' + langLabel + ' 翻译中...')
    let retries = 0
    let success = false
    let hasError = false
    while (!success && retries <= 1) {  // max 1 retry (not 2)
      if (gtAborted) break
      try {
        const res = await api.runTranslationOne(langCode, type, itemId, signal)
        const ok = res.results?.length || 0
        const errs = res.errors?.length || 0
        gtProgressOk.value += ok
        if (errs > 0 && ok === 0) {
          retries++
          if (retries > 1) {
            gtProgressErrors.value += errs
            hasError = true
            if (!gtFailedIds.value.find(f => f.id === itemId && f.lang === langCode)) gtFailedIds.value.push({ id: itemId, lang: langCode, itemName })
            for (const e of (res.errors || []))
              gtAddLog('error', '  ❌「' + itemName + '」[' + langLabel + '] ' + (e.error || '').slice(0, 120))
          } else {
            gtAddLog('warn', '  ⚠️「' + itemName + '」[' + langLabel + '] 失败，重试 1/1...')
          }
          continue
        }
        if (errs > 0) {
          gtProgressErrors.value += errs
          // Show what specifically failed
          for (const e of (res.errors || []))
            gtAddLog('warn', '  ⚠️「' + itemName + '」[' + langLabel + '] ' + (e.errorCode || '') + ' ' + (e.error || '').slice(0, 150))
          if (ok > 0) {
            gtAddLog('warn', '  ⚠️「' + itemName + '」[' + langLabel + '] 部分成功: ' + ok + ' 成功, ' + errs + ' 错误（可重试修复）')
          }
          hasError = true
          if (!gtFailedIds.value.find(f => f.id === itemId && f.lang === langCode)) gtFailedIds.value.push({ id: itemId, lang: langCode, itemName })
        } else if (ok > 0) {
          gtAddLog('ok', '  ✅「' + itemName + '」[' + langLabel + '] ' + ok + ' 个字段')
        } else {
          gtAddLog('ok', '  ✔「' + itemName + '」[' + langLabel + '] 无需翻译')
        }
        success = true
      } catch (e) {
        // 524 = Cloudflare timeout, 504 = gateway timeout — don't retry, it will just timeout again
        const isTimeout = e.message.includes('524') || e.message.includes('504') ||
          e.message.includes('timeout') || e.message.includes('超时')
        if (isTimeout) {
          gtProgressErrors.value++
          hasError = true
          if (!gtFailedIds.value.find(f => f.id === itemId && f.lang === langCode)) gtFailedIds.value.push({ id: itemId, lang: langCode, itemName })
          gtAddLog('error', '  ⏱️「' + itemName + '」[' + langLabel + '] 请求超时 — 文章内容过长，建议降低并发数或联系服务器管理员增加超时配置')
          break  // exit retry loop immediately, no point retrying a timeout
        }
        retries++
        if (retries > 1) {
          gtProgressErrors.value++
          hasError = true
          if (!gtFailedIds.value.find(f => f.id === itemId && f.lang === langCode)) gtFailedIds.value.push({ id: itemId, lang: langCode, itemName })
          gtAddLog('error', '  ❌「' + itemName + '」[' + langLabel + '] ' + e.message)
        } else {
          gtAddLog('warn', '  ⚠️「' + itemName + '」[' + langLabel + '] 失败，重试 1/1...')
        }
      }
    }
    gtProgressDone.value++
    return hasError
  }

  // ── 并发翻译单个项目的所有语言 ──
  async function translateOneItem(itemId) {
    const item = gtAllItems.value.find(i => i.id === itemId)
    const itemName = item?.name || '#' + itemId
    gtAddLog('info', '📦「' + itemName + '」开始翻译 (' + langs.length + ' 种语言，' + Math.min(CONCURRENCY, langs.length) + ' 并发)')
    let itemHasError = false
    let langQueueIdx = 0
    async function langWorker() {
      while (langQueueIdx < langs.length) {
        if (gtAborted) break
        const idx = langQueueIdx++
        if (idx >= langs.length) break
        const hasErr = await translateOneLang(itemId, langs[idx], itemName)
        if (hasErr) itemHasError = true
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, langs.length) }, () => langWorker()))
    if (gtAborted) gtAddLog('warn', '📦「' + itemName + '」翻译已停止')
    else if (itemHasError) gtAddLog('error', '📦「' + itemName + '」部分语言翻译失败 ✗')
    else gtAddLog('ok', '📦「' + itemName + '」全部语言翻译成功 ✓')
  }

  // ── 项目顺序执行（Article A 完成后再翻译 Article B）──
  for (const itemId of ids) {
    if (gtAborted) break
    await translateOneItem(itemId)
  }

  gtAddLog('info', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  const failedItemCount = [...new Set(gtFailedIds.value.map(f => f.id))].length
  gtAddLog(gtFailedIds.value.length ? 'warn' : 'ok',
    '🏁 翻译完成: 成功 ' + gtProgressOk.value + ' 项, 错误 ' + gtProgressErrors.value + ' 项' +
    (gtFailedIds.value.length ? ' | ' + failedItemCount + ' 个项目 ' + gtFailedIds.value.length + ' 个语言失败' : ' | 全部成功！')
  )
  gtAddLog('info', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  if (!gtAborted) {
    gtTranslating.value = false
    await loadGranularStatus()
  }
}

function stopGranularTranslation() {
  gtAborted = true
  // Cancel ALL in-flight fetch requests immediately → frees browser connections
  if (window._gtAbortController) {
    window._gtAbortController.abort()
    window._gtAbortController = null
  }
  gtTranslating.value = false
  gtAddLog('warn', '⛔ 已停止翻译，所有进行中的请求已取消')
}

async function retryGranularFailed() {
  if (!gtFailedIds.value.length) return
  const failedPairs = [...gtFailedIds.value]  // [{id, lang, itemName}, ...]
  const failedItemIds = [...new Set(failedPairs.map(f => f.id))]

  // Cancel any previous session
  if (window._gtAbortController) window._gtAbortController.abort()
  window._gtAbortController = new AbortController()
  const signal = window._gtAbortController.signal
  gtAborted = false
  gtTranslating.value = true
  gtFailedIds.value = []
  const type = granularTab.value
  const CONCURRENCY = gtConcurrency.value || 3

  gtProgressTotal.value = failedPairs.length
  gtProgressDone.value = 0
  gtProgressOk.value = 0
  gtProgressErrors.value = 0

  gtAddLog('info', '🔄 重试 ' + failedItemIds.length + ' 个项目的 ' + failedPairs.length + ' 个失败语言')

  // For each failed item, only translate its failed languages
  for (const itemId of failedItemIds) {
    if (gtAborted) break
    const itemFailedLangs = failedPairs.filter(f => f.id === itemId).map(f => f.lang)
    const itemName = failedPairs.find(f => f.id === itemId)?.itemName || '#' + itemId
    gtAddLog('info', '📦「' + itemName + '」重试 ' + itemFailedLangs.length + ' 种失败语言')

    let langQueueIdx = 0
    async function langWorker() {
      while (langQueueIdx < itemFailedLangs.length) {
        if (gtAborted) break
        const idx = langQueueIdx++
        if (idx >= itemFailedLangs.length) break
        const langCode = itemFailedLangs[idx]
        const langObj = gtLangs.value.find(l => l.code === langCode)
        const langLabel = langObj ? (langObj.flag || '') + ' ' + langObj.name : langCode
        gtAddLog('info', '  🔄「' + itemName + '」→ ' + langLabel + ' 重试中...')
        try {
          const res = await api.runTranslationOne(langCode, type, itemId, signal)
          const ok = res.results?.length || 0
          const errs = res.errors?.length || 0
          gtProgressOk.value += ok
          if (errs > 0) {
            gtProgressErrors.value += errs
            for (const e of (res.errors || []))
              gtAddLog('warn', '  ⚠️「' + itemName + '」[' + langLabel + '] ' + (e.errorCode || '') + ' ' + (e.error || '').slice(0, 150))
            if (!gtFailedIds.value.find(f => f.id === itemId && f.lang === langCode))
              gtFailedIds.value.push({ id: itemId, lang: langCode, itemName })
          }
          if (ok > 0 && errs === 0) {
            gtAddLog('ok', '  ✅「' + itemName + '」[' + langLabel + '] ' + ok + ' 个字段 (重试成功)')
          }
        } catch (e) {
          gtProgressErrors.value++
          if (!gtFailedIds.value.find(f => f.id === itemId && f.lang === langCode))
            gtFailedIds.value.push({ id: itemId, lang: langCode, itemName })
          gtAddLog('error', '  ❌「' + itemName + '」[' + langLabel + '] ' + e.message)
        }
        gtProgressDone.value++
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, itemFailedLangs.length) }, () => langWorker()))
  }

  gtAddLog('info', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  gtAddLog(gtFailedIds.value.length ? 'warn' : 'ok',
    '🏁 重试完成: 成功 ' + gtProgressOk.value + ' 项, 仍失败 ' + gtFailedIds.value.length + ' 个语言')
  gtAddLog('info', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  gtTranslating.value = false
  await loadGranularStatus()
}

// ── Translation Audit ──────────────────────────────────────────────────────
const auditCollapsed = ref(false)
const auditReport = ref([])
const auditRunning = ref(false)
const auditTranslating = ref(false)
let auditAborted = false   // plain boolean — same fix as gtAborted
const auditConcurrency = ref(3)
const auditLogEntries = ref([])
const auditLogPanelRef = ref(null)
const auditProgressTotal = ref(0)
const auditProgressDone = ref(0)
const auditProgressOk = ref(0)
const auditProgressErrors = ref(0)

function auditLangTotalMissing(lang) {
  let count = (lang.products?.missing?.length || 0) + (lang.news?.missing?.length || 0)
  count += (lang.ui_texts?.missing?.length || 0)
  count += (lang.company?.missing?.length || 0)
  count += (lang.page_texts?.missing?.length || 0)
  count += (lang.categories?.missing?.length || 0)
  count += (lang.news_categories?.missing?.length || 0)
  count += (lang.hero?.missing?.length || 0)
  return count
}

const auditMissingAll = computed(() => {
  const items = []
  for (const lang of auditReport.value) {
    for (const m of (lang.products?.missing || [])) {
      items.push({ type: 'product', id: m.id, name: m.name, lang: lang.code, langName: lang.name, langFlag: lang.flag })
    }
    for (const m of (lang.news?.missing || [])) {
      items.push({ type: 'news', id: m.id, name: m.name, lang: lang.code, langName: lang.name, langFlag: lang.flag })
    }
    // UI texts as single item per language
    if (lang.ui_texts?.missing?.length) {
      items.push({ type: 'ui_text', id: 'static', name: 'UI 静态文字 (' + lang.ui_texts.missing.length + ' keys)', lang: lang.code, langName: lang.name, langFlag: lang.flag })
    }
    for (const section of ['company', 'page_texts', 'categories', 'news_categories', 'hero']) {
      for (const m of (lang[section]?.missing || [])) {
        const typeMap = { company: 'company', page_texts: 'page_text', categories: 'category', news_categories: 'news_category', hero: 'hero' }
        items.push({ type: typeMap[section], id: m.id, name: m.name, lang: lang.code, langName: lang.name, langFlag: lang.flag })
      }
    }
  }
  return items
})
const auditProgressPct = computed(() => auditProgressTotal.value ? Math.round(auditProgressDone.value / auditProgressTotal.value * 100) : 0)

function auditAddLog(type, msg) {
  const now = new Date()
  const time = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0') + ':' + now.getSeconds().toString().padStart(2, '0')
  auditLogEntries.value.push({ type, msg, time })
  setTimeout(() => {
    const el = auditLogPanelRef.value?.querySelector?.('.log-body')
    if (el) el.scrollTop = el.scrollHeight
  }, 50)
}

async function runAudit() {
  auditRunning.value = true
  auditReport.value = []
  auditAddLog('info', '🔍 开始全站翻译完整性检查...')
  try {
    const res = await api.auditTranslations()
    const report = (res.report || []).map(r => ({ ...r, _expanded: false }))
    auditReport.value = report

    for (const lang of report) {
      const totalMissing = auditLangTotalMissing(lang)
      const uiMissing = lang.ui_texts?.missing?.length || 0
      const pMissing = lang.products?.missing?.length || 0
      const nMissing = lang.news?.missing?.length || 0
      const otherMissing = (lang.company?.missing?.length || 0) + (lang.page_texts?.missing?.length || 0) + (lang.categories?.missing?.length || 0) + (lang.hero?.missing?.length || 0)
      if (totalMissing === 0) {
        auditAddLog('ok', (lang.flag || '') + ' ' + lang.name + ': ✅ 全部翻译完成')
      } else {
        let detail = []
        if (pMissing) detail.push('产品缺 ' + pMissing)
        if (nMissing) detail.push('文章缺 ' + nMissing)
        if (uiMissing) detail.push('UI文字缺 ' + uiMissing)
        if (otherMissing) detail.push('其他缺 ' + otherMissing)
        auditAddLog('warn', (lang.flag || '') + ' ' + lang.name + ': ⚠️ ' + totalMissing + ' 项未完成 (' + detail.join(', ') + ')')
      }
    }
    auditAddLog('info', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    auditAddLog('ok', '🏁 检查完成! 共发现 ' + auditMissingAll.value.length + ' 项需要翻译')
  } catch (e) {
    auditAddLog('error', '❌ 检查失败: ' + e.message)
  } finally {
    auditRunning.value = false
  }
}

async function translateSingleAuditItem(type, id, langCode) {
  auditTranslating.value = true
  auditAborted = false
  const langObj = auditReport.value.find(r => r.code === langCode)
  const langLabel = langObj ? (langObj.flag || '') + ' ' + langObj.name : langCode
  auditAddLog('info', '🚀 翻译 [' + langLabel + '] ' + type + ' #' + id + '...')
  try {
    const res = await api.runTranslationOne(langCode, type, id)
    const ok = res.results?.length || 0
    const errs = res.errors?.length || 0
    if (ok > 0) auditAddLog('ok', '  ✅ 成功翻译 ' + ok + ' 个字段')
    if (errs > 0) auditAddLog('warn', '  ⚠️ ' + errs + ' 个错误')
    // Refresh audit
    await runAudit()
  } catch (e) {
    auditAddLog('error', '  ❌ 翻译失败: ' + e.message)
  } finally {
    auditTranslating.value = false
  }
}

async function translateAuditMissing() {
  if (!auditMissingAll.value.length) return
  auditAborted = false
  auditTranslating.value = true
  const items = [...auditMissingAll.value]
  const CONCURRENCY = auditConcurrency.value || 3

  auditProgressTotal.value = items.length
  auditProgressDone.value = 0
  auditProgressOk.value = 0
  auditProgressErrors.value = 0

  auditAddLog('info', '🚀 开始翻译全部缺失项: ' + items.length + ' 项, 并发: ' + CONCURRENCY)

  // Group by item (type+id) so each item translates all missing languages
  const itemMap = {}
  for (const it of items) {
    const key = it.type + '_' + it.id
    if (!itemMap[key]) itemMap[key] = { type: it.type, id: it.id, name: it.name, langs: [] }
    itemMap[key].langs.push({ code: it.lang, flag: it.langFlag, name: it.langName })
  }
  const itemGroups = Object.values(itemMap)

  let queueIdx = 0

  async function worker() {
    while (queueIdx < itemGroups.length) {
      if (auditAborted) break
      const idx = queueIdx++
      if (idx >= itemGroups.length) break
      const group = itemGroups[idx]

      let itemHasError = false
      auditAddLog('info', '📦「' + group.name + '」开始翻译 (' + group.langs.length + ' 种语言)')

      for (const lang of group.langs) {
        if (auditAborted) break
        const langLabel = (lang.flag || '') + ' ' + lang.name
        let retries = 0
        let success = false
        while (!success && retries <= 2) {
          if (auditAborted) break   // exit retry immediately on abort
          try {
            const res = await api.runTranslationOne(lang.code, group.type, group.id)
            const ok = res.results?.length || 0
            const errs = res.errors?.length || 0
            auditProgressOk.value += ok
            if (errs > 0 && ok === 0) {
              retries++
              if (retries > 2) {
                auditProgressErrors.value += errs
                itemHasError = true
                auditAddLog('error', '  ❌「' + group.name + '」[' + langLabel + '] ' + (res.errors?.[0]?.error || '').slice(0, 120))
              } else {
                auditAddLog('warn', '  ⚠️「' + group.name + '」[' + langLabel + '] 失败，重试 ' + retries + '/2...')
              }
              continue
            }
            if (ok > 0) auditAddLog('ok', '  ✅「' + group.name + '」[' + langLabel + '] ' + ok + ' 个字段')
            success = true
          } catch (e) {
            retries++
            if (retries > 2) {
              auditProgressErrors.value++
              itemHasError = true
              auditAddLog('error', '  ❌「' + group.name + '」[' + langLabel + '] ' + e.message)
            } else {
              auditAddLog('warn', '  ⚠️「' + group.name + '」[' + langLabel + '] 失败，重试 ' + retries + '/2...')
            }
          }
        }
        auditProgressDone.value++
      }
      if (auditAborted) {
        auditAddLog('warn', '📦「' + group.name + '」翻译已停止')
      } else if (itemHasError) {
        auditAddLog('error', '📦「' + group.name + '」部分语言翻译失败 ✗')
      } else {
        auditAddLog('ok', '📦「' + group.name + '」全部语言翻译成功 ✓')
      }
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, itemGroups.length) }, () => worker())
  await Promise.all(workers)

  auditAddLog('info', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  if (auditAborted) {
    auditAddLog('warn', '⛔ 翻译已手动停止 | 已完成 ' + auditProgressDone.value + '/' + auditProgressTotal.value + ' | 成功 ' + auditProgressOk.value + ' | 错误 ' + auditProgressErrors.value)
    auditAddLog('info', '💡 可再次点击"一键翻译全部缺失"继续翻译剩余项目')
  } else {
    auditAddLog('ok', '🏁 缺失翻译完成: 成功 ' + auditProgressOk.value + ', 错误 ' + auditProgressErrors.value)
  }
  auditTranslating.value = false

  // Refresh audit report to update missing list
  await runAudit()
  // Refresh granular status too
  loadGranularStatus()
}

function stopAuditTranslation() {
  auditAborted = true
  auditTranslating.value = false   // immediately reset button state
  auditAddLog('warn', '⛔ 用户已停止，当前进行中的 API 请求完成后将停止')
}
</script>

<style scoped>
.translations-page h1 { margin-bottom: 20px; font-size: 22px; }
.page-desc { color: #64748b; font-size: 14px; margin-bottom: 16px; }
.section-title { margin: 0 0 10px; font-size: 16px; }

.card { background: white; border-radius: 12px; box-shadow: 0 1px 6px rgba(0,0,0,0.07); }
.card-header-row { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid #f1f5f9; flex-wrap: wrap; gap: 10px; }
.card-header-row h3 { margin: 0; font-size: 15px; }
.card-body { padding: 20px; }

.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media(max-width:700px){ .grid-2 { grid-template-columns: 1fr; } }

.form-group { margin-bottom: 14px; }
.form-group label { display: block; font-weight: 600; font-size: 14px; margin-bottom: 5px; color: #334155; }
.form-control { width: 100%; padding: 9px 12px; border: 2px solid #e2e8f0; border-radius: 6px; font-size: 14px; box-sizing: border-box; transition: border-color .2s; }
.form-control:focus { outline: none; border-color: #3b82f6; }
.form-hint { font-size: 12px; color: #94a3b8; margin-top: 4px; }
.hint { color: #94a3b8; font-size: 12px; font-weight: 400; }
.btn-row { display: flex; align-items: center; gap: 12px; }
.save-ok { color: #22c55e; font-size: 14px; font-weight: 600; }

.model-row { display: flex; gap: 8px; }
.model-row input { flex: 1; }
.model-list { max-height: 180px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 6px; margin-top: 6px; }
.model-item { padding: 7px 12px; font-size: 13px; cursor: pointer; font-family: monospace; border-bottom: 1px solid #f1f5f9; }
.model-item:hover { background: #f0f4ff; }
.model-item.selected { background: #dbeafe; color: #1d4ed8; font-weight: 700; }

.multilingual-toggle { display: flex; align-items: center; gap: 10px; font-size: 14px; color: #475569; }
.toggle-status.on { color: #22c55e; font-weight: 700; }
.toggle-status.off { color: #94a3b8; }

/* Translate panel */
.translate-panel { }
.panel-row { display: flex; gap: 16px; margin-bottom: 12px; }
@media(max-width:600px){ .panel-row { flex-direction: column; } }

/* Results */
.result-panel { margin-top: 20px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
.result-summary { padding: 10px 14px; border-radius: 8px; font-size: 14px; margin-bottom: 12px; }
.result-summary.all-ok { background: #dcfce7; color: #166534; }
.result-summary.has-error { background: #fef3c7; color: #92400e; }
.err-count { color: #dc2626; font-weight: 700; }
.result-list { display: flex; flex-direction: column; gap: 4px; max-height: 300px; overflow-y: auto; }
.result-row { display: flex; gap: 8px; align-items: center; font-size: 13px; padding: 6px 10px; border-radius: 4px; background: #f8fafc; }
.result-row.ok { border-left: 3px solid #22c55e; }
.r-type { color: #94a3b8; font-size: 11px; font-family: monospace; white-space: nowrap; }
.r-src { color: #64748b; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.r-arrow { color: #94a3b8; flex-shrink: 0; }
.r-dst { color: #1e293b; font-weight: 500; flex: 1.5; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.more-note { font-size: 12px; color: #94a3b8; text-align: center; padding: 8px; }
.error-log { margin-top: 14px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 14px; }
.error-log h4 { margin: 0 0 10px; font-size: 14px; color: #dc2626; }
.error-row { font-size: 13px; color: #7f1d1d; margin-bottom: 6px; word-break: break-all; }
.error-row code { background: #fee2e2; padding: 1px 5px; border-radius: 3px; font-family: monospace; }

/* Search */
.search-row { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.search-results { display: flex; flex-direction: column; gap: 12px; }
.result-item { padding: 14px; background: #f8fafc; border-radius: 8px; border-left: 3px solid #3b82f6; }
.result-meta { font-size: 12px; font-weight: 700; color: #64748b; margin-bottom: 6px; }
.result-original { font-size: 14px; color: #334155; margin-bottom: 8px; background: white; padding: 8px 10px; border-radius: 4px; border: 1px solid #e2e8f0; }
.result-replace { display: flex; gap: 8px; align-items: center; }
.result-replace input { flex: 1; }
.result-saved { color: #22c55e; font-size: 13px; font-weight: 700; margin-top: 6px; }
.empty-tip { color: #94a3b8; text-align: center; padding: 24px; font-size: 14px; }
.empty-tip a { color: #3b82f6; }

/* Toggle */
.switch { position: relative; display: inline-block; width: 40px; height: 22px; flex-shrink: 0; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; inset: 0; background: #cbd5e1; border-radius: 22px; transition: .3s; }
.slider:before { position: absolute; content: ''; height: 16px; width: 16px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: .3s; }
input:checked + .slider { background: #22c55e; }
input:checked + .slider:before { transform: translateX(18px); }
.btn { padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; border: none; font-size: 14px; transition: all .2s; }
.btn-primary { background: #2563eb; color: white; }
.btn-primary:hover { background: #1d4ed8; }
.btn-outline { background: white; color: #2563eb; border: 1.5px solid #2563eb; }
.btn-outline:hover { background: #eff6ff; }
.btn-sm { padding: 5px 12px; font-size: 13px; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-warning { background: #f59e0b; color: white; }
.btn-warning:hover { background: #d97706; }

/* Progress Bar */
.progress-bar-wrap { margin-top: 16px; }
.progress-bar { width: 100%; height: 8px; background: #e2e8f0; border-radius: 8px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #22c55e, #16a34a); border-radius: 8px; transition: width 0.3s ease; }
.progress-fill.error { background: linear-gradient(90deg, #f59e0b, #d97706); }
.progress-text { font-size: 13px; color: #64748b; margin-top: 6px; text-align: center; }
.spin { display: inline-block; animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* Log Panel */
.log-panel { margin-top: 16px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
.log-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 600; color: #475569; }
.log-body { max-height: 320px; overflow-y: auto; padding: 8px; font-family: 'Consolas', 'Courier New', monospace; font-size: 12px; background: #1e293b; color: #e2e8f0; }
.log-entry { padding: 3px 8px; border-radius: 3px; display: flex; gap: 8px; align-items: flex-start; line-height: 1.5; }
.log-entry.ok { color: #4ade80; }
.log-entry.error { color: #f87171; }
.log-entry.warn { color: #fbbf24; }
.log-entry.info { color: #93c5fd; }
.log-time { color: #64748b; flex-shrink: 0; font-size: 11px; }
.log-icon { flex-shrink: 0; }
.log-msg { word-break: break-all; }

.channel-list { display: flex; flex-direction: column; gap: 12px; }
.channel-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; background: #fff; transition: all 0.2s; }
.channel-card:hover { border-color: var(--primary, #1d4f73); box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.channel-card.is-default { border-color: var(--primary, #1d4f73); background: linear-gradient(135deg, #f0f7ff 0%, #fff 100%); }
.ch-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.ch-name { font-weight: 600; font-size: 15px; display: flex; align-items: center; gap: 8px; }
.ch-badge { background: var(--primary, #1d4f73); color: #fff; font-size: 11px; padding: 2px 8px; border-radius: 4px; }
.ch-actions { display: flex; gap: 6px; }
.ch-info { font-size: 13px; color: #64748b; display: flex; flex-direction: column; gap: 4px; }
.ch-label { color: #94a3b8; min-width: 40px; display: inline-block; }
.ch-models { display: flex; flex-wrap: wrap; gap: 4px; }
.model-tag { background: #e2e8f0; color: #334155; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
.model-tag.removable { cursor: pointer; }
.model-tag.removable:hover { background: #fecaca; color: #991b1b; }
.ch-no-model { color: #94a3b8; font-style: italic; }
.selected-models { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.btn-xs { padding: 3px 8px; font-size: 12px; }
.btn-danger { color: #e74c3c; border-color: #e74c3c; }
.btn-danger:hover { background: #e74c3c; color: #fff; }
.model-check { margin-right: 4px; }
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.4); z-index: 1000; display: flex; align-items: center; justify-content: center; }
.modal-box { background: #fff; border-radius: 14px; padding: 28px; width: 600px; max-width: 95vw; max-height: 85vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.15); }
.modal-box h3 { margin: 0 0 20px; font-size: 18px; }
.checkbox-label { display: flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer; }
.checkbox-label input { width: 16px; height: 16px; }

/* ── Granular Translation ── */
.gt-tabs { display: flex; gap: 4px; margin-bottom: 16px; }
.gt-tab { padding: 8px 20px; border: 2px solid #e2e8f0; border-radius: 8px; background: #fff; cursor: pointer; font-size: 14px; font-weight: 600; color: #64748b; transition: all 0.2s; }
.gt-tab:hover { border-color: #93c5fd; color: #2563eb; }
.gt-tab.active { border-color: #2563eb; background: #eff6ff; color: #2563eb; }
.gt-toolbar { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
.gt-actions { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
.gt-select-all { display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; cursor: pointer; color: #475569; }
.gt-select-all input { width: 16px; height: 16px; }
.gt-selected-count { font-size: 13px; color: #2563eb; font-weight: 600; background: #eff6ff; padding: 3px 10px; border-radius: 12px; }
.gt-list { display: flex; flex-direction: column; gap: 4px; max-height: 480px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px; }
.gt-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-bottom: 1px solid #f1f5f9; transition: background 0.15s; }
.gt-item:last-child { border-bottom: none; }
.gt-item:hover { background: #f8fafc; }
.gt-item.full { border-left: 3px solid #22c55e; }
.gt-item.partial { border-left: 3px solid #f59e0b; }
.gt-item.none { border-left: 3px solid #e2e8f0; }
.gt-item-check { flex-shrink: 0; cursor: pointer; }
.gt-item-check input { width: 16px; height: 16px; cursor: pointer; }
.gt-status-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.gt-status-dot.full { background: #22c55e; box-shadow: 0 0 4px rgba(34,197,94,0.4); }
.gt-status-dot.partial { background: #f59e0b; box-shadow: 0 0 4px rgba(245,158,11,0.4); }
.gt-status-dot.none { background: #e2e8f0; }
.gt-item-info { flex: 1; min-width: 0; }
.gt-item-name { font-size: 14px; font-weight: 500; color: #1e293b; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gt-item-category { font-size: 11px; color: #94a3b8; background: #f1f5f9; padding: 1px 6px; border-radius: 4px; margin-top: 2px; display: inline-block; }
.gt-lang-tags { display: flex; gap: 4px; flex-shrink: 0; flex-wrap: wrap; }
.gt-lang-tag { font-size: 12px; padding: 2px 6px; border-radius: 4px; border: 1px solid #e2e8f0; }
.gt-lang-tag.full { background: #dcfce7; border-color: #86efac; color: #166534; }
.gt-lang-tag.partial { background: #fef3c7; border-color: #fcd34d; color: #92400e; }
.gt-lang-tag.none { background: #f8fafc; color: #94a3b8; }
.gt-pagination { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 12px; font-size: 13px; color: #64748b; }

/* ── Channel Test ── */
.ch-test-result { padding: 6px 14px; font-size: 13px; font-weight: 500; border-radius: 6px; margin: 6px 0; }
.ch-test-result.test-ok { background: #dcfce7; color: #166534; }
.ch-test-result.test-fail { background: #fef2f2; color: #991b1b; }

/* ── Audit ── */
.audit-report { display: flex; flex-direction: column; gap: 6px; }
.audit-lang-section { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
.audit-lang-header { display: flex; align-items: center; gap: 10px; padding: 12px 16px; cursor: pointer; background: #f8fafc; transition: background 0.15s; flex-wrap: wrap; }
.audit-lang-header:hover { background: #f1f5f9; }
.audit-lang-flag { font-size: 18px; }
.audit-lang-name { font-weight: 600; font-size: 14px; color: #1e293b; }
.audit-badge { font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 12px; }
.audit-badge.complete { background: #dcfce7; color: #166534; }
.audit-badge.incomplete { background: #fef3c7; color: #92400e; }
.audit-stats { font-size: 12px; color: #64748b; margin-left: auto; }
.audit-expand { color: #94a3b8; font-size: 12px; }
.audit-lang-body { padding: 8px 16px 16px; }
.audit-missing-section { margin-bottom: 12px; }
.audit-missing-title { font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 6px; }
.audit-missing-item { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
.audit-missing-item:last-child { border-bottom: none; }
.audit-item-name { flex: 1; color: #1e293b; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.audit-item-cat { font-size: 11px; color: #94a3b8; background: #f1f5f9; padding: 1px 6px; border-radius: 4px; }
.audit-item-progress { font-size: 11px; color: #64748b; white-space: nowrap; }

/* Scope multi-select checkboxes */
.scope-checks { display: flex; flex-wrap: wrap; gap: 6px 12px; padding: 8px 0; align-items: center; }
.scope-check { display: flex; align-items: center; gap: 4px; cursor: pointer; font-size: 13px; color: #334155; font-weight: 500; }
.scope-check input[type="checkbox"] { accent-color: #3b82f6; width: 15px; height: 15px; cursor: pointer; }
.audit-ui-keys { display: flex; flex-wrap: wrap; gap: 4px; padding: 8px 0; }
.audit-ui-key { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; border-radius: 4px; padding: 2px 8px; font-size: 11px; font-family: monospace; }
.audit-missing-fields { font-size: 11px; color: #94a3b8; margin-left: 6px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ── Background Job Panel ── */
.badge-running { display: inline-block; background: #3b82f6; color: #fff; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 10px; margin-left: 8px; animation: pulse 1.5s ease-in-out infinite; }
.badge-done { display: inline-block; background: #22c55e; color: #fff; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 10px; margin-left: 8px; }
.badge-aborted { display: inline-block; background: #f59e0b; color: #fff; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 10px; margin-left: 8px; }
.badge-error { display: inline-block; background: #ef4444; color: #fff; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 10px; }
.badge-pending { display: inline-block; background: #94a3b8; color: #fff; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 10px; }
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.6; } }

.job-active-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 10px; padding: 16px; }
.job-history-list { display: flex; flex-direction: column; gap: 4px; }
.job-history-item { display: flex; align-items: center; gap: 12px; padding: 8px 12px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0; cursor: pointer; font-size: 13px; transition: background .15s; }
.job-history-item:hover { background: #f1f5f9; }
.job-history-item.running { border-color: #93c5fd; background: #eff6ff; }
.job-history-item.done { border-color: #86efac; }
.job-history-item.aborted { border-color: #fde68a; }
.job-history-item.error { border-color: #fca5a5; }

.btn-danger-outline { background: transparent; border: 1px solid #ef4444; color: #ef4444; }
.btn-danger-outline:hover { background: #fef2f2; }

</style>
