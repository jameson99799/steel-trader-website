<template>
  <div class="dashboard">
    <h1>控制台</h1>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">📦</div>
        <div class="stat-info">
          <span class="stat-num">{{ stats.products }}</span>
          <span class="stat-label">商品总数</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📁</div>
        <div class="stat-info">
          <span class="stat-num">{{ stats.categories }}</span>
          <span class="stat-label">分类数量</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📬</div>
        <div class="stat-info">
          <span class="stat-num">{{ stats.inquiries }}</span>
          <span class="stat-label">询盘总数</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🔔</div>
        <div class="stat-info">
          <span class="stat-num">{{ stats.unread }}</span>
          <span class="stat-label">未读询盘</span>
        </div>
      </div>
    </div>

    <div class="card mt-4">
      <div class="card-header">最新询盘</div>
      <div class="card-body">
        <table class="table" v-if="inquiries.length">
          <thead>
            <tr>
              <th>姓名</th>
              <th>邮箱</th>
              <th>公司</th>
              <th>时间</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in inquiries" :key="item.id">
              <td>{{ item.name }}</td>
              <td>{{ item.email }}</td>
              <td>{{ item.company || '-' }}</td>
              <td>{{ formatDate(item.created_at) }}</td>
              <td>
                <span :class="['badge', item.is_read ? 'badge-success' : 'badge-warning']">
                  {{ item.is_read ? '已读' : '未读' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="text-center" style="color: var(--secondary);">暂无询盘</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '../../api'

const stats = reactive({
  products: 0,
  categories: 0,
  inquiries: 0,
  unread: 0
})

const inquiries = ref([])

const countCategoryTree = (categories) => categories.reduce(
  (count, category) => count + 1 + countCategoryTree(category.children || []),
  0
)

const formatDate = (date) => {
  return new Date(date).toLocaleString('zh-CN')
}

onMounted(async () => {
  try {
    const productsRes = await api.getAdminProducts()
    stats.products = productsRes.total

    const categories = await api.getAdminCategoryTree()
    stats.categories = countCategoryTree(categories)

    const inquiriesRes = await api.getInquiries()
    stats.inquiries = inquiriesRes.data.length
    stats.unread = inquiriesRes.unread_count
    inquiries.value = inquiriesRes.data.slice(0, 5)
  } catch (e) {
    console.error(e)
  }
})
</script>

<style scoped>
.dashboard h1 {
  margin-bottom: 24px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.stat-card {
  background: #fff;
  padding: 24px;
  border-radius: 8px;
  box-shadow: var(--shadow);
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  font-size: 36px;
}

.stat-num {
  display: block;
  font-size: 28px;
  font-weight: 700;
}

.stat-label {
  color: var(--secondary);
  font-size: 14px;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
