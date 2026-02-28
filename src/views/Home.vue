<template>
  <div class="home">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-background">
        <div class="hero-overlay"></div>
      </div>
      <div class="container">
        <div class="hero-content">
          <div class="hero-text">
            <span class="hero-badge">{{ localizedValue(hero, 'tag') }}</span>
            <h1 class="hero-title">{{ localizedValue(hero, 'title') }}</h1>
            <p class="hero-subtitle">{{ localizedValue(hero, 'subtitle') }}</p>
            
            <div class="hero-stats">
              <div class="stat-item">
                <div class="stat-number">{{ hero?.stat1_num }}</div>
                <div class="stat-label">{{ localizedValue(hero, 'stat1_label') }}</div>
              </div>
              <div class="stat-item">
                <div class="stat-number">{{ hero?.stat2_num }}</div>
                <div class="stat-label">{{ localizedValue(hero, 'stat2_label') }}</div>
              </div>
              <div class="stat-item">
                <div class="stat-number">{{ hero?.stat3_num }}</div>
                <div class="stat-label">{{ localizedValue(hero, 'stat3_label') }}</div>
              </div>
            </div>
            
            <div class="hero-actions">
              <router-link to="/products" class="btn btn-primary btn-lg">
                <svg class="icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
                </svg>
                {{ t('viewMore') }}
              </router-link>
              <router-link to="/contact" class="btn btn-outline btn-lg">
                <svg class="icon" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                {{ t('contactUs') }}
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Featured Products -->
    <section class="section featured-products" v-if="featuredProducts.length">
      <div class="container">
        <div class="section-header">
          <div class="section-badge">{{ t('products') }}</div>
          <h2 class="section-title">{{ t('featuredProducts') }}</h2>
          <p class="section-subtitle">{{ pageTexts?.featured_subtitle || 'Discover our premium LED lighting solutions' }}</p>
        </div>
        
        <div class="products-grid">
          <router-link 
            v-for="product in featuredProducts" 
            :key="product.id" 
            :to="`/products/${product.id}`"
            class="product-card"
          >
            <div class="product-image">
              <img :src="product.images?.split(',')[0] || '/placeholder.svg'" :alt="localizedValue(product, 'name')" />
              <div class="product-overlay">
                <div class="product-actions">
                  <button class="action-btn">
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div class="product-info">
              <h3 class="product-name">{{ localizedValue(product, 'name') }}</h3>
              <p class="product-category">{{ localizedValue(product, 'category_name') }}</p>
            </div>
          </router-link>
        </div>
        
        <div class="section-footer">
          <router-link to="/products" class="btn btn-outline">
            {{ t('viewMore') }}
            <svg class="icon" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </router-link>
        </div>
      </div>
    </section>

    <!-- Categories -->
    <section class="section categories-section" v-if="categories.length">
      <div class="container">
        <div class="section-header">
          <div class="section-badge">Categories</div>
          <h2 class="section-title">{{ t('productCategories') }}</h2>
          <p class="section-subtitle">{{ pageTexts?.categories_subtitle || 'Explore our comprehensive range of LED products' }}</p>
        </div>
        
        <div class="categories-grid">
          <router-link 
            v-for="cat in categories" 
            :key="cat.id" 
            :to="`/products?category=${cat.id}`"
            class="category-card"
          >
            <div class="category-image">
              <img :src="cat.image || '/placeholder.svg'" :alt="localizedValue(cat, 'name')" />
              <div class="category-overlay">
                <div class="category-icon">
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
            <div class="category-info">
              <h3 class="category-name">{{ localizedValue(cat, 'name') }}</h3>
              <p class="category-count">{{ cat.product_count }} Products</p>
            </div>
          </router-link>
        </div>
      </div>
    </section>

    <!-- Advantages -->
    <section class="section advantages-section">
      <div class="container">
        <div class="section-header">
          <div class="section-badge">Why Choose Us</div>
          <h2 class="section-title">{{ t('ourAdvantages') }}</h2>
          <p class="section-subtitle">{{ pageTexts?.advantages_subtitle || 'Professional LED solutions with unmatched quality and service' }}</p>
        </div>
        
        <div class="advantages-grid">
          <div class="advantage-card">
            <div class="advantage-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z"/>
                <path d="M8 21v-4a2 2 0 012-2h4a2 2 0 012 2v4"/>
                <path d="M9 7V4a2 2 0 012-2h2a2 2 0 012 2v3"/>
              </svg>
            </div>
            <h3 class="advantage-title">{{ t('factoryDirect') }}</h3>
            <p class="advantage-desc">Direct from manufacturer with competitive pricing and quality control</p>
          </div>
          
          <div class="advantage-card">
            <div class="advantage-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 12l2 2 4-4"/>
                <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
                <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
                <path d="M13 12h1"/>
              </svg>
            </div>
            <h3 class="advantage-title">{{ t('qualityAssurance') }}</h3>
            <p class="advantage-desc">Rigorous testing and certification ensuring premium quality standards</p>
          </div>
          
          <div class="advantage-card">
            <div class="advantage-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>
            <h3 class="advantage-title">{{ t('fastDelivery') }}</h3>
            <p class="advantage-desc">Efficient logistics and worldwide shipping for timely delivery</p>
          </div>
          
          <div class="advantage-card">
            <div class="advantage-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <h3 class="advantage-title">{{ t('customService') }}</h3>
            <p class="advantage-desc">Tailored solutions and professional support for your specific needs</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="section cta-section">
      <div class="container">
        <div class="cta-content">
          <div class="cta-text">
            <h2 class="cta-title">{{ pageTexts?.cta_title || 'Ready to Start Your Project?' }}</h2>
            <p class="cta-subtitle">{{ pageTexts?.cta_subtitle || 'Get in touch with our experts for professional LED lighting solutions' }}</p>
          </div>
          <div class="cta-actions">
            <router-link to="/contact" class="btn btn-primary btn-lg">
              {{ t('contactUs') }}
            </router-link>
            <router-link to="/products" class="btn btn-ghost btn-lg">
              {{ t('viewMore') }}
            </router-link>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useLang } from '../composables/useLang'
