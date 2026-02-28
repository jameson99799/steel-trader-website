<template>
  <div class="inquiries-page">
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
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.unread-count {
  background: var(--danger);
  color: #fff;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 14px;
}

.unread {
  background: #fef3c7;
}

.detail-row {
  margin-bottom: 16px;
}

.detail-row label {
  display: block;
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--secondary);
}

.detail-row p {
  white-space: pre-wrap;
}
</style>
