# 场景导航修复 - Development Plan

## 概述
修复场景导航跳转时 URL 查询参数丢失的问题。根本原因在于 wouter 的 `useLocation` 只返回 pathname，不包含查询字符串。通过使用 `useSearch` hook 和 `setLocation` 实现正确的 SPA 导航和参数传递。

## Task Breakdown

### Task 1: 更新 Prompts.tsx 使用 useSearch
- **ID**: task-1
- **type**: quick-fix
- **Description**: 替换 Prompts.tsx 中的查询参数解析逻辑，使用 wouter 的 `useSearch` hook 替代手动解析 `location.split('?')`
- **File Scope**: client/src/pages/Prompts.tsx
- **Dependencies**: None
- **Test Command**: pnpm check && pnpm test --run --grep "Prompts.*query.*param"
- **Test Focus**:
  - 验证 `useSearch` hook 正确导入和使用
  - 测试 scenario 参数正确解析（有效数字、无效数字、空值、特殊字符）
  - 验证参数变化时筛选状态正确更新（一级、二级、三级分类）
  - 确保无参数时重置筛选状态

### Task 2: 更新 ScenarioBrowser.tsx 使用 useSearch 和 setLocation
- **ID**: task-2
- **type**: ui
- **Description**: 替换 ScenarioBrowser.tsx 中的查询参数解析逻辑和导航方式，使用 `useSearch` 读取 highlight 参数，使用 `setLocation` 替代 `window.location.href` 实现 SPA 导航
- **File Scope**: client/src/pages/ScenarioBrowser.tsx
- **Dependencies**: depends on task-1
- **Test Command**: pnpm check && pnpm test --run --grep "ScenarioBrowser.*navigation"
- **Test Focus**:
  - 验证 `useSearch` hook 正确导入和使用
  - 测试 highlight 参数正确解析和高亮显示
  - 验证导航到提示词库时使用 `setLocation('/prompts?scenario=...')` 而非 `window.location.href`
  - 测试跳转后查询参数正确保留，且不触发页面刷新（SPA 导航）
  - 验证导航后 Prompts 页面正确接收参数并触发筛选

### Task 3: 审计并统一其他页面的查询参数处理
- **ID**: task-3
- **type**: default
- **Description**: 搜索项目中其他使用 `location.split('?')` 的页面，统一迁移到 `useSearch` hook，确保代码一致性
- **File Scope**: client/src/pages/*.tsx, client/src/components/**/*.tsx
- **Dependencies**: None
- **Test Command**: pnpm check && pnpm test --run
- **Test Focus**:
  - 使用 grep 搜索 `location.split('?')` 定位所有相关文件
  - 验证每个文件的查询参数解析逻辑是否需要迁移
  - 测试迁移后的页面功能正常，查询参数正确解析
  - 确保整体测试覆盖率不下降

## Acceptance Criteria
- [ ] Prompts.tsx 使用 `useSearch` 正确解析 scenario 参数，筛选功能正常
- [ ] ScenarioBrowser.tsx 使用 `useSearch` 解析 highlight 参数，使用 `setLocation` 实现 SPA 导航
- [ ] 从场景导航跳转到提示词库时，URL 查询参数正确传递且不触发页面刷新
- [ ] 提示词库页面接收 scenario 参数后正确触发分类筛选和 UI 高亮
- [ ] 所有使用 `location.split('?')` 的页面已迁移到 `useSearch` hook
- [ ] All unit tests pass
- [ ] Code coverage ≥90%

## Technical Notes
- **问题根源**: wouter 的 `useLocation` 只返回 pathname，不包含查询字符串（如 `?scenario=123`）
- **解决方案**: 使用 wouter 提供的 `useSearch` hook 获取查询参数，使用 `setLocation` 实现 SPA 导航
- **wouter API 说明**:
  - `useSearch()`: 返回当前 URL 的查询字符串（如 `?scenario=123`），可配合 `URLSearchParams` 解析
  - `setLocation(path)`: 导航到新路径，支持查询参数（如 `/prompts?scenario=123`），不触发页面刷新
- **向后兼容性**: 该修复仅改变内部实现，不影响 API 和 UI 行为
- **性能优化**: 避免使用 `window.location.href` 造成的整页刷新，提升用户体验
- **测试策略**: 重点测试边界情况（无参数、无效参数、特殊字符、多级分类嵌套）
