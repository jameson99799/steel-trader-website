/**
 * One-time script to insert the English Steel Products Cold Email template
 * with clickable product images.
 *
 * Run: node scripts/insert-cold-email-template.js
 */
import Database from 'better-sqlite3'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dbPath = join(__dirname, '..', 'data', 'data.db')
const db = new Database(dbPath)

const name = 'Steel Products Cold Email - English (Clickable Images)'
const subject = 'Premium Steel Products | Factory Direct Prices — FADA STEEL'
const note = 'English cold email with clickable product images + professional signature'
const template_type = 'html'

const html_body = `<!-- Steel Products Cold Email with Clickable Images -->
<div style="max-width:650px;margin:0 auto;font-family:'Segoe UI',Arial,Helvetica,sans-serif;color:#2c3e50;line-height:1.7">

  <!-- Header Greeting -->
  <p style="font-size:15px;margin:0 0 10px">Dear {{name}},</p>

  <p style="font-size:14px;margin:0 0 18px;color:#333">
    I hope this email finds you well. I'm Jameson from <strong style="color:#1f4e79">FADA STEEL</strong>, one of China's leading manufacturers specializing in 
    <strong>GI, GL, PPGI, PPGL, and CRC steel coils</strong>. We supply to over 60 countries with 
    annual production capacity of <strong>500,000+ MT</strong>.
  </p>

  <!-- Why Choose Us Highlights -->
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 22px;border-collapse:collapse">
    <tr>
      <td width="33%" style="padding:8px;text-align:center;background:#f0f7ff;border-radius:8px 0 0 8px">
        <div style="font-size:20px;margin-bottom:2px">🏭</div>
        <div style="font-size:12px;font-weight:700;color:#1f4e79">Factory Direct</div>
        <div style="font-size:11px;color:#666">Competitive Pricing</div>
      </td>
      <td width="33%" style="padding:8px;text-align:center;background:#f0f7ff">
        <div style="font-size:20px;margin-bottom:2px">🌍</div>
        <div style="font-size:12px;font-weight:700;color:#1f4e79">60+ Countries</div>
        <div style="font-size:11px;color:#666">Global Delivery</div>
      </td>
      <td width="34%" style="padding:8px;text-align:center;background:#f0f7ff;border-radius:0 8px 8px 0">
        <div style="font-size:20px;margin-bottom:2px">✅</div>
        <div style="font-size:12px;font-weight:700;color:#1f4e79">ISO Certified</div>
        <div style="font-size:11px;color:#666">Premium Quality</div>
      </td>
    </tr>
  </table>

  <p style="font-size:14px;margin:0 0 14px;color:#333;font-weight:600">
    📦 Our Main Products (click any image to view full size):
  </p>

  <!-- Product Images Grid — Clickable to open full size -->
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 8px;border-collapse:collapse">
    <tr>
      <!-- Product 1: PPGI -->
      <td width="50%" style="padding:0 6px 12px 0;vertical-align:top">
        <a href="https://www.fadasteel.com/products" target="_blank" style="text-decoration:none;display:block">
          <div style="border-radius:10px;overflow:hidden;border:1px solid #e0e6ed;background:#f8f9fa">
            <img src="https://www.fadasteel.com/uploads/ppgi-steel-coil-main.webp" alt="PPGI Prepainted Steel Coil" style="width:100%;height:160px;object-fit:cover;display:block;cursor:pointer" />
            <div style="padding:10px 12px">
              <div style="font-size:13px;font-weight:700;color:#1f4e79;margin-bottom:2px">PPGI Steel Coils</div>
              <div style="font-size:11px;color:#666;line-height:1.4">RAL colors • 0.12-1.2mm<br>PE/SMP/HDP/PVDF coating</div>
            </div>
          </div>
        </a>
      </td>
      <!-- Product 2: GI -->
      <td width="50%" style="padding:0 0 12px 6px;vertical-align:top">
        <a href="https://www.fadasteel.com/products" target="_blank" style="text-decoration:none;display:block">
          <div style="border-radius:10px;overflow:hidden;border:1px solid #e0e6ed;background:#f8f9fa">
            <img src="https://www.fadasteel.com/uploads/gi-steel-coil-main.webp" alt="Galvanized Steel Coil" style="width:100%;height:160px;object-fit:cover;display:block;cursor:pointer" />
            <div style="padding:10px 12px">
              <div style="font-size:13px;font-weight:700;color:#1f4e79;margin-bottom:2px">GI Steel Coils</div>
              <div style="font-size:11px;color:#666;line-height:1.4">Zinc 40-275 g/m²<br>Spangle / Chromated / Oiled</div>
            </div>
          </div>
        </a>
      </td>
    </tr>
    <tr>
      <!-- Product 3: GL / Galvalume -->
      <td width="50%" style="padding:0 6px 12px 0;vertical-align:top">
        <a href="https://www.fadasteel.com/products" target="_blank" style="text-decoration:none;display:block">
          <div style="border-radius:10px;overflow:hidden;border:1px solid #e0e6ed;background:#f8f9fa">
            <img src="https://www.fadasteel.com/uploads/gl-galvalume-steel-coil.webp" alt="Galvalume Steel Coil" style="width:100%;height:160px;object-fit:cover;display:block;cursor:pointer" />
            <div style="padding:10px 12px">
              <div style="font-size:13px;font-weight:700;color:#1f4e79;margin-bottom:2px">GL / Galvalume Coils</div>
              <div style="font-size:11px;color:#666;line-height:1.4">AZ50-AZ150 coating<br>Excellent corrosion resistance</div>
            </div>
          </div>
        </a>
      </td>
      <!-- Product 4: CRC -->
      <td width="50%" style="padding:0 0 12px 6px;vertical-align:top">
        <a href="https://www.fadasteel.com/products" target="_blank" style="text-decoration:none;display:block">
          <div style="border-radius:10px;overflow:hidden;border:1px solid #e0e6ed;background:#f8f9fa">
            <img src="https://www.fadasteel.com/uploads/crc-steel-coil.webp" alt="Cold Rolled Steel Coil" style="width:100%;height:160px;object-fit:cover;display:block;cursor:pointer" />
            <div style="padding:10px 12px">
              <div style="font-size:13px;font-weight:700;color:#1f4e79;margin-bottom:2px">CRC Steel Coils</div>
              <div style="font-size:11px;color:#666;line-height:1.4">SPCC/DC01/DC03/DC04<br>Bright / Matte finish</div>
            </div>
          </div>
        </a>
      </td>
    </tr>
  </table>

  <!-- Specifications Summary -->
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px;border-collapse:collapse;font-size:12px">
    <tr style="background:#1f4e79;color:#fff">
      <td style="padding:8px 12px;font-weight:700;border-radius:6px 0 0 0">Specification</td>
      <td style="padding:8px 12px;font-weight:700">Range</td>
      <td style="padding:8px 12px;font-weight:700;border-radius:0 6px 0 0">Standard</td>
    </tr>
    <tr style="background:#f8f9fa">
      <td style="padding:6px 12px;border-bottom:1px solid #e8e8e8">Thickness</td>
      <td style="padding:6px 12px;border-bottom:1px solid #e8e8e8">0.12mm – 2.0mm</td>
      <td style="padding:6px 12px;border-bottom:1px solid #e8e8e8">ASTM / JIS / EN</td>
    </tr>
    <tr>
      <td style="padding:6px 12px;border-bottom:1px solid #e8e8e8">Width</td>
      <td style="padding:6px 12px;border-bottom:1px solid #e8e8e8">600mm – 1250mm</td>
      <td style="padding:6px 12px;border-bottom:1px solid #e8e8e8">Custom available</td>
    </tr>
    <tr style="background:#f8f9fa">
      <td style="padding:6px 12px;border-bottom:1px solid #e8e8e8">Coil Weight</td>
      <td style="padding:6px 12px;border-bottom:1px solid #e8e8e8">3MT – 8MT</td>
      <td style="padding:6px 12px;border-bottom:1px solid #e8e8e8">As requested</td>
    </tr>
    <tr>
      <td style="padding:6px 12px;border-radius:0 0 0 6px">MOQ</td>
      <td style="padding:6px 12px">25MT per spec</td>
      <td style="padding:6px 12px;border-radius:0 0 6px 0">Mixed container OK</td>
    </tr>
  </table>

  <!-- CTA -->
  <p style="font-size:14px;margin:0 0 8px;color:#333">
    We'd love to discuss how we can support your steel requirements with 
    <strong>competitive pricing</strong> and <strong>reliable delivery</strong>.
  </p>
  <p style="font-size:14px;margin:0 0 8px;color:#333">
    Could you share your current specifications or target price? 
    I'll prepare a detailed quotation within <strong>12 hours</strong>.
  </p>

  <!-- Quick Action Buttons -->
  <table cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 20px">
    <tr>
      <td style="padding-right:10px">
        <a href="mailto:{{email}}?subject=Steel%20Inquiry" target="_blank" style="display:inline-block;padding:10px 22px;background:#1f4e79;color:#ffffff;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600">📧 Request Quote</a>
      </td>
      <td>
        <a href="{{whatsapp_link}}" target="_blank" style="display:inline-block;padding:10px 22px;background:#25d366;color:#ffffff;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600">💬 WhatsApp Us</a>
      </td>
    </tr>
  </table>

  <!-- Signature -->
  <div style="margin-top:30px;padding-top:20px;border-top:2px solid #e0e6ed;font-family:Arial,sans-serif;font-size:13px;color:#555;line-height:1.8">
    <p style="margin:0 0 4px"><strong>Best Regards</strong></p>
    <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:#1f4e79">Mr Jameson / Sales Manager / International Dept.</p>
    <p style="margin:0 0 4px">📱 Mobile / WhatsApp / Wechat: <a href="{{whatsapp_link}}" style="color:#25d366;text-decoration:none">{{phone}}</a></p>
    <p style="margin:0 0 12px">📧 Email: <a href="mailto:{{email}}" style="color:#0563c1;text-decoration:none">{{email}}</a></p>
    <p style="margin:0;font-weight:700;color:#1f4e79;font-size:13px">SHANDONG FADA STEEL CO., LTD</p>
    <p style="margin:0;font-size:12px;color:#777">SHANDONG YANGGU NEW GLOBAL STEEL CO., LTD</p>
    <p style="margin:0;font-size:12px;color:#777">FADA STEEL PTE. LTD. (SINGAPORE BRANCH)</p>
    <p style="margin:4px 0 0;font-size:12px;color:#777">📍 ADD: YANGGU, LIAOCHENG CITY, SHANDONG PROVINCE, CHINA</p>
    <p style="margin:2px 0 0">🌐 <a href="https://www.fadasteel.com" style="color:#0563c1;text-decoration:none;font-weight:600">WWW.FADASTEEL.COM</a></p>
  </div>

</div>`

// Check if template already exists
const existing = db.prepare("SELECT id FROM mail_templates WHERE name = ?").get(name)
if (existing) {
  db.prepare("UPDATE mail_templates SET subject=?, html_body=?, note=?, template_type=?, updated_at=CURRENT_TIMESTAMP WHERE id=?")
    .run(subject, html_body, note, template_type, existing.id)
  console.log(`✅ Updated existing template (id: ${existing.id})`)
} else {
  const r = db.prepare("INSERT INTO mail_templates (name, subject, html_body, note, template_type) VALUES (?,?,?,?,?)")
    .run(name, subject, html_body, note, template_type)
  console.log(`✅ Created new template (id: ${r.lastInsertRowid})`)
}

db.close()
console.log('Done!')
