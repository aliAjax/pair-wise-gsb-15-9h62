import {test,expect} from '@playwright/test';
test.describe.serial('FlowDesk 完整链路',()=>{
 test('Dashboard KPI 与最近流程进入编辑器',async({page})=>{await page.goto('/');await expect(page.getByTestId('kpi-grid')).toBeVisible();await expect(page.getByText('流程总数')).toBeVisible();await expect(page.getByText('异常实例',{exact:true}).first()).toBeVisible();await page.getByTestId('recent-workflow').first().click();await expect(page.getByTestId('flow-canvas')).toBeVisible();});
 test('审批配置、保存和双区域校验',async({page})=>{await page.goto('/workflows/wf-1');await page.getByTestId('canvas-node-approval').click();await expect(page.getByTestId('config-panel')).toContainText('审批配置');await page.getByLabel('审批人来源').selectOption({label:'固定角色'});await page.getByTestId('save-node-config').click();await page.getByRole('button',{name:'保存草稿'}).click();await page.getByTestId('validate-button').click();await expect(page.getByTestId('canvas-node-condition')).toHaveClass(/invalid/);await expect(page.getByTestId('issues-panel')).toContainText('条件分支规则未配置');const before=await page.getByTestId('error-count').textContent();expect(Number(before?.match(/\d+/)?.[0])).toBeGreaterThan(0);await page.getByTestId('canvas-node-condition').click();await page.getByLabel('条件字段').selectOption('amount');await page.getByLabel('条件比较值').fill('5000');await page.getByTestId('save-node-config').click();await page.getByTestId('validate-button').click();await expect(page.getByTestId('error-count')).toContainText('0 错误');});
 test('表单预览金额驱动条件分支',async({page})=>{await page.goto('/workflows/wf-1/preview');await expect(page.getByTestId('branch-result')).toContainText('标准分支');await page.getByLabel('申请金额').fill('12000');await expect(page.getByTestId('branch-result')).toContainText('高额分支');});
 test('发布后列表和总览同步',async({page})=>{await page.goto('/workflows/wf-2');await page.getByTestId('publish-button').click();await expect(page.getByRole('status')).toContainText('发布成功');await page.getByRole('link',{name:'流程管理'}).click();const row=page.locator('tr[data-testid="workflow-row"]',{has:page.getByTestId('workflow-name').getByText('采购合同审批',{exact:true})});await expect(row).toContainText('已发布');await expect(row).toContainText('v3');await page.getByRole('link',{name:'总览'}).click();await expect(page.getByTestId('kpi-grid')).toBeVisible();});
 test('异常实例详情、时间线与当前节点高亮',async({page})=>{await page.goto('/monitor');await page.getByRole('button',{name:'异常',exact:true}).click();await page.getByTestId('instance-row').first().click();await expect(page.getByTestId('instance-detail')).toBeVisible();await expect(page.getByTestId('execution-timeline')).toContainText('提交申请');await expect(page.locator('.runtime-highlight')).toHaveCount(1);});
 test('版本比较并恢复历史版本',async({page})=>{await page.goto('/workflows/wf-2/versions');await expect(page.getByTestId('version-compare')).toContainText('新增节点');await page.getByTestId('restore-version').click();await expect(page).toHaveURL(/\/workflows\/wf-2$/);await expect(page.getByRole('status')).toContainText('已恢复');await expect(page.getByTestId('flow-canvas')).toBeVisible();});
 test('模板派生台：编号重排、溯源、来源筛选、归档不破坏映射',async({page})=>{
  // 源模板 wf-2 当前为已发布 v2，先发布一次升到 v3；种子副本仍派生自旧版 v2
  await page.goto('/workflows/wf-2');
  await page.getByTestId('publish-button').click();
  await expect(page.getByRole('status')).toContainText('发布成功');
  await expect(page.getByRole('status')).toBeHidden();
  await page.getByRole('link',{name:'流程管理'}).click();
  const srcRow=()=>page.locator('tr[data-testid="workflow-row"]',{has:page.getByTestId('workflow-name').getByText('采购合同审批',{exact:true})});
  await expect(srcRow().getByTestId('derive-count')).toContainText('2');
  // 再派生一份，跳转到副本编辑器
  await srcRow().getByTestId('derive-button').click();
  await expect(page).toHaveURL(/\/workflows\/wf-(?!2\b)/);
  await expect(page.getByRole('status')).toContainText('草稿 v0');
  // 副本从草稿 v0 开始；节点/连线编号已重排，旧编号不存在
  await expect(page.locator('.draft-indicator')).toContainText('草稿 · v0');
  await expect(page.getByTestId('canvas-node-approval')).toHaveCount(0);
  await expect(page.locator('.react-flow__node').first()).toHaveAttribute('data-id',/^node-/);
  // 版本页：派生来源、原始版本、节点映射
  await page.getByRole('button',{name:'版本历史'}).click();
  await expect(page.getByTestId('lineage-panel')).toContainText('派生溯源');
  await expect(page.getByTestId('lineage-origin-version')).toContainText('原始版本 v3');
  await expect(page.getByTestId('lineage-origin-version')).toContainText('发布于 2026-07-11');
  await expect(page.getByTestId('lineage-panel')).toContainText('采购合同审批');
  await expect(page.getByTestId('lineage-panel')).toContainText('approval');
  await expect(page.getByTestId('lineage-panel')).toContainText('直属主管审批');
  // 无版本历史：不携带源版本记录
  await expect(page.locator('.version-empty')).toContainText('草稿 v0');
  // 溯源跳转到源版本页，源展示派生次数（含本次第三份）
  await page.locator('.lineage-node.src').click();
  await expect(page).toHaveURL(/\/workflows\/wf-2\/versions$/);
  await expect(page.getByTestId('lineage-count')).toContainText('3');
  // 来源筛选：仅看派生副本 / 按来源模板
  await page.getByRole('link',{name:'流程管理'}).click();
  await page.getByTestId('origin-filter').selectOption('derived');
  await expect(page.getByTestId('workflow-row')).toHaveCount(4);
  await page.getByTestId('origin-filter').selectOption('wf-2');
  await expect(page.getByTestId('workflow-row')).toHaveCount(3);
  await expect(page.getByTestId('origin-hint')).toContainText('采购合同审批');
  // 归档源流程（SPA 内导航，保留内存中的新副本）
  await page.getByTestId('origin-filter').selectOption('all');
  await srcRow().getByRole('button',{name:'归档'}).click();
  // 源已归档，但按来源筛选仍能找到全部副本，映射不被破坏
  await page.getByTestId('origin-filter').selectOption('wf-2');
  await expect(page.getByTestId('workflow-row')).toHaveCount(3);
  await expect(page.getByTestId('origin-hint')).toContainText('归档不影响');
  // 打开刚派生的新副本版本页（SPA 内点击派生徽标 → 源；这里直接点副本行进编辑器再进版本页）
  const copyRow=page.locator('tr[data-testid="workflow-row"]',{has:page.locator('.derived-badge')}).first();
  await copyRow.getByTestId('workflow-name').click();
  await page.getByRole('button',{name:'版本历史'}).click();
  await expect(page.getByTestId('lineage-origin-version')).toContainText('原始版本 v3');
  await expect(page.locator('.lineage-node.src')).toContainText('已归档');
  // 早期种子副本（wf-101）派生自旧版 v2：整页加载后映射同样完整可追溯
  await page.goto('/workflows/wf-101/versions');
  await expect(page.getByTestId('lineage-origin-version')).toContainText('原始版本 v2');
  await expect(page.getByTestId('lineage-panel')).toContainText('直属主管审批');
  await expect(page.getByTestId('lineage-panel')).toContainText('node-');
 });
 test('派生副本走现有校验，修复后可发布为 v1',async({page})=>{
  // wf-103 派生自已归档的 wf-6（有效模板），发布校验链路与普通流程一致
  await page.goto('/workflows/wf-103');
  await page.getByTestId('validate-button').click();
  await expect(page.getByTestId('issues-panel')).toContainText('0 错误');
  await page.getByTestId('publish-button').click();
  await expect(page.getByRole('status')).toContainText('发布成功');
  await expect(page.locator('.draft-indicator')).toContainText('已发布 · v1');
  // 发布产生副本自己的版本记录，不回写源
  await page.getByRole('button',{name:'版本历史'}).click();
  await expect(page.getByTestId('lineage-panel')).toContainText('原始版本 v3');
  await expect(page.locator('.version-list')).toContainText('v1');
 });
});

test('1440px 桌面视觉与控制台验证',async({page})=>{
 const errors:string[]=[]; page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 for(const path of ['/','/workflows/wf-1','/monitor']){await page.goto(path);await page.waitForTimeout(250);const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);expect(overflow,`${path} 不应横向溢出`).toBeFalsy()}
 await page.goto('/'); await page.screenshot({path:'test-results/dashboard-1440.png',fullPage:true});
 expect(errors,'浏览器 console 不应出现 error').toEqual([]);
});