import api from '../api'

const { t, localizedValue } = useLang()
const hero = ref({})
const featuredProducts = ref([])
const categories = ref([])
const pageTexts = ref({})

onMounted(async () => {
  try {
    hero.value = await api.getHero()
    const productsRes = await api.getProducts({ featured: '1', limit: 4 })
    featuredProducts.value = productsRes.data
    const tree = await api.getCategoryTree()
    categories.value = tree.slice(0, 6)
    pageTexts.value = await api.getPageTexts()
  } catch (e) {
    console.error(e)
  }
})
</script>

<style scoped>
/* Hero Section */
.hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  background: var(--primary-gradient);
  overflow: hidden;
}

.hero-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><defs><pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/></pattern></defs><rect width="100%" height="100%" fill="url(%23grid)"/></svg>');
}

.hero-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(30, 64, 175, 0.9) 0%, rgba(59, 130, 246, 0.8) 100%);
}

.hero-content {
  position: relative;
  z-index: 2;
  text-align: center;
  color: var(--white);
  max-width: 800px;
  margin: 0 auto;
}

.hero-badge {
  display: inline-block;
  padding: 8px 24px;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50px;
  font-size: var(--text-sm);
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: var(--spacing-md);
  backdrop-filter: blur(10px);
}

.hero-title {
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: 800;
  line-height: var(--leading-tight);
  margin-bottom: var(--spacing);
  background: linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: var(--text-xl);
  line-height: var(--leading-relaxed);
  margin-bottom: var(--spacing-2xl);
  opacity: 0.9;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.hero-stats {
  display: flex;
  justify-content: center;
  gap: var(--spacing-2xl);
  margin-bottom: var(--spacing-2xl);
}

.stat-item {
  text-align: center;
}

.stat-number {
  display: block;
  font-size: var(--text-5xl);
  font-weight: 800;
  line-height: 1;
  margin-bottom: var(--spacing-sm);
}

.stat-label {
  font-size: var(--text-sm);
  opacity: 0.8;
  font-weight: 500;
}

.hero-actions {
  display: flex;
  justify-content: center;
  gap: var(--spacing);
  flex-wrap: wrap;
}

.hero-actions .btn {
  min-width: 180px;
}

.btn-outline {
  background: rgba(255, 255, 255, 0.1);
  color: var(--white);
  border: 2px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(10px);
}

.btn-outline:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
}

