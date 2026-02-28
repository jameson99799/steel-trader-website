<template>
  <div class="products-page">
    <div class="page-header">
      <div class="container">
        <div class="header-content">
          <div class="breadcrumb">
            <router-link to="/" class="breadcrumb-link">{{ t('home') }}</router-link>
            <svg class="breadcrumb-separator" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
            </svg>
            <span class="breadcrumb-current">{{ currentCategoryName || t('allProducts') }}</span>
          </div>
          <h1 class="page-title">{{ currentCategoryName || t('allProducts') }}</h1>
          <p class="page-subtitle">{{ products.length }} {{ t('products') }} available</p>
        </div>
      </div>
    </div>

    <div class="page-content">
      <div class="container">
        <div class="products-layout">
          <!-- Sidebar -->
          <aside class="sidebar">
            <div class="sidebar-card">
              <div class="sidebar-header">
                <h3 class="sidebar-title">{{ t('productCategories') }}</h3>
              </div>
              <div class="sidebar-content">
                <ul class="category-tree">
                  <li class="category-item">
                    <a 
                      href="#" 
                      @click.prevent="selectCategory(null)"
                      :class="['category-link', { active: !selectedCategory }]"
                    >
                      <svg class="category-icon" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1z" />
                      </svg>
                      <span class="category-name">{{ t('allProducts') }}</span>
                      <span class="category-count">{{ totalProductCount }}</span>
                    </a>
                  </li>
                  <li v-for="cat in categoryTree" :key="cat.id" class="category-item">
                    <a 
                      href="#" 
                      @click.prevent="selectCategory(cat.id)"
                      :class="['category-link', { active: selectedCategory === cat.id }]"
                    >
                      <svg class="category-icon" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" />
                      </svg>
                      <span class="category-name">{{ localizedValue(cat, 'name') }}</span>
                      <span class="category-count">{{ getTotalCount(cat) }}</span>
                    </a>
                    <ul v-if="cat.children?.length" class="subcategory-list">
                      <li v-for="child in cat.children" :key="child.id" class="category-item">
                        <a 
                          href="#" 
                          @click.prevent="selectCategory(child.id)"
                          :class="['category-link subcategory-link', { active: selectedCategory === child.id }]"
                        >
                          <span class="category-name">{{ localizedValue(child, 'name') }}</span>
                          <span class="category-count">{{ getTotalCount(child) }}</span>
                        </a>
                        <ul v-if="child.children?.length" class="subcategory-list">
                          <li v-for="grandChild in child.children" :key="grandChild.id" class="category-item">
                            <a 
                              href="#" 
                              @click.prevent="selectCategory(grandChild.id)"
                              :class="['category-link subcategory-link', { active: selectedCategory === grandChild.id }]"
                            >
                              <span class="category-name">{{ localizedValue(grandChild, 'name') }}</span>
                              <span class="category-count">{{ grandChild.product_count }}</span>
                            </a>
                          </li>
                        </ul>
                      </li>
                    </ul>
                  </li>
                </ul>
              </div>
            </div>
          </aside>

          <!-- Products Grid -->
          <main class="products-main">
            <div class="products-header">
              <div class="results-info">
                <h2 class="results-title">{{ currentCategoryName || t('allProducts') }}</h2>
                <p class="results-count">Showing {{ products.length }} products</p>
              </div>
              <div class="view-controls">
                <div class="sort-controls">
                  <select class="sort-select">
                    <option>Sort by Default</option>
                    <option>Name A-Z</option>
                    <option>Name Z-A</option>
                    <option>Newest First</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div class="products-grid" v-if="products.length">
              <router-link 
                v-for="product in products" 
                :key="product.id" 
                :to="`/products/${product.id}`"
                class="product-card"
              >
                <div class="product-image">
                  <img :src="product.images?.split(',')[0] || '/placeholder.svg'" :alt="localizedValue(product, 'name')" />
                  <div class="product-overlay">
                    <div class="product-actions">
                      <button class="action-btn" title="Quick View">
                        <svg viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div class="product-badge" v-if="product.is_featured">
                    <span>Featured</span>
                  </div>
                </div>
                <div class="product-info">
                  <div class="product-category">{{ localizedValue(product, 'category_name') }}</div>
                  <h3 class="product-name">{{ localizedValue(product, 'name') }}</h3>
                  <div class="product-actions-bottom">
                    <button class="btn btn-primary btn-sm">
                      <svg class="icon" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                      </svg>
                      {{ t('inquiry') }}
                    </button>
                  </div>
                </div>
              </router-link>
            </div>
            
            <div v-else class="no-products">
              <div class="no-products-content">
                <svg class="no-products-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="M21 21l-4.35-4.35"/>
                </svg>
                <h3 class="no-products-title">No products found</h3>
                <p class="no-products-desc">Try adjusting your search or filter to find what you're looking for.</p>
                <button @click="selectCategory(null)" class="btn btn-primary">
                  View All Products
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLang } from '../composables/useLang'
import api from '../api'

