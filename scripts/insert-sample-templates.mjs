// Script to insert sample email templates into the database
// Run: node scripts/insert-sample-templates.mjs

import Database from 'better-sqlite3'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dbPath = join(__dirname, '..', 'data', 'database.db')
const db = new Database(dbPath)

const LOGO_PLACEHOLDER = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
const IMG_PLACEHOLDER = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

// Hardcoded contact info — CTA buttons reference these same values
const CONTACT = {
  name: 'Mr Jameson',
  title: 'Sales Manager / International Dept.',
  email: 'jameson@fadasteel.com',
  phone: '+8615553478959',
  whatsapp_link: 'https://wa.me/8615553478959',
  website: 'https://www.fadasteel.com'
}

// ─── Standard Signature Block (hardcoded, not using template variables) ───────
const signature = `
<div style="margin-top:30px;padding-top:20px;border-top:2px solid #e0e6ed;font-family:Arial,sans-serif;font-size:13px;color:#555;line-height:1.8">
  <p style="margin:0 0 4px"><strong>Best Regards</strong></p>
  <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:#1f4e79">${CONTACT.name} / ${CONTACT.title}</p>
  <p style="margin:0 0 4px">📱 Mobile / WhatsApp / Wechat: <a href="${CONTACT.whatsapp_link}" style="color:#25d366;text-decoration:none">${CONTACT.phone}</a></p>
  <p style="margin:0 0 12px">📧 Email: <a href="mailto:${CONTACT.email}" style="color:#0563c1;text-decoration:none">${CONTACT.email}</a></p>
  <div style="margin:12px 0">
    <img src="${LOGO_PLACEHOLDER}" alt="FADA Steel Logo" style="max-height:60px;display:block" />
    <span class="replace-tip">📷 请上传公司LOGO图片（建议高度60px）</span>
  </div>
  <p style="margin:0;font-weight:700;color:#1f4e79;font-size:13px">SHANDONG FADA STEEL CO., LTD</p>
  <p style="margin:0;font-size:12px;color:#777">SHANDONG YANGGU NEW GLOBAL STEEL CO., LTD</p>
  <p style="margin:0;font-size:12px;color:#777">FADA STEEL PTE. LTD. (SINGAPORE BRANCH)</p>
  <p style="margin:4px 0 0;font-size:12px;color:#777">📍 ADD: YANGGU, LIAOCHENG CITY, SHANDONG PROVINCE, CHINA</p>
  <p style="margin:2px 0 0">🌐 <a href="${CONTACT.website}" style="color:#0563c1;text-decoration:none;font-weight:600">WWW.FADASTEEL.COM</a></p>
</div>`

