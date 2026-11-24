<template>
  <MailerPage />
</template>

<script setup>
/**
 * Admin Mailer — 薄包装。
 * 实际实现在 src/views/mailer/MailerPage.vue（双端共享，CRM 通过 crm/Mailer.vue 包装进入）。
 */
import MailerPage from '../mailer/MailerPage.vue'
</script>