const route = useRoute()
const router = useRouter()
const { t, localizedValue } = useLang()

const categoryTree = ref([])
const products = ref([])
const selectedCategory = ref(null)

const currentCategoryName = computed(() => {
  if (!selectedCategory.value) return null
  const findCategory = (cats) => {
    for (const cat of cats) {
      if (cat.id === selectedCategory.value) return localizedValue(cat, 'name')
      if (cat.children?.length) {
        const found = findCategory(cat.children)
        if (found) return found
      }
    }
    return null
  }
  return findCategory(categoryTree.value)
})

const totalProductCount = computed(() => {
  return categoryTree.value.reduce((total, cat) => total + getTotalCount(cat), 0)
})

const getTotalCount = (cat) => {
  let count = cat.product_count || 0
  if (cat.children) {
    cat.children.forEach(child => {
      count += getTotalCount(child)
    })
  }
  return count
}

const selectCategory = (id) => {
  selectedCategory.value = id
  router.push({ query: id ? { category: id } : {} })
}

const loadProducts = async () => {
  try {
    const params = {}
    if (selectedCategory.value) {
      params.category_id = selectedCategory.value
    }
    params.status = 1
    const res = await api.getProducts(params)
    products.value = res.data
  } catch (e) {
    console.error(e)
  }
}

watch(selectedCategory, loadProducts)

onMounted(async () => {
  try {
    categoryTree.value = await api.getCategoryTree()
    if (route.query.category) {
      selectedCategory.value = parseInt(route.query.category)
    }
    await loadProducts()
  } catch (e) {
    console.error(e)
  }
})
</script>

<style scoped>
.products-page {
  min-height: 100vh;
  background: var(--gray-50);
}

.page-header {
  background: var(--white);
  border-bottom: 1px solid var(--border);
  padding: var(--spacing-xl) 0;
}

.header-content {
  text-align: center;
}

.breadcrumb {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing);
  font-size: var(--text-sm);
}

.breadcrumb-link {
  color: var(--text-secondary);
  transition: var(--transition);
}

.breadcrumb-link:hover {
  color: var(--primary);
}

.breadcrumb-separator {
  width: 16px;
  height: 16px;
  color: var(--text-muted);
}

.breadcrumb-current {
  color: var(--text-primary);
  font-weight: 600;
}

.page-title {
  font-size: var(--text-4xl);
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: var(--spacing-sm);
  line-height: var(--leading-tight);
}

.page-subtitle {
  color: var(--text-secondary);
  font-size: var(--text-lg);
}

.page-content {
  padding: var(--spacing-xl) 0;
}

.products-layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: var(--spacing-xl);
  align-items: start;
}

.sidebar {
  position: sticky;
  top: var(--spacing-xl);
}

