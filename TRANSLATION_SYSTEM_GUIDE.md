# AI 多语言翻译系统架构与避坑指南

本文档总结了本项目在“多语言实时翻译”及“前端语言切换显示”中踩过的坑与确立的架构规范。
**未来的开发和代码重构中，请严格遵守本文档所述原则，切勿破坏已修复的底层逻辑。**

---

## 一、 前端：响应式多语言数据加载机制

### 💣 曾经的灾难（问题重现）
用户在页面顶部切换语言（例如切换到泰语）后，URL 和本地状态已经改变，但页面上的产品分类、文章标题等**大部分动态获取的数据依然是英文（上一次的语言缓存）**。
**根本原因**：之前，各个前端 `.vue` 组件仅在 `onMounted` 钩子中（也就是页面刚打开时）获取数据。切换语言时，即便 `useLang.js` 清除了本地缓存并触发了 `lang` 变量变化，但组件**并未去服务器重新索要包含最新 `?lang=th` 参数的数据**。

### ✅ 核心规范：所有需请求 API 的视图必须监听语言切换
在任何**需从服务器动态获取翻译内容**的页面或组件中：
1. **必须引入并解构 `lang`**：
   ```javascript
   import { watch, onMounted } from 'vue';
   import { useLang } from '../composables/useLang';
   const { lang, t, localizedValue } = useLang();
   ```
2. **必须将 API 请求封装并附加 `watch` 监听**：
   **严禁**直接将所有请求逻辑裸写在 `onMounted` 中，必须声明独立的加载函数（如 `loadData`），并令其同时绑定在挂载及语言监听上：
   ```javascript
   const loadData = async () => {
       try {
           // api 内部会自动携带当前环境的 ?lang=xx 参数
           data.value = await api.getData(); 
       } catch (e) {}
   };

   // 【核心命脉】必须监听 lang 并重新拉取数据
   watch(lang, loadData);
   onMounted(loadData);
   ```

**⚠️ 已打好补丁的阵地（切勿被修改掉 `watch(lang)`）：**
- `SiteHeader.vue` (导航分类菜单)
- `SiteFooter.vue` (底部信息与新闻)
- `Products.vue` / `ProductDetail.vue` (产品系统)
- `News.vue` / `NewsDetail.vue` (新闻系统)
- `About.vue` (公司信息与展示页)
- `RoofingProfiles.vue` / `RalColors.vue` (周边产品页)

*(注：`FuturesPrice.vue` / 期货行情 是个特例，它的 API 一次性返回了所有的语种字段 `name_th` / `name_zh`，依赖 `localizedValue` 纯前端实时切换，不需要触发再次加载。)*

---

## 二、 后端：批量翻译的并发防冲突机制

### 💣 曾经的灾难（问题重现）
在后台对“所有产品分类”进行“全面翻译”时，发现翻译经常跳字、或者最终只成功保存了列表中的“最后一个元素”。
**根本原因**：`translation.js` 中的批量打包函数 `translateBatch`，为了节约请求把多个产品打包成一个大的 JSON `fieldsObj` 丢给 AI。但是它**直接用了字段名（如 `name`、`seo_title`）作为 JSON 对象键**。多个产品都有 `name` 字段，导致字典严重冲突被覆盖。

### ✅ 核心规范：保持 Unique Key 映射原则
在修改 `translateBatch` (服务器端 `server/routes/translation.js`) 时，**绝对禁止恢复原初的覆盖合并法**。必须保持对每一个字段产生全局唯一标识 `_uniqueFieldObjKey`：
```javascript
// 【正确逻辑】每个翻译项生成绝对唯一的 UUID 以防合并覆盖
const uniqueKey = `${itemOriginalIndex}_${index}_${field.name}_${Math.random().toString(36).substr(2, 9)}`;
fieldsObj[uniqueKey] = originalText;
```

---

## 三、 AI 预设：严格纯净输出控制 

### 💣 曾经的灾难（问题重现）
AI 在翻译时会“自作聪敏”，例如：
- 偷偷把原文缩写夹杂在里面（如：`แผ่นหลังคาลูกคลื่น (Corrugated Roofing Sheet)` 或者 `เหล็กม้วน Galvalume`）
- 在句末大写追加后缀（如：`คอยล์เหล็ก GI`）

### ✅ 核心规范：翻译提示词 (Prompt) 维护
如果未来更换大模型或者继续改进提示词，必须**死守 V5 版本的红线**（目前已在外部 API 设定为 “V4 通用强制多语种提示词” 和 “260615”）：
1. **最高指令封锁**：明确要求只能输出单语种对象，禁止添加英文、禁止加括号备注、禁止附带前置提示语（如“翻译结果如下”）。
2. **全翻译产品名规则**：明确像 `Galvalume`, `Galvanized`, `Corrugated` 是名词而非符号，**必须**被翻译成本地语言。
3. **极窄白名单规则**：像 `PPGI`, `GL`, `CRC` 这种行业缩写，只有在**跟带有数字的规格代码（如 Z275, AZ150, RAL 9002）相连时**，才可以保留（作为型号）。如果只是“产品大类名称”，不准保留缩写尾巴。

---

**最终警告总结**：
整个站点的多语种生命线建立在 **[前端生命周期组件动态侦听刷新] + [后端 UUID 防覆盖哈希表] + [AI 零冗余极净提示词]** 这个铁三角上。任何后期的重构均不得将上述三个机制“为了代码看起来更短”而进行简化移除。
