/**
 * One-time script to insert the English Steel Products Cold Email template.
 * Images are displayed inline (no click-to-enlarge, no <a> wrappers).
 * Max width 600px for email client compatibility.
 *
 * Run on server: node scripts/insert-cold-email-template.js
 */
import Database from 'better-sqlite3'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dbPath = join(__dirname, '..', 'data', 'database.db')
const db = new Database(dbPath)

const name = 'Steel Products Cold Email - English'
const subject = 'Premium Steel Coils | Factory Direct — FADA STEEL'
const note = 'English cold email - steel products with product cards and specs table'
const template_type = 'html'

const html_body = `<div style="max-width:600px;margin:0 auto;font-family:'Segoe UI',Arial,Helvetica,sans-serif;color:#2c3e50;line-height:1.7">

  <p style="font-size:15px;margin:0 0 10px">Dear {{name}},</p>

  <p style="font-size:14px;margin:0 0 18px;color:#333">
    I hope this email finds you well. I'm Jameson from <strong style="color:#1f4e79">FADA STEEL</strong>, one of China's leading manufacturers specializing in 
    <strong>GI, GL, PPGI, PPGL, and CRC steel coils</strong>. We supply to over 60 countries with 
    annual production capacity of <strong>500,000+ MT</strong>.
  </p>

  <!-- Why Choose Us -->
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px;border-collapse:collapse">
    <tr>
      <td width="33%" style="padding:8px;text-align:center;background:#f0f7ff;border-radius:8px 0 0 8px">
        <div style="font-size:18px;margin-bottom:2px">🏭</div>
        <div style="font-size:11px;font-weight:700;color:#1f4e79">Factory Direct</div>
        <div style="font-size:10px;color:#666">Best Pricing</div>
      </td>
      <td width="33%" style="padding:8px;text-align:center;background:#f0f7ff">
        <div style="font-size:18px;margin-bottom:2px">🌍</div>
        <div style="font-size:11px;font-weight:700;color:#1f4e79">60+ Countries</div>
        <div style="font-size:10px;color:#666">Global Delivery</div>
      </td>
      <td width="34%" style="padding:8px;text-align:center;background:#f0f7ff;border-radius:0 8px 8px 0">
        <div style="font-size:18px;margin-bottom:2px">✅</div>
        <div style="font-size:11px;font-weight:700;color:#1f4e79">ISO Certified</div>
        <div style="font-size:10px;color:#666">Premium Quality</div>
      </td>
    </tr>
  </table>

  <p style="font-size:14px;margin:0 0 12px;color:#333;font-weight:600">📦 Our Main Products:</p>

  <!-- Product List (text-based, no wide images) -->
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px;border-collapse:collapse">
    <tr>
      <td style="padding:10px 14px;background:#f8fafc;border-left:3px solid #1f4e79;border-radius:4px;margin-bottom:6px">
        <div style="font-size:13px;font-weight:700;color:#1f4e79">🔷 PPGI / PPGL — Prepainted Steel Coils</div>
        <div style="font-size:12px;color:#555;margin-top:2px">RAL/custom colors • 0.12-1.2mm • PE/SMP/HDP/PVDF coating • Roofing & cladding</div>
      </td>
    </tr>
    <tr><td style="height:6px"></td></tr>
    <tr>
      <td style="padding:10px 14px;background:#f8fafc;border-left:3px solid #2980b9;border-radius:4px">
        <div style="font-size:13px;font-weight:700;color:#2980b9">🔷 GI — Galvanized Steel Coils</div>
        <div style="font-size:12px;color:#555;margin-top:2px">Zinc 40-275 g/m² • Spangle/chromated/oiled • Construction & HVAC</div>
      </td>
    </tr>
    <tr><td style="height:6px"></td></tr>
    <tr>
      <td style="padding:10px 14px;background:#f8fafc;border-left:3px solid #27ae60;border-radius:4px">
        <div style="font-size:13px;font-weight:700;color:#27ae60">🔷 GL — Galvalume Steel Coils</div>
        <div style="font-size:12px;color:#555;margin-top:2px">AZ50-AZ150 Al-Zn coating • Superior corrosion resistance • Roofing & solar</div>
      </td>
    </tr>
    <tr><td style="height:6px"></td></tr>
    <tr>
      <td style="padding:10px 14px;background:#f8fafc;border-left:3px solid #e67e22;border-radius:4px">
        <div style="font-size:13px;font-weight:700;color:#e67e22">🔷 CRC — Cold Rolled Steel Coils</div>
        <div style="font-size:12px;color:#555;margin-top:2px">SPCC/DC01-DC04 • Bright/matte finish • Auto parts & appliances</div>
      </td>
    </tr>
  </table>

  <!-- Specifications -->
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px;border-collapse:collapse;font-size:12px">
    <tr style="background:#1f4e79;color:#fff">
      <td style="padding:7px 10px;font-weight:700;border-radius:6px 0 0 0">Specification</td>
      <td style="padding:7px 10px;font-weight:700">Range</td>
      <td style="padding:7px 10px;font-weight:700;border-radius:0 6px 0 0">Standard</td>
    </tr>
    <tr style="background:#f8f9fa">
      <td style="padding:5px 10px;border-bottom:1px solid #e8e8e8">Thickness</td>
      <td style="padding:5px 10px;border-bottom:1px solid #e8e8e8">0.12mm – 2.0mm</td>
      <td style="padding:5px 10px;border-bottom:1px solid #e8e8e8">ASTM / JIS / EN</td>
    </tr>
    <tr>
      <td style="padding:5px 10px;border-bottom:1px solid #e8e8e8">Width</td>
      <td style="padding:5px 10px;border-bottom:1px solid #e8e8e8">600mm – 1250mm</td>
      <td style="padding:5px 10px;border-bottom:1px solid #e8e8e8">Custom OK</td>
    </tr>
    <tr style="background:#f8f9fa">
      <td style="padding:5px 10px;border-bottom:1px solid #e8e8e8">Coil Weight</td>
      <td style="padding:5px 10px;border-bottom:1px solid #e8e8e8">3 – 8 MT</td>
      <td style="padding:5px 10px;border-bottom:1px solid #e8e8e8">As requested</td>
    </tr>
    <tr>
      <td style="padding:5px 10px;border-radius:0 0 0 6px">MOQ</td>
      <td style="padding:5px 10px">25 MT per spec</td>
      <td style="padding:5px 10px;border-radius:0 0 6px 0">Mixed container OK</td>
    </tr>
  </table>

  <p style="font-size:14px;margin:0 0 8px;color:#333">
    We'd love to discuss how we can support your steel requirements with 
    <strong>competitive pricing</strong> and <strong>reliable delivery</strong>.
  </p>
  <p style="font-size:14px;margin:0 0 12px;color:#333">
    Could you share your target specifications? I'll prepare a detailed quotation within <strong>12 hours</strong>.
  </p>

  <!-- CTA -->
  <table cellpadding="0" cellspacing="0" border="0" style="margin:12px 0 20px">
    <tr>
      <td style="padding-right:10px">
        <a href="mailto:{{email}}?subject=Steel%20Inquiry" style="display:inline-block;padding:10px 20px;background:#1f4e79;color:#ffffff;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600">📧 Request Quote</a>
      </td>
      <td>
        <a href="{{whatsapp_link}}" style="display:inline-block;padding:10px 20px;background:#25d366;color:#ffffff;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600">💬 WhatsApp Us</a>
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
const existing = db.prepare("SELECT id FROM mail_templates WHERE name LIKE '%Steel Products Cold Email%'").get()
if (existing) {
  db.prepare("UPDATE mail_templates SET name=?, subject=?, html_body=?, note=?, template_type=?, updated_at=CURRENT_TIMESTAMP WHERE id=?")
    .run(name, subject, html_body, note, template_type, existing.id)
  console.log(`✅ Updated existing template (id: ${existing.id})`)
} else {
  const r = db.prepare("INSERT INTO mail_templates (name, subject, html_body, note, template_type) VALUES (?,?,?,?,?)")
    .run(name, subject, html_body, note, template_type)
  console.log(`✅ Created new template (id: ${r.lastInsertRowid})`)
}

db.close()
console.log('Done!')
