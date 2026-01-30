## 实施计划：集成 react-moveable 实现图片缩放

### 1. 安装依赖
- 安装 `react-moveable` 库，用于提供图片的拖拽和缩放功能。

### 2. 修改文章编辑页面 ([index.tsx](file:///Users/itwanger/Documents/GitHub/paicoding-admin/src/views/article/edit/index.tsx))
- **引入 Moveable**：导入 `Moveable` 组件。
- **状态管理**：
  - `target`: 存储当前选中的图片元素。
  - `moveableRef`: 引用 Moveable 实例。
- **自定义 ByteMD 插件 (`imageMoveablePlugin`)**：
  - 在预览区域渲染完成后，为所有 `img` 标签绑定点击事件。
  - 点击图片时将其设为 `target`；点击非图片区域时清除 `target`。
- **集成 Moveable 组件**：
  - 在编辑器预览区域渲染 `Moveable`。
  - 配置 `resizable`, `keepRatio`, `snappable` 等属性。
- **实现缩放同步**：
  - 在 `onResize` 事件中实时更新图片的 DOM 样式。
  - 在 `onResizeEnd` 事件中，将缩放后的尺寸同步回 Markdown 源码中，通过将 `![alt](url)` 转换为 `<img src="url" width="xxx" height="xxx" />` 来实现持久化。

### 3. 样式优化
- 调整 Moveable 控制柄的样式，确保在编辑器内清晰可见且不遮挡操作。

### 4. 验证与测试
- 在编辑页面插入图片，尝试通过 Moveable 进行缩放。
- 确认缩放后的尺寸在保存并重新加载后依然有效。
