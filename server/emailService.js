import nodemailer from 'nodemailer'
import { getOne } from './db.js'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import fs from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

export function getEmailConfig() {
    return getOne('SELECT * FROM email_config WHERE id = 1') || {}
}

export async function sendMail({ to, subject, html, text }) {
    const config = getEmailConfig()
    if (!config.enabled || !config.smtp_host || !config.smtp_user || !config.smtp_pass) {
        throw new Error('邮件服务未配置或未启用')
    }

    const transporter = nodemailer.createTransport({
        host: config.smtp_host,
        port: parseInt(config.smtp_port) || 465,
        secure: parseInt(config.smtp_port) === 465,
        auth: { user: config.smtp_user, pass: config.smtp_pass },
        tls: { rejectUnauthorized: false }
    })

    await transporter.sendMail({
        from: `"${config.from_name || 'SunSea Steel'}" <${config.smtp_user}>`,
        to: to || config.to_email,
        subject, html, text
    })
}

export async function sendInquiryNotification(inquiry) {
    const config = getEmailConfig()
    if (!config.enabled || !config.to_email) return

    const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1e40af;color:#fff;padding:24px;border-radius:8px 8px 0 0">
        <h2 style="margin:0">📩 新询盘通知</h2>
        <p style="margin:6px 0 0;opacity:0.85">来自 SunSea Steel 官网</p>
      </div>
      <div style="background:#f8fafc;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;border-top:none">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px 0;color:#64748b;width:120px">姓名</td><td style="padding:8px 0;font-weight:600">${inquiry.name}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">邮箱</td><td style="padding:8px 0"><a href="mailto:${inquiry.email}">${inquiry.email}</a></td></tr>
          ${inquiry.phone ? `<tr><td style="padding:8px 0;color:#64748b">电话</td><td style="padding:8px 0">${inquiry.phone}</td></tr>` : ''}
          ${inquiry.company ? `<tr><td style="padding:8px 0;color:#64748b">公司</td><td style="padding:8px 0">${inquiry.company}</td></tr>` : ''}
          ${inquiry.country ? `<tr><td style="padding:8px 0;color:#64748b">国家</td><td style="padding:8px 0">${inquiry.country}</td></tr>` : ''}
          ${inquiry.product_name ? `<tr><td style="padding:8px 0;color:#64748b">询盘产品</td><td style="padding:8px 0">${inquiry.product_name}</td></tr>` : ''}
        </table>
        ${inquiry.message ? `
        <div style="margin-top:16px;padding:16px;background:#fff;border-radius:8px;border:1px solid #e2e8f0">
          <p style="color:#64748b;margin:0 0 8px;font-size:13px">询盘内容</p>
          <p style="margin:0;line-height:1.6">${inquiry.message.replace(/\n/g, '<br>')}</p>
        </div>` : ''}
        <div style="margin-top:20px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8">
          此邮件由 SunSea Steel 系统自动发送 · ${new Date().toLocaleString('zh-CN')}
        </div>
      </div>
    </div>
  `

    try {
        await sendMail({
            to: config.to_email,
            subject: `【新询盘】${inquiry.name} - ${inquiry.company || '未填写公司'}`,
            html
        })
    } catch (e) {
        console.error('发送询盘邮件失败:', e.message)
    }
}

export function getSslDaysRemaining() {
    const SSL_DIR = join(__dirname, '..', 'ssl')
    const certFile = join(SSL_DIR, 'cert.pem')
    if (!fs.existsSync(certFile)) return null
    try {
        const output = execSync(`openssl x509 -enddate -noout -in "${certFile}" 2>/dev/null`, { timeout: 5000 }).toString().trim()
        const match = output.match(/notAfter=(.+)/)
        if (!match) return null
        const expiry = new Date(match[1])
        const days = Math.floor((expiry - new Date()) / (1000 * 60 * 60 * 24))
        return { days, expiry: expiry.toISOString(), expired: days < 0 }
    } catch (e) {
        return null
    }
}

export async function checkAndSendSslWarning() {
    const config = getEmailConfig()
    if (!config.enabled || !config.to_email) return
    const ssl = getSslDaysRemaining()
    if (!ssl) return
    const warnDays = parseInt(config.ssl_warn_days) || 30
    if (ssl.days > warnDays) return

    const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:${ssl.days < 7 ? '#dc2626' : '#f59e0b'};color:#fff;padding:24px;border-radius:8px 8px 0 0">
        <h2 style="margin:0">⚠️ SSL证书${ssl.expired ? '已过期' : '即将过期'}提醒</h2>
      </div>
      <div style="background:#f8fafc;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;border-top:none">
        <p>您的网站 <strong>www.sunseasteel.com</strong> 的 SSL 证书${ssl.expired ? '已过期。' : `将在 <strong>${ssl.days} 天</strong>后到期。`}</p>
        <p>到期时间：${new Date(ssl.expiry).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <p>请及时在后台「系统设置」→「SSL证书配置」中更新证书，避免影响网站正常访问。</p>
        <div style="margin-top:20px;font-size:12px;color:#94a3b8">
          此邮件由 SunSea Steel 系统自动发送 · ${new Date().toLocaleString('zh-CN')}
        </div>
      </div>
    </div>
  `
    try {
        await sendMail({
            to: config.to_email,
            subject: `【SSL提醒】证书${ssl.expired ? '已过期' : `还有 ${ssl.days} 天到期`} - www.sunseasteel.com`,
            html
        })
    } catch (e) {
        console.error('发送SSL到期邮件失败:', e.message)
    }
}
