const fs = require('fs');
let c = fs.readFileSync('src/views/admin/AISettings.vue', 'utf8');

const target1 = `              <td>
                <button class="btn btn-sm btn-secondary" @click="editChannel(ch)">编辑</button>
                <button class="btn btn-sm btn-outline" style="color:#0077b5;border-color:#0077b5;" @click="fetchModels(ch)">获取模型</button>
                <button class="btn btn-sm btn-danger" @click="deleteChannel(ch)">删除</button>
              </td>`;

const repl1 = `              <td>
                <button class="btn btn-sm btn-outline" style="color:#10b981;border-color:#10b981;" @click="testChannel(ch)">测试</button>
                <button class="btn btn-sm btn-secondary" @click="editChannel(ch)">编辑</button>
                <button class="btn btn-sm btn-outline" style="color:#0077b5;border-color:#0077b5;" @click="fetchModels(ch)">获取模型</button>
                <button class="btn btn-sm btn-outline" style="color:#059669;border-color:#059669;" @click="setDefault(ch)" v-if="!ch.is_default">设为默认文本</button>
                <button class="btn btn-sm btn-outline" style="color:#d97706;border-color:#f59e0b;" @click="setImageDefault(ch)" v-if="!ch.is_image_default">设为默认生图</button>
                <button class="btn btn-sm btn-danger" @click="deleteChannel(ch)">删除</button>
              </td>`;

const target2 = `async function deleteChannel(ch) {
  if (!confirm(\`确定删除渠道 "\${ch.name}"？\`)) return
  try { await api.deleteAIChannel(ch.id); await loadChannels() } catch (e) { alert(e.message) }
}`;

const repl2 = `async function deleteChannel(ch) {
  if (!confirm(\`确定删除渠道 "\${ch.name}"？\`)) return
  try { await api.deleteAIChannel(ch.id); await loadChannels() } catch (e) { alert(e.message) }
}

async function testChannel(ch) {
  try {
    alert('正在测试渠道连通性，请稍候...')
    const res = await api.testAIChannel(ch.id)
    alert(\`测试成功!\\n模型: \${res.model}\\n响应耗时: \${res.time_ms}ms\\nAPI回复: \${res.reply}\`)
  } catch (e) {
    alert(\`测试失败:\\n\${e.message}\`)
  }
}

async function setDefault(ch) {
  try {
    await api.setAIDefaultChannel(ch.id)
    await loadChannels()
  } catch (e) { alert('设置失败: ' + e.message) }
}

async function setImageDefault(ch) {
  try {
    await api.setAIImageDefaultChannel(ch.id)
    await loadChannels()
  } catch (e) { alert('设置失败: ' + e.message) }
}`;

if (!c.includes(target1)) {
  console.log("Could not find target1");
  // maybe the spacing is different, let's fall back to regex
  c = c.replace(/<td>[\s\S]*?获取模型<\/button>[\s\S]*?删除<\/button>[\s\S]*?<\/td>/, repl1);
} else {
  c = c.replace(target1, repl1);
}

if (!c.includes(target2)) {
  console.log("Could not find target2");
  c = c.replace(/async function deleteChannel[\s\S]*?alert\(e\.message\) \}\r?\n\}/, repl2);
} else {
  c = c.replace(target2, repl2);
}

fs.writeFileSync('src/views/admin/AISettings.vue', c);
console.log('done');