/* Section Styles */
.section {
  padding: var(--spacing-2xl) 0;
}

.section-header {
  text-align: center;
  margin-bottom: var(--spacing-2xl);
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.section-badge {
  display: inline-block;
  padding: 6px 16px;
  background: var(--primary);
  color: var(--white);
  border-radius: 50px;
  font-size: var(--text-sm);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--spacing);
}

.section-title {
  font-size: var(--text-4xl);
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: var(--spacing);
  line-height: var(--leading-tight);
}

.section-subtitle {
  font-size: var(--text-lg);
  color: var(--text-secondary);
  line-height: var(--leading-relaxed);
}

.section-footer {
  text-align: center;
  margin-top: var(--spacing-2xl);
}

/* Featured Products */
.featured-products {
  background: var(--gray-50);
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
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

.product-info {
  padding: var(--spacing-md);
}

.product-name {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--spacing-sm);
  line-height: var(--leading-tight);
}

.product-category {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  font-weight: 500;
}

/* Categories */
.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-lg);
}

.category-card {
  background: var(--white);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow);
  transition: var(--transition-slow);
  text-decoration: none;
  color: inherit;
}

.category-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.category-image {
  position: relative;
  aspect-ratio: 16/9;
  overflow: hidden;
  background: var(--gray-100);
}

.category-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: var(--transition-slow);
}

.category-card:hover .category-image img {
  transform: scale(1.05);
}

.category-overlay {
  position: absolute;
  top: var(--spacing);
  right: var(--spacing);
  width: 40px;
  height: 40px;
  background: var(--white);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: var(--transition);
}

.category-card:hover .category-overlay {
  opacity: 1;
}

.category-icon svg {
  width: 20px;
  height: 20px;
  color: var(--primary);
}

.category-info {
  padding: var(--spacing-md);
}

.category-name {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--spacing-sm);
}

.category-count {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  font-weight: 500;
}

/* Advantages */
.advantages-section {
  background: var(--gray-50);
}

.advantages-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-lg);
}

.advantage-card {
  background: var(--white);
  padding: var(--spacing-2xl);
  border-radius: var(--radius-lg);
  text-align: center;
  box-shadow: var(--shadow);
  transition: var(--transition-slow);
}

.advantage-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.advantage-icon {
  width: 80px;
  height: 80px;
  background: var(--primary-gradient);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--spacing-md);
  color: var(--white);
}

.advantage-icon svg {
  width: 32px;
  height: 32px;
}

.advantage-title {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--spacing);
}

.advantage-desc {
  color: var(--text-secondary);
  line-height: var(--leading-relaxed);
}

/* CTA Section */
.cta-section {
  background: var(--primary-gradient);
  color: var(--white);
}

.cta-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-2xl);
  max-width: 1000px;
  margin: 0 auto;
}

.cta-title {
  font-size: var(--text-3xl);
  font-weight: 800;
  margin-bottom: var(--spacing);
  line-height: var(--leading-tight);
}

.cta-subtitle {
  font-size: var(--text-lg);
  opacity: 0.9;
  line-height: var(--leading-relaxed);
}

.cta-actions {
  display: flex;
  gap: var(--spacing);
  flex-shrink: 0;
}

.btn-ghost {
  background: rgba(255, 255, 255, 0.1);
  color: var(--white);
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.btn-ghost:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
}

.icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

/* Responsive Design */
@media (max-width: 768px) {
  .hero-stats {
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .hero-actions {
    flex-direction: column;
    align-items: center;
  }

  .hero-actions .btn {
    width: 100%;
    max-width: 280px;
  }

  .products-grid,
  .categories-grid,
  .advantages-grid {
    grid-template-columns: 1fr;
  }

  .cta-content {
    flex-direction: column;
    text-align: center;
  }

  .cta-actions {
    flex-direction: column;
    width: 100%;
  }

  .cta-actions .btn {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .section {
    padding: var(--spacing-xl) 0;
  }

  .section-title {
    font-size: var(--text-3xl);
  }

  .hero-title {
    font-size: var(--text-3xl);
  }

  .hero-subtitle {
    font-size: var(--text-lg);
  }

  .stat-number {
    font-size: var(--text-4xl);
  }
}
</style>