// ─── English Cold Email Template ──────────────────────────────────────────────
const englishTemplate = {
  name: 'Cold Email - English (Steel Products)',
  subject: 'Factory Direct: Premium Galvanized & Prepainted Steel Coils — Competitive Pricing',
  html_body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;line-height:1.8">

  <p style="font-size:15px;margin-bottom:16px">Dear Sir/Madam,</p>

  <p style="margin-bottom:12px">I hope this email finds you well. My name is <strong>Jameson</strong>, Sales Manager at <strong>SHANDONG FADA STEEL CO., LTD</strong> — one of China's leading manufacturers and exporters of steel products with over <strong>15 years</strong> of industry experience.</p>

  <p style="margin-bottom:8px">We specialize in providing high-quality steel products including:</p>
  <ul style="margin:0 0 16px 20px;padding:0">
    <li>✅ <strong>PPGI/PPGL</strong> — Prepainted Galvanized & Galvalume Steel Coils (RAL colors available)</li>
    <li>✅ <strong>GI/GL</strong> — Hot-Dip Galvanized & Galvalume Steel Coils</li>
    <li>✅ <strong>Cold Rolled Coils/Sheets</strong> — CRC, SPCC, DC01-DC06</li>
    <li>✅ <strong>Corrugated Roofing Sheets</strong> — Various profiles for construction</li>
  </ul>

  <div style="display:flex;gap:10px;margin:16px 0">
    <div style="flex:1;aspect-ratio:4/3;overflow:hidden;border-radius:8px;background:#f0f4f8">
      <img src="${IMG_PLACEHOLDER}" alt="Steel coils" style="width:100%;height:100%;object-fit:cover" />
      <span class="replace-tip">📷 上传产品图片1（钢卷产品照片）</span>
    </div>
    <div style="flex:1;aspect-ratio:4/3;overflow:hidden;border-radius:8px;background:#f0f4f8">
      <img src="${IMG_PLACEHOLDER}" alt="Factory" style="width:100%;height:100%;object-fit:cover" />
      <span class="replace-tip">📷 上传产品图片2（工厂/仓库照片）</span>
    </div>
  </div>

  <h3 style="color:#1f4e79;margin:20px 0 8px;border-bottom:2px solid #e0e6ed;padding-bottom:6px">🏭 Why Choose FADA Steel?</h3>
  <ul style="margin:0 0 16px 20px;padding:0">
    <li><strong>Factory Direct</strong> — No middlemen, most competitive pricing</li>
    <li><strong>Annual Capacity</strong> — 500,000+ MT production capability</li>
    <li><strong>Quality Certified</strong> — ISO 9001, SGS, BV inspected</li>
    <li><strong>Fast Delivery</strong> — 15-25 days from order confirmation</li>
    <li><strong>Custom Specs</strong> — Thickness, width, color, coating all customizable</li>
    <li><strong>Global Export</strong> — Shipped to 60+ countries worldwide</li>
  </ul>

  <div style="background:linear-gradient(135deg,#1f4e79,#2980b9);border-radius:10px;padding:20px;text-align:center;margin:20px 0">
    <p style="color:white;font-size:16px;font-weight:700;margin:0 0 12px">📩 Get Your Free Quote Today!</p>
    <p style="margin:0">
      <a href="mailto:${CONTACT.email}" style="display:inline-block;background:#fff;color:#1f4e79;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:700;margin:0 8px">✉️ Email Us</a>
      <a href="${CONTACT.whatsapp_link}" style="display:inline-block;background:#25d366;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:700;margin:0 8px">💬 WhatsApp</a>
    </p>
  </div>

  <p style="margin-bottom:8px">I would be delighted to discuss your steel requirements and provide you with our most competitive quotation. Please feel free to reach out at any time.</p>

  <p style="margin-bottom:0">Looking forward to hearing from you!</p>

${signature}
</div>`,
  note: 'English cold email — CTA buttons and signature use same hardcoded contact info',
  template_type: 'html'
}

// ─── Thai Cold Email Template ─────────────────────────────────────────────────
const thaiTemplate = {
  name: 'Cold Email - ภาษาไทย (ผลิตภัณฑ์เหล็ก)',
  subject: 'จากโรงงานโดยตรง: เหล็กม้วนชุบสังกะสีและเคลือบสีคุณภาพสูง — ราคาแข่งขัน',
  html_body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;line-height:1.8">

  <p style="font-size:15px;margin-bottom:16px">เรียน ท่านผู้มีอุปการคุณ,</p>

  <p style="margin-bottom:12px">สวัสดีครับ ผมชื่อ <strong>Jameson</strong> ผู้จัดการฝ่ายขาย <strong>SHANDONG FADA STEEL CO., LTD</strong> — หนึ่งในผู้ผลิตและส่งออกผลิตภัณฑ์เหล็กชั้นนำของจีน ด้วยประสบการณ์มากกว่า <strong>15 ปี</strong> ในอุตสาหกรรม</p>

  <p style="margin-bottom:8px">เราเชี่ยวชาญในการจัดหาผลิตภัณฑ์เหล็กคุณภาพสูง ได้แก่:</p>
  <ul style="margin:0 0 16px 20px;padding:0">
    <li>✅ <strong>PPGI/PPGL</strong> — เหล็กม้วนชุบสังกะสีเคลือบสี (มีสี RAL ให้เลือก)</li>
    <li>✅ <strong>GI/GL</strong> — เหล็กม้วนชุบสังกะสีร้อน</li>
    <li>✅ <strong>เหล็กม้วนรีดเย็น</strong> — CRC, SPCC, DC01-DC06</li>
    <li>✅ <strong>แผ่นหลังคาลอนเหล็ก</strong> — หลากหลายโปรไฟล์สำหรับการก่อสร้าง</li>
  </ul>

  <div style="display:flex;gap:10px;margin:16px 0">
    <div style="flex:1;aspect-ratio:4/3;overflow:hidden;border-radius:8px;background:#f0f4f8">
      <img src="${IMG_PLACEHOLDER}" alt="เหล็กม้วน" style="width:100%;height:100%;object-fit:cover" />
      <span class="replace-tip">📷 上传产品图片1（钢卷产品照片）</span>
    </div>
    <div style="flex:1;aspect-ratio:4/3;overflow:hidden;border-radius:8px;background:#f0f4f8">
      <img src="${IMG_PLACEHOLDER}" alt="โรงงาน" style="width:100%;height:100%;object-fit:cover" />
      <span class="replace-tip">📷 上传产品图片2（工厂/仓库照片）</span>
    </div>
  </div>

  <h3 style="color:#1f4e79;margin:20px 0 8px;border-bottom:2px solid #e0e6ed;padding-bottom:6px">🏭 ทำไมต้องเลือก FADA Steel?</h3>
  <ul style="margin:0 0 16px 20px;padding:0">
    <li><strong>จากโรงงานโดยตรง</strong> — ไม่มีคนกลาง ราคาแข่งขันที่สุด</li>
    <li><strong>กำลังการผลิต</strong> — มากกว่า 500,000 ตันต่อปี</li>
    <li><strong>มาตรฐานคุณภาพ</strong> — ISO 9001, SGS, BV ตรวจสอบแล้ว</li>
    <li><strong>ส่งมอบรวดเร็ว</strong> — 15-25 วันหลังยืนยันคำสั่งซื้อ</li>
    <li><strong>สเปคตามสั่ง</strong> — ความหนา ความกว้าง สี การชุบ ปรับแต่งได้</li>
    <li><strong>ส่งออกทั่วโลก</strong> — ส่งไปมากกว่า 60 ประเทศทั่วโลก</li>
  </ul>

  <div style="background:linear-gradient(135deg,#1f4e79,#2980b9);border-radius:10px;padding:20px;text-align:center;margin:20px 0">
    <p style="color:white;font-size:16px;font-weight:700;margin:0 0 12px">📩 รับใบเสนอราคาฟรีวันนี้!</p>
    <p style="margin:0">
      <a href="mailto:${CONTACT.email}" style="display:inline-block;background:#fff;color:#1f4e79;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:700;margin:0 8px">✉️ อีเมลหาเรา</a>
      <a href="${CONTACT.whatsapp_link}" style="display:inline-block;background:#25d366;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:700;margin:0 8px">💬 WhatsApp</a>
    </p>
  </div>

  <p style="margin-bottom:8px">ผมยินดีเป็นอย่างยิ่งที่จะพูดคุยเกี่ยวกับความต้องการเหล็กของท่าน และเสนอราคาที่แข่งขันที่สุดให้ท่าน กรุณาติดต่อได้ตลอดเวลาครับ</p>

  <p style="margin-bottom:0">รอคอยที่จะได้รับข่าวจากท่านครับ!</p>

${signature}
</div>`,
  note: 'Thai cold email — ภาษาไทย — CTA buttons and signature use same hardcoded contact info',
  template_type: 'html'
}

// ─── Insert templates ─────────────────────────────────────────────────────────
const insert = db.prepare('INSERT INTO mail_templates (name, subject, html_body, note, template_type) VALUES (?, ?, ?, ?, ?)')

const r1 = insert.run(englishTemplate.name, englishTemplate.subject, englishTemplate.html_body, englishTemplate.note, englishTemplate.template_type)
console.log(`✅ English template created: id=${r1.lastInsertRowid}`)

const r2 = insert.run(thaiTemplate.name, thaiTemplate.subject, thaiTemplate.html_body, thaiTemplate.note, thaiTemplate.template_type)
console.log(`✅ Thai template created: id=${r2.lastInsertRowid}`)

db.close()
console.log('🎉 Done! Both templates inserted with hardcoded contact info.')
console.log(`   Email: ${CONTACT.email}`)
console.log(`   Phone: ${CONTACT.phone}`)
console.log(`   WhatsApp: ${CONTACT.whatsapp_link}`)