.sidebar-card {
  background: var(--white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.sidebar-header {
  padding: var(--spacing-md);
  background: var(--gray-50);
  border-bottom: 1px solid var(--border);
}

.sidebar-title {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.sidebar-content {
  padding: var(--spacing);
}

.category-tree {
  list-style: none;
  padding: 0;
  margin: 0;
}

.category-item {
  margin-bottom: 4px;
}

.category-link {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 12px var(--spacing);
  color: var(--text-secondary);
  border-radius: var(--radius);
  transition: var(--transition);
  text-decoration: none;
  font-size: var(--text-sm);
  font-weight: 500;
}

.category-link:hover {
  background: var(--gray-100);
  color: var(--text-primary);
}

.category-link.active {
  background: var(--primary);
  color: var(--white);
}

.category-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.category-name {
  flex: 1;
}

.category-count {
  background: rgba(0, 0, 0, 0.1);
  color: inherit;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: var(--text-xs);
  font-weight: 600;
}

.category-link.active .category-count {
  background: rgba(255, 255, 255, 0.2);
}

.subcategory-list {
  list-style: none;
  padding: 0;
  margin: 4px 0 0 var(--spacing-md);
}

.subcategory-link {
  padding-left: var(--spacing-md);
  font-size: var(--text-xs);
}

.products-main {
  min-height: 600px;
}

.products-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xl);
  padding: var(--spacing-md);
  background: var(--white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
}

.results-title {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px 0;
}

.results-count {
  color: var(--text-secondary);
  font-size: var(--text-sm);
  margin: 0;
}

.sort-select {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--white);
  color: var(--text-primary);
  font-size: var(--text-sm);
  cursor: pointer;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-lg);
}

.product-card {
  background: var(--white);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow);
  transition: var(--transition-slow);
  text-decoration: none;
  color: inherit;
}

.product-card:hover {
  transform: translateY(-8px);
  box-shadow: var(--shadow-xl);
}

.product-image {
  position: relative;
  aspect-ratio: 4/3;
  overflow: hidden;
  background: var(--gray-100);
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: var(--transition-slow);
}

.product-card:hover .product-image img {
  transform: scale(1.1);
}

.product-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(30, 64, 175, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: var(--transition);
}

.product-card:hover .product-overlay {
  opacity: 1;
}

.product-actions {
  display: flex;
  gap: var(--spacing);
}

.action-btn {
  width: 48px;
  height: 48px;
  background: var(--white);
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary);
  cursor: pointer;
  transition: var(--transition);
}

.action-btn:hover {
  transform: scale(1.1);
}

.action-btn svg {
  width: 20px;
  height: 20px;
}

.product-badge {
  position: absolute;
  top: var(--spacing);
  left: var(--spacing);
  background: var(--accent);
  color: var(--white);
  padding: 4px 12px;
  border-radius: 12px;
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
}

.product-info {
  padding: var(--spacing-md);
}

.product-category {
  color: var(--text-muted);
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--spacing-sm);
}

.product-name {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--spacing);
  line-height: var(--leading-tight);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-actions-bottom {
  display: flex;
  justify-content: center;
}

.product-actions-bottom .btn {
  flex: 1;
  max-width: 200px;
}

.no-products {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  background: var(--white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
}

.no-products-content {
  text-align: center;
  max-width: 400px;
  padding: var(--spacing-xl);
}

.no-products-icon {
  width: 80px;
  height: 80px;
  color: var(--text-muted);
  margin: 0 auto var(--spacing-md);
}

.no-products-title {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--spacing);
}

.no-products-desc {
  color: var(--text-secondary);
  margin-bottom: var(--spacing-md);
  line-height: var(--leading-relaxed);
}

.icon {
  width: 16px;
  height: 16px;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .products-layout {
    grid-template-columns: 1fr;
    gap: var(--spacing-md);
  }
  
  .sidebar {
    position: static;
  }
  
  .products-header {
    flex-direction: column;
    gap: var(--spacing);
    align-items: stretch;
  }
}

@media (max-width: 768px) {
  .page-header {
    padding: var(--spacing-md) 0;
  }
  
  .page-title {
    font-size: var(--text-3xl);
  }
  
  .products-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: var(--spacing);
  }
  
  .breadcrumb {
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .products-grid {
    grid-template-columns: 1fr;
  }
  
  .sidebar-content {
    max-height: 300px;
    overflow-y: auto;
  }
}
</style>
