<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal inquiry-modal">
      <div class="modal-header">
        <div class="header-content">
          <div class="header-icon">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
          </div>
          <div class="header-text">
            <h3>{{ t('sendInquiry') }}</h3>
            <p>{{ pageTexts?.inquiry_subtitle || 'Get a quote for your LED requirements' }}</p>
          </div>
        </div>
        <button class="modal-close" @click="$emit('close')">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
      
      <form @submit.prevent="handleSubmit">
        <div class="modal-body">
          <div class="form-section">
            <div class="section-title">
              <svg class="section-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
              </svg>
              <span>Contact Information</span>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>{{ t('name') }} <span class="required">*</span></label>
                <input v-model="form.name" type="text" class="form-control" required placeholder="Your full name" />
              </div>
              <div class="form-group">
                <label>{{ t('email') }} <span class="required">*</span></label>
                <input v-model="form.email" type="email" class="form-control" required placeholder="your@email.com" />
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>{{ t('phone') }}</label>
                <input v-model="form.phone" type="text" class="form-control" placeholder="+1 (555) 123-4567" />
              </div>
              <div class="form-group">
                <label>{{ t('company') }}</label>
                <input v-model="form.company" type="text" class="form-control" placeholder="Your company name" />
              </div>
            </div>
            
            <div class="form-group">
              <label>{{ t('country') }}</label>
              <input v-model="form.country" type="text" class="form-control" placeholder="Your country" />
            </div>
          </div>

          <div class="form-section">
            <div class="section-title">
              <svg class="section-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
              </svg>
              <span>Your Requirements</span>
            </div>
            
            <div class="form-group">
              <label>{{ t('message') }}</label>
              <textarea
                v-model="form.message"
                class="form-control"
                rows="4"
                :placeholder="pageTexts?.contact_form_desc || 'Please describe your LED requirements: product type, quantity, specifications, application, timeline, etc.'"
              ></textarea>
            </div>
          </div>

          <div class="inquiry-benefits">
            <h4>Why choose us?</h4>
            <div class="benefits-list">
              <div class="benefit-item">
                <svg class="benefit-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                <span>24-hour response time</span>
              </div>
              <div class="benefit-item">
                <svg class="benefit-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                <span>Competitive pricing</span>
              </div>
              <div class="benefit-item">
                <svg class="benefit-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                <span>Quality guarantee</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="$emit('close')">
            <svg class="btn-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
            {{ t('cancel') }}
          </button>
          <button type="submit" class="btn btn-primary" :disabled="loading">
            <svg v-if="loading" class="btn-icon animate-spin" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
            </svg>
            <svg v-else class="btn-icon" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
            {{ loading ? 'Sending...' : t('submit') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useLang } from '../composables/useLang'
import api from '../api'

const props = defineProps({
  productId: Number
})

const emit = defineEmits(['close', 'success'])
const { t } = useLang()
const loading = ref(false)
const pageTexts = ref(null)

onMounted(async () => {
  try { pageTexts.value = await api.getPageTexts() } catch (e) {}
})

const form = reactive({
  name: '',
  email: '',
  phone: '',
  company: '',
  country: '',
  message: ''
})

const handleSubmit = async () => {
  loading.value = true
  try {
    await api.submitInquiry({
      ...form,
      product_id: props.productId
    })
    alert(t('inquirySuccess'))
    emit('success')
    emit('close')
  } catch (e) {
    alert(e.message)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.inquiry-modal {
  max-width: 700px;
  max-height: 90vh;
  overflow: hidden;
}

.modal-header {
  background: var(--primary-gradient);
  color: var(--white);
  padding: var(--spacing-xl);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: none;
}

.header-content {
  display: flex;
  align-items: center;
  gap: var(--spacing);
  flex: 1;
}

.header-icon {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.header-icon svg {
  width: 24px;
  height: 24px;
}

.header-text h3 {
  font-size: var(--text-2xl);
  font-weight: 800;
  margin: 0 0 var(--spacing-sm) 0;
}

.header-text p {
  font-size: var(--text-sm);
  opacity: 0.9;
  margin: 0;
}

.modal-close {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 50%;
  color: var(--white);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition);
  flex-shrink: 0;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.2);
}

.modal-close svg {
  width: 20px;
  height: 20px;
}

.modal-body {
  padding: var(--spacing-xl);
  max-height: 60vh;
  overflow-y: auto;
}

.form-section {
  margin-bottom: var(--spacing-xl);
  padding-bottom: var(--spacing-xl);
  border-bottom: 1px solid var(--border);
}

.form-section:last-of-type {
  border-bottom: none;
  margin-bottom: var(--spacing-md);
  padding-bottom: 0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--spacing);
  margin-bottom: var(--spacing-md);
  font-weight: 700;
  color: var(--text-primary);
  font-size: var(--text-lg);
}

.section-icon {
  width: 20px;
  height: 20px;
  color: var(--primary);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing);
}

.form-group {
  margin-bottom: var(--spacing);
}

.form-group label {
  display: block;
  margin-bottom: var(--spacing-sm);
  font-weight: 600;
  font-size: var(--text-sm);
  color: var(--text-primary);
}

.required {
  color: var(--danger);
}

.form-control {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid var(--border);
  border-radius: var(--radius);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  color: var(--text-primary);
  background: var(--white);
  transition: var(--transition);
}

.form-control:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-control::placeholder {
  color: var(--text-muted);
}

textarea.form-control {
  min-height: 100px;
  resize: vertical;
}

.inquiry-benefits {
  background: var(--gray-50);
  padding: var(--spacing-md);
  border-radius: var(--radius);
  border-left: 4px solid var(--primary);
}

.inquiry-benefits h4 {
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--spacing);
}

.benefits-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.benefit-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.benefit-icon {
  width: 16px;
  height: 16px;
  color: var(--success);
  flex-shrink: 0;
}

.modal-footer {
  padding: var(--spacing-md) var(--spacing-xl);
  background: var(--gray-50);
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing);
}

.btn-icon {
  width: 18px;
  height: 18px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .inquiry-modal {
    max-width: calc(100vw - 32px);
    margin: var(--spacing);
  }
  
  .modal-header {
    padding: var(--spacing-md);
    flex-direction: column;
    gap: var(--spacing);
    text-align: center;
  }
  
  .header-content {
    flex-direction: column;
    text-align: center;
  }
  
  .modal-close {
    position: absolute;
    top: var(--spacing);
    right: var(--spacing);
  }
  
  .modal-body {
    padding: var(--spacing-md);
  }
  
  .form-row {
    grid-template-columns: 1fr;
    gap: 0;
  }
  
  .modal-footer {
    padding: var(--spacing-md);
    flex-direction: column-reverse;
  }
  
  .modal-footer .btn {
    width: 100%;
  }
  
  .benefits-list {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--spacing-sm);
  }
}

@media (max-width: 640px) {
  .section-title {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }
  
  .inquiry-benefits {
    padding: var(--spacing);
  }
}
</style>
