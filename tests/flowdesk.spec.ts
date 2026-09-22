import {test,expect} from '@playwright/test';
test.describe.serial('FlowDesk 完整链路',()=>{
 test('Dashboard KPI 与最近流程进入编辑器',async({page})=>{await page.goto('/');await expect(page.getByTestId('kpi-grid')).toBeVisible();await expect(page.getByText('流程总数')).toBeVisible();await expect(page.getByText('异常实例',{exact:true}).first()).toBeVisible();await page.getByTestId('recent-workflow').first().click();await expect(page.getByTestId('flow-canvas')).toBeVisible();});
 test('审批配置、保存和双区域校验',async({page})=>{await page.goto('/workflows/wf-1');await page.getByTestId('canvas-node-approval').click();await expect(page.getByTestId('config-panel')).toContainText('审批配置');await page.getByLabel('审批人来源').selectOption({label:'固定角色'});await page.getByTestId('save-node-config').click();await page.getByRole('button',{name:'保存草稿'}).click();await page.getByTestId('validate-button').click();await expect(page.getByTestId('canvas-node-condition')).toHaveClass(/invalid/);await expect(page.getByTestId('issues-panel')).toContainText('条件分支规则未配置');const before=await page.getByTestId('error-count').textContent();expect(Number(before?.match(/\d+/)?.[0])).toBeGreaterThan(0);await page.getByTestId('canvas-node-condition').click();await page.getByLabel('条件字段').selectOption('amount');await page.getByLabel('条件比较值').fill('5000');await page.getByTestId('save-node-config').click();await page.getByTestId('validate-button').click();await expect(page.getByTestId('error-count')).toContainText('0 错误');});
 test('表单预览金额驱动条件分支',async({page})=>{await page.goto('/workflows/wf-1/preview');await expect(page.getByTestId('branch-result')).toContainText('标准分支');await page.getByLabel('申请金额').fill('12000');await expect(page.getByTestId('branch-result')).toContainText('高额分支');});
 test('发布后列表和总览同步',async({page})=>{await page.goto('/workflows/wf-2');await page.getByTestId('publish-button').click();await expect(page.getByRole('status')).toContainText('发布成功');await page.getByRole('link',{name:'流程管理'}).click();const row=page.getByTestId('workflow-row').filter({hasText:'采购合同审批'}).filter({hasNot:page.locator('.origin-link')});await expect(row).toContainText('已发布');await expect(row).toContainText('v3');await page.getByRole('link',{name:'总览'}).click();await expect(page.getByTestId('kpi-grid')).toBeVisible();});
 test('异常实例详情、时间线与当前节点高亮',async({page})=>{await page.goto('/monitor');await page.getByRole('button',{name:'异常',exact:true}).click();await page.getByTestId('instance-row').first().click();await expect(page.getByTestId('instance-detail')).toBeVisible();await expect(page.getByTestId('execution-timeline')).toContainText('提交申请');await expect(page.locator('.runtime-highlight')).toHaveCount(1);});
 test('版本比较并恢复历史版本',async({page})=>{await page.goto('/workflows/wf-2/versions');await expect(page.getByTestId('version-compare')).toContainText('新增节点');await page.getByTestId('restore-version').click();await expect(page).toHaveURL(/\/workflows\/wf-2$/);await expect(page.getByRole('status')).toContainText('已恢复');await expect(page.getByTestId('flow-canvas')).toBeVisible();});
});

