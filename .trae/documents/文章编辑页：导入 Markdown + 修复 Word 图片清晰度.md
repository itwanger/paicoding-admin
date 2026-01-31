## 目标
- 在 `#/article/edit/index` 增加“导入Markdown”功能：读取本地 `.md/.markdown/.txt` 内容并写入编辑器。
- 导入时不上传图片；图片仍走现有“转链”按钮统一处理外链图片。
- 针对“语雀导出的 Markdown”做净化：去掉 `<font ...>`、空 font、注释、以及图片 URL 周围的干扰字符（如反引号/多余空格）。

## 方案：导入 Markdown（不触发上传）
1. **新增工具栏按钮**
   - 在 [search/index.tsx](file:///Users/itwanger/Documents/GitHub/paicoding-admin/src/views/article/edit/search/index.tsx) 增加“导入Markdown”按钮。
   - 扩展 props：新增 `handleImportMarkdown`。

2. **实现 `handleImportMarkdown`（核心逻辑）**
   - 在 [index.tsx](file:///Users/itwanger/Documents/GitHub/paicoding-admin/src/views/article/edit/index.tsx) 新增 `handleImportMarkdown`：
     - 用隐藏 `input[type=file]` 选择文件，accept：`.md,.markdown,.txt,text/markdown,text/plain`。
     - `file.text()` 读取原文（去 BOM、统一换行）。
     - 调用 `sanitizeYuqueMarkdown(raw)` 做净化（见下）。
     - 若编辑器已有内容：弹 Modal 让用户选“替换/追加/取消”（复用 Word 导入的交互风格）。
     - 标题同步：若净化后的 Markdown 首个非空行匹配 `# 标题`，提取为 `shortTitle` 并从正文移除该行。
     - 写入编辑器：
       - 替换：`setContent(md)` + `handleChange({content: md, shortTitle?})`
       - 追加：`content + '\n\n---\n\n' + md`
   - 明确不做任何图片上传/转链；用户需要时再点击现有“转链”。

## 语雀 Markdown 净化规则（sanitizeYuqueMarkdown）
- **清理 font 包装**：移除所有 `<font ...>` 与 `</font>` 标签，但保留其中的文本内容。
- **移除无意义的空 font 段落**：例如仅包含空白/换行的 font 标签残留。
- **移除 HTML 注释块**：`<!-- ... -->`（支持多行）。
- **修复图片 URL 干扰格式**：将语雀导出常见写法
  - `![]( `https://...png` )` / `![](`https://...`)` / `![alt]( `url` )`
  - 统一规范成 `![](https://...)` 或 `![alt](https://...)`（去反引号、去括号内多余空格）。
- **基础规范化**：`
` → `\n`、去零宽字符、连续 3+ 空行压缩为 2 行。

## 影响范围
- 不改“转链”逻辑：仍由 [index.tsx](file:///Users/itwanger/Documents/GitHub/paicoding-admin/src/views/article/edit/index.tsx) 现有 `handleReplaceImgUrl` 统一处理外链图片。
- 不改 Word 导入图片清晰度方案（按你要求先不处理）。

## 涉及文件
- [src/views/article/edit/index.tsx](file:///Users/itwanger/Documents/GitHub/paicoding-admin/src/views/article/edit/index.tsx)
- [src/views/article/edit/search/index.tsx](file:///Users/itwanger/Documents/GitHub/paicoding-admin/src/views/article/edit/search/index.tsx)

## 验证方式
- 进入 `http://127.0.0.1:3301/#/article/edit/index`：
  - 导入语雀导出的 `.md`：确认 font/注释被移除、图片语法变为标准 `![](...)`。
  - 点击“转链”：确认外链图片正常上传替换，且不会重复上传（沿用现有 30 秒缓存策略）。
  - 回归：保存/更新、图片缩放与替换、其它表单项不受影响。