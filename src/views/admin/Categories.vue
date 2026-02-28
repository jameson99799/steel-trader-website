<template>
  <div class="categories-page">
    <div class="page-header">
      <h1>分类管理</h1>
      <button class="btn btn-primary" @click="openModal()">添加分类</button>
    </div>

    <div class="card">
      <div class="card-body">
        <div class="category-tree">
          <div v-for="cat in categoryTree" :key="cat.id" class="tree-item">
            <div class="tree-row">
              <span class="tree-name">{{ cat.name }} <small v-if="cat.name_en">({{ cat.name_en }})</small></span>
              <div class="tree-actions">
                <button class="btn btn-sm btn-secondary" @click="openModal(cat)">编辑</button>
                <button class="btn btn-sm btn-primary" @click="openModal(null, cat.id)">添加子分类</button>
                <button class="btn btn-sm btn-danger" @click="handleDelete(cat)">删除</button>
              </div>
            </div>
            <div v-if="cat.children?.length" class="tree-children">
              <div v-for="child in cat.children" :key="child.id" class="tree-item">
                <div class="tree-row">
                  <span class="tree-name">{{ child.name }} <small v-if="child.name_en">({{ child.name_en }})</small></span>
                  <div class="tree-actions">
                    <button class="btn btn-sm btn-secondary" @click="openModal(child)">编辑</button>
                    <button class="btn btn-sm btn-primary" @click="openModal(null, child.id)">添加子分类</button>
                    <button class="btn btn-sm btn-danger" @click="handleDelete(child)">删除</button>
                  </div>
                </div>
                <div v-if="child.children?.length" class="tree-children">
                  <div v-for="grandChild in child.children" :key="grandChild.id" class="tree-item">
                    <div class="tree-row">
                      <span class="tree-name">{{ grandChild.name }} <small v-if="grandChild.name_en">({{ grandChild.name_en }})</small></span>
                      <div class="tree-actions">
                        <button class="btn btn-sm btn-secondary" @click="openModal(grandChild)">编辑</button>
                        <button class="btn btn-sm btn-danger" @click="handleDelete(grandChild)">删除</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p v-if="!categoryTree.length" class="text-center" style="color: var(--secondary);">暂无分类</p>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingCategory ? '编辑分类' : '添加分类' }}</h3>
          <button class="modal-close" @click="showModal = false">&times;</button>
        </div>
        <form @submit.prevent="handleSubmit">
          <div class="modal-body">
            <div class="form-group">
              <label>分类名称（中文）*</label>
              <input v-model="form.name" type="text" class="form-control" required />
            </div>
            <div class="form-group">
              <label>分类名称（英文）</label>
              <input v-model="form.name_en" type="text" class="form-control" />
            </div>
            <div class="form-group">
              <label>上级分类</label>
              <select v-model="form.parent_id" class="form-control">
                <option :value="0">无（一级分类）</option>
                <option v-for="cat in flatCategories" :key="cat.id" :value="cat.id">
                  {{ cat.prefix }}{{ cat.name }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>排序</label>
              <input v-model="form.sort_order" type="number" class="form-control" />
            </div>
            <div class="form-group">
              <label>分类图片</label>
              <p class="form-hint">建议尺寸：400×300px，JPG/PNG格式，用于首页分类展示</p>
              <input type="file" @change="handleFileChange" accept="image/*" />
              <div class="preview-box" v-if="imageFile || editingCategory?.image">
                <img :src="imageFile ? getPreviewUrl(imageFile) : editingCategory?.image" />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showModal = false">取消</button>
            <button type="submit" class="btn btn-primary" :disabled="loading">保存</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import api from '../../api'

const categoryTree = ref([])
const showModal = ref(false)
const editingCategory = ref(null)
const loading = ref(false)
const imageFile = ref(null)

const form = reactive({
  name: '',
  name_en: '',
  parent_id: 0,
  sort_order: 0
})

const flatCategories = computed(() => {
  const result = []
  const flatten = (cats, prefix = '') => {
    cats.forEach(cat => {
      if (editingCategory.value?.id !== cat.id) {
        result.push({ ...cat, prefix })
        if (cat.children?.length) {
          flatten(cat.children, prefix + '-- ')
        }
      }
    })
  }
  flatten(categoryTree.value)
  return result
})

const loadCategories = async () => {
  try {
    categoryTree.value = await api.getCategoryTree()
  } catch (e) {
    console.error(e)
  }
}

const openModal = (category = null, parentId = 0) => {
  editingCategory.value = category
  form.name = category?.name || ''
  form.name_en = category?.name_en || ''
  form.parent_id = category?.parent_id ?? parentId
  form.sort_order = category?.sort_order || 0
  imageFile.value = null
  showModal.value = true
}

const handleFileChange = (e) => {
  imageFile.value = e.target.files[0]
}

const getPreviewUrl = (file) => {
  return URL.createObjectURL(file)
}

const handleSubmit = async () => {
  loading.value = true
  try {
    const formData = new FormData()
    formData.append('name', form.name)
    formData.append('name_en', form.name_en)
    formData.append('parent_id', form.parent_id)
    formData.append('sort_order', form.sort_order)
    if (imageFile.value) {
      formData.append('image', imageFile.value)
    }

    if (editingCategory.value) {
      await api.updateCategory(editingCategory.value.id, formData)
    } else {
      await api.createCategory(formData)
    }
    showModal.value = false
    await loadCategories()
  } catch (e) {
    alert(e.message)
  } finally {
    loading.value = false
  }
}

const handleDelete = async (category) => {
  if (!confirm(`确定删除分类"${category.name}"吗？`)) return
  try {
    await api.deleteCategory(category.id)
    await loadCategories()
  } catch (e) {
    alert(e.message)
  }
}

onMounted(loadCategories)
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.category-tree {
  padding: 10px 0;
}

.tree-item {
  margin-bottom: 8px;
}

.tree-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--light);
  border-radius: 4px;
}

.tree-name small {
  color: var(--secondary);
}

.tree-actions {
  display: flex;
  gap: 8px;
}

.tree-children {
  margin-left: 24px;
  margin-top: 8px;
}

.form-hint {
  font-size: 12px;
  color: var(--secondary);
  margin: 4px 0 8px;
}

.preview-box {
  margin-top: 10px;
  width: 120px;
  height: 90px;
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
}

.preview-box img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
</style>
