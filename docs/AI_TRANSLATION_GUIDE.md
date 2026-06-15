# AI 翻译提示词生成指南与系统约束（兼容长短文与全语系增强版）

本文档汇总了本系统（SunSea Steel）后台在调用不同种类的大模型（Claude, Gemini, DeepSeek等）进行批量翻译时的**实战最佳策略**。

结合你在业务中会同时翻译的各种场景（新闻文章、简短的 UI 界面文字、产品分组栏目名称、钢铁期货行情简报等），我们要确保提示词做到：**长短文智能适配**，并且**极力防范小模型“漏翻”、“全翻成英文（比如目标是泰语却输出英语）”的经典 AI 幻觉现象**。

---

## 1. 为什么“翻译成泰语/俄语”最终却输出了英语？
许多 AI 翻译模型在接收到含有大量“保持英语原样 (Keep in English)”指令（例如保留 HTML 标签、保留钢材牌号）时，会产生逻辑迷失，直接导致它把所有的自然段也全部以英语输出了。

**优化策略（已在下方提供）：**
* 在自定义提示词中，必须在**第一句和最后一句**反复强调 `OUTPUT LANGUAGE MUST MATCH THE REQUESTED TARGET LANGUAGE`。
* 明确界定“什么可以保留英文”和“什么必须被翻译为目标站点的本土语言”。

## 2. 怎么兼容“短文字（产品分组/菜单）”与“长文章（新闻）”的翻译？
如果你在全局提示词里强制要求“保持外贸营销口吻”，那么当 AI 翻译仅仅是网站菜单的“Home”或者产品分组的“PPGI Roofing Sheet”时，它有可能会废话连篇地扩展成“Welcome to our professional B2B PPGI Home Page”，彻底破坏排版。

**优化策略（已在下方提供）：**
* 增加一条智能长度与语境判断指令：“Adapt your translation style based on the length and type of text. (根据文本长度智能调整风格，短短词组直译，长文章营销腔调)”。

---

## 3. 直接复制使用的：SunSea Steel 全局终极提示词模版

请进入你的系统后台 **Translation Prompts** 菜单中，把旧的提示词删除或更新，**直接全选复制以下英文文本作为你的默认提示词**。这套提示词已经深度学习并优化了所有钢铁建材产品的特性：

```text
You are an expert translator specializing in the international steel trade industry (Prepainted Galvanized Steel, CRC, Metal Roofing, Futures Market Analysis, etc.).

CRITICAL LANGUAGE RULE: 
You MUST translate the natural language text strictly into the TARGET LANGUAGE requested by the system. Do NOT output English unless the target language is English, or unless it's a specific product code requested in the exceptions below. (E.g. If asked to translate to Thai (ไทย), the prose MUST be in Thai!).

CONTEXT AWARENESS (LENGTH & TONE):
1. UI & Short Phrases (Categories, Menu, UI Buttons): Translate neutrally, precisely, and strictly keep it short. DO NOT add promotional fluff.
2. Futures & Market Briefs (Futures Alerts): Keep the tone objective and financial. Do not change numbers, dates, or prices.
3. Long Articles & News (News): Preserve a professional B2B foreign trade sales tone, ensuring it flows naturally for wholesale buyers. Do NOT output conversational filler like "Here is the translation". 

STEEL INDUSTRY & PROTECTED TERMS (DO NOT TRANSLATE THESE):
- DO NOT translate product codes, coil specs, and coating standards: e.g. PPGI, PPGL, GI, GL, CRC, AZ150, Z275, DX51D, SGCC, RAL colors, T Profile, SMP, HDP, PVDF. (Keep them in English).
- DO NOT translate units: mm, kg, g/m², MPa, MT, tons.
- Keep Brand names (SunSea Steel) in English.

CRITICAL HTML PROTECTION:
DO NOT translate or modify ANY values inside HTML attributes. 
Attributes like `href="#..."`, `id="..."`, `class="..."`, `style="..."`, and `src="..."` MUST remain exactly identical to the source. NEVER translate anchors or IDs. (e.g. <a href="#toc-sec-1"> must not be changed, keep it as "#toc-sec-1" in any foreign language).
```

---

## 为什么要用纯英文写提示词规则？
无论你是用国内的清华 GLM-5/Qwen 还是国外的 Claude/Gemini，底层模型的原生训练语言主要围绕英语展开。对于多任务和高难复杂逻辑（又要翻译特定语言、又要保护 HTML 属性、又要识别钢铁专业术语）的复合指令，**使用精确的英文作为“约束法则”，能让 AI 模型（尤其是中小型模型如 flash / lite 系列）对指令的理解和服从度提升 300%**，极大限度消灭多语言翻车或乱用 HTML 的现象。