test.describe('模板派生台',()=>{
 test('派生台选模板派生：编号重排、草稿 v0、无版本历史、映射可查',async({page})=>{
  await page.goto('/workflows');
  await expect(page.getByTestId('workflow-row').filter({hasText:'采购合同审批（华东区）'})).toContainText('采购合同审批');
  await page.getByTestId('open-derive-station').click();
  await expect(page.getByTestId('derive-station')).toBeVisible();
  await page.getByTestId('derive-template-list').getByText('员工入职流程').click();
  await page.getByTestId('derive-confirm').click();
  await expect(page.getByRole('status')).toContainText('草稿 v0');
  await page.getByTestId('derive-go-configure').click();
  await expect(page).toHaveURL(/\/workflows\/wf-/);
  await expect(page.locator('.draft-indicator')).toContainText('v0');
  await expect(page.getByTestId('canvas-node-n1')).toBeVisible();
  await expect(page.getByTestId('canvas-node-n7')).toBeVisible();
  await page.getByRole('button',{name:'版本历史'}).click();
  await expect(page.getByTestId('derivation-provenance')).toContainText('员工入职流程');
  await expect(page.getByTestId('source-version')).toHaveText('v3');
  await expect(page.getByText('暂无发布版本')).toBeVisible();
  await page.getByTestId('toggle-node-map').click();
  await expect(page.locator('.map-table')).toContainText('n1');
  await expect(page.locator('.map-table')).toContainText('start');
 });

 test('同一模板可重复派生且副本默认名带序号',async({page})=>{
  const row=()=>page.getByTestId('workflow-row').filter({has:page.locator('.origin-self')}).filter({hasText:'差旅费用审批'});
  await page.goto('/workflows');
  await row().getByTestId('derive-row').click();
  await page.getByTestId('derive-confirm').click();
  await page.getByTestId('derive-go-configure').click();
  const url1=page.url();
  await page.getByRole('link',{name:'流程管理'}).click();
  await row().getByTestId('derive-row').click();
  await expect(page.locator('input[aria-label="副本名称"]')).toHaveValue(/派生副本 2/);
  await page.getByTestId('derive-confirm').click();
  await page.getByTestId('derive-go-configure').click();
  expect(page.url()).not.toBe(url1);
 });

 test('列表显示派生次数并可按来源筛选',async({page})=>{
  await page.goto('/workflows');
  const wf2=page.getByTestId('workflow-row').filter({has:page.locator('.origin-self')}).filter({hasText:'采购合同审批'});
  await expect(wf2.getByTestId('derive-count')).toHaveText('1');
  const seedRow=page.getByTestId('workflow-row').filter({hasText:'采购合同审批（华东区）'});
  await expect(seedRow.getByTestId('origin-cell')).toContainText('采购合同审批');
  await page.getByTestId('origin-filter').selectOption({label:'全部派生副本'});
  await expect(page.getByTestId('workflow-row')).toHaveCount(1);
  await page.getByTestId('origin-filter').selectOption({label:'原始模板'});
  await expect(page.getByTestId('workflow-row').first()).toContainText('差旅费用审批');
 });

 test('归档源流程不破坏副本映射',async({page})=>{
  await page.goto('/workflows');
  const source=page.getByTestId('workflow-row').filter({has:page.locator('.origin-self')}).filter({hasText:'采购合同审批'});
  await source.getByTitle('归档').click();
  await expect(page.getByTestId('workflow-row').filter({hasText:'采购合同审批（华东区）'})).toContainText('源已归档');
  await page.getByTestId('workflow-row').filter({hasText:'采购合同审批（华东区）'}).locator('.name-cell').click();
  await page.getByRole('button',{name:'版本历史'}).click();
  await expect(page.getByTestId('derivation-provenance')).toContainText('采购合同审批');
  await expect(page.getByTestId('derivation-provenance')).toContainText('已归档');
  await expect(page.getByTestId('source-version')).toHaveText('v2');
  await page.getByTestId('toggle-node-map').click();
  await expect(page.locator('.map-table')).toContainText('n1');
 });

 test('由破损模板派生的副本发布时仍走现有校验被拦截',async({page})=>{
  await page.goto('/workflows');
  const broken=page.getByTestId('workflow-row').filter({has:page.locator('.origin-self')}).filter({hasText:'IT 服务请求'});
  await broken.getByTestId('derive-row').click();
  await page.getByTestId('derive-confirm').click();
  await page.getByTestId('derive-go-configure').click();
  await expect(page.locator('.draft-indicator')).toContainText('v0');
  await page.getByTestId('publish-button').click();
  await expect(page.getByTestId('error-count')).not.toContainText('0 错误');
  await expect(page.getByRole('status')).not.toContainText('发布成功');
 });
});

test('1440px 桌面视觉与控制台验证',async({page})=>{
 const errors:string[]=[]; page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 for(const path of ['/','/workflows/wf-1','/monitor']){await page.goto(path);await page.waitForTimeout(250);const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);expect(overflow,`${path} 不应横向溢出`).toBeFalsy()}
 await page.goto('/'); await page.screenshot({path:'test-results/dashboard-1440.png',fullPage:true});
 expect(errors,'浏览器 console 不应出现 error').toEqual([]);
});
