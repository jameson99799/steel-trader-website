<template>
  <div class="inquiries-page crm-scope crm-page">
    <div class="page-header">
      <h1>询盘管理</h1>
      <span class="unread-count" v-if="unreadCount">{{ unreadCount }} 条未读</span>
    </div>

    <div class="card">
      <div class="card-body">
        <table class="table" v-if="inquiries.length">
          <thead>
            <tr>
              <th>姓名</th>
              <th>邮箱</th>
              <th>电话</th>
              <th>公司</th>
              <th>国家</th>
              <th>关联商品</th>
              <th>时间</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in inquiries" :key="item.id" :class="{ unread: !item.is_read }">
              <td>{{ item.name }}</td>
              <td>{{ item.email }}</td>
              <td>{{ item.phone || '-' }}</td>
              <td>{{ item.company || '-' }}</td>
              <td>{{ item.country || '-' }}</td>
              <td>{{ item.product_name || '-' }}</td>
              <td>{{ formatDate(item.created_at) }}</td>
              <td>
                <span :class="['badge', item.is_read ? 'badge-success' : 'badge-warning']">
                  {{ item.is_read ? '已读' : '未读' }}
                </span>
              </td>
              <td>
                <button class="btn btn-sm btn-secondary" @click="viewDetail(item)">查看</button>
                <button class="btn btn-sm btn-danger" @click="handleDelete(item)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="text-center" style="color: var(--secondary);">暂无询盘</p>
      </div>
    </div>

    <!-- Detail Modal -->
    <div v-if="showDetail" class="modal-overlay" @click.self="showDetail = false">
      <div class="modal">
        <div class="modal-header">
          <h3>询盘详情</h3>
          <button class="modal-close" @click="showDetail = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="detail-row">
            <label>姓名：</label>
            <span>{{ currentInquiry?.name }}</span>
          </div>
          <div class="detail-row">
            <label>邮箱：</label>
            <span>{{ currentInquiry?.email }}</span>
          </div>
          <div class="detail-row">
            <label>电话：</label>
            <span>{{ currentInquiry?.phone || '-' }}</span>
          </div>
          <div class="detail-row">
            <label>公司：</label>
            <span>{{ currentInquiry?.company || '-' }}</span>
          </div>
          <div class="detail-row">
            <label>国家：</label>
            <span>{{ currentInquiry?.country || '-' }}</span>
          </div>
          <div class="detail-row">
            <label>关联商品：</label>
            <span>{{ currentInquiry?.product_name || '-' }}</span>
          </div>
          <div class="detail-row">
            <label>留言：</label>
            <p>{{ currentInquiry?.message || '-' }}</p>
          </div>
          <div class="detail-row">
            <label>时间：</label>
            <span>{{ formatDate(currentInquiry?.created_at) }}</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showDetail = false">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../api'

const inquiries = ref([])
const unreadCount = ref(0)
const showDetail = ref(false)
const currentInquiry = ref(null)

const formatDate = (date) => {
  return new Date(date).toLocaleString('zh-CN')
}

const loadInquiries = async () => {
  try {
    const res = await api.getInquiries()
    inquiries.value = res.data
    unreadCount.value = res.unread_count
  } catch (e) {
    console.error(e)
  }
}

const viewDetail = async (item) => {
  currentInquiry.value = item
  showDetail.value = true
  if (!item.is_read) {
    try {
      await api.markInquiryRead(item.id)
      item.is_read = 1
      unreadCount.value--
    } catch (e) {}
  }
}

const handleDelete = async (item) => {
  if (!confirm('确定删除此询盘吗？')) return
  try {
    await api.deleteInquiry(item.id)
    await loadInquiries()
  } catch (e) {
    alert(e.message)
  }
}

onMounted(loadInquiries)
</script>

<style scoped>
.inquiries-page { color: var(--crm-text) }
.page-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 20px;
}
.page-header h1 { margin: 0; font-size: 20px; font-weight: 800; color: var(--crm-text); display: flex; align-items: center; gap: 8px }
.unread-count {
  background: var(--crm-danger); color: #fff;
  padding: 4px 14px; border-radius: 999px; font-size: 12px; font-weight: 700;
}
.card {
  background: var(--crm-card); border: 1px solid var(--crm-border);
  border-radius: var(--crm-radius); box-shadow: var(--crm-shadow);
  overflow: hidden;
}
.card-body { padding: 0; overflow-x: auto }
.table { width: 100%; border-collapse: collapse; font-size: 13px }
.table th { background: var(--crm-bg); padding: 10px 14px; text-align: left; font-weight: 700; color: var(--crm-text-2); border-bottom: 1px solid var(--crm-border); font-size: 11.5px; text-transform: uppercase; letter-spacing: .04em; white-space: nowrap }
.table td { padding: 10px 14px; border-bottom: 1px solid var(--crm-border) }
.table tbody tr { transition: background .1s }
.table tbody tr:hover { background: var(--crm-bg) }
.table tbody tr:last-child td { border-bottom: none }
.unread { background: #fffbeb }
.badge { display: inline-flex; align-items: center; padding: 2px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 600 }
.badge-success { background: #d1fae5; color: #047857 }
.badge-warning { background: #fef3c7; color: #92400e }
.text-center { text-align: center; padding: 30px; color: var(--crm-text-3); font-size: 13px }
.btn { padding: 5px 13px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: all 0.15s; font-family: inherit }
.btn-secondary { background: var(--crm-card); color: var(--crm-text); border: 1px solid var(--crm-border) }
.btn-secondary:hover { border-color: var(--crm-primary); color: var(--crm-primary) }
.btn-danger { background: var(--crm-card); color: var(--crm-danger); border-color: #fecaca }
.btn-danger:hover { background: #fef2f2 }
.btn-sm { font-size: 12px }

.modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000 }
.modal { background: var(--crm-card); border-radius: var(--crm-radius); padding: 26px; width: 520px; max-width: 95vw; max-height: 90vh; overflow-y: auto; box-shadow: 0 24px 64px rgba(15,23,42,0.25) }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 16px; border-bottom: 1px solid var(--crm-border); margin-bottom: 18px }
.modal-header h3 { margin: 0; font-size: 16px; font-weight: 800; color: var(--crm-text) }
.modal-close { background: none; border: none; font-size: 20px; cursor: pointer; color: var(--crm-text-3); padding: 2px; border-radius: 6px }
.modal-close:hover { background: var(--crm-bg); color: var(--crm-text) }
.modal-body { margin-bottom: 18px }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding-top: 14px; border-top: 1px solid var(--crm-border) }
.detail-row { margin-bottom: 14px }
.detail-row label { display: block; font-size: 11px; font-weight: 700; margin-bottom: 3px; color: var(--crm-text-3); text-transform: uppercase; letter-spacing: .04em }
.detail-row span { font-size: 13px; color: var(--crm-text) }
.detail-row p { white-space: pre-wrap; font-size: 13px; color: var(--crm-text); margin: 4px 0 0; line-height: 1.7 }
</style>

