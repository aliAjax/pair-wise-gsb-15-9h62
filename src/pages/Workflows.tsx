import {useMemo,useState} from 'react'; import {useNavigate} from 'react-router-dom'; import {Archive,CopyPlus,Layers,Plus,Search,SlidersHorizontal} from 'lucide-react'; import {Empty,PageTitle,Status} from '../components/common';import {DeriveStation} from '../components/DeriveStation';import {useAppStore} from '../store/useAppStore';
export function Workflows(){
 const nav=useNavigate(),ws=useAppStore(s=>s.workflows),set=useAppStore(s=>s.setCurrent),create=useAppStore(s=>s.create),archive=useAppStore(s=>s.archive);
 const [q,setQ]=useState(''),[status,setStatus]=useState('all'),[domain,setDomain]=useState('all'),[origin,setOrigin]=useState('all'),[originId,setOriginId]=useState('all'),[sort,setSort]=useState('updated');
 const [stationOpen,setStationOpen]=useState(false),[deriveSource,setDeriveSource]=useState<string|null>(null);
 const countOf=(id:string)=>ws.filter(w=>w.derivedFrom?.sourceWorkflowId===id).length;
 const sources=ws.filter(w=>!w.derivedFrom).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
 const rows=useMemo(()=>ws.filter(w=>(w.name.toLowerCase().includes(q.toLowerCase()))&&(status==='all'||w.status===status)&&(domain==='all'||w.domain===domain)&&(origin==='all'||(origin==='derived'?!!w.derivedFrom:!w.derivedFrom))&&(originId==='all'||w.derivedFrom?.sourceWorkflowId===originId)).sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):b.updatedAt.localeCompare(a.updatedAt)),[ws,q,status,domain,origin,originId,sort]);
 const openFlow=(id:string)=>{set(id);nav('/workflows/'+id)};
 const openDerive=(id:string)=>setDeriveSource(id);
 return <div className="page">
  <PageTitle eyebrow="流程管理" title="Workflows" desc="从模板可追溯地派生子流程：编号重排、映射留痕、版本从草稿 v0 独立开始。" actions={<><button className="secondary" data-testid="open-derive-station" onClick={()=>setStationOpen(true)}><Layers/>模板派生台</button><button onClick={()=>{const id=create();nav('/workflows/'+id)}}><Plus/>新建流程</button></>}/>
  <div className="toolbar panel">
   <div className="search"><Search/><input aria-label="搜索流程" value={q} onChange={e=>setQ(e.target.value)} placeholder="搜索流程名称"/></div>
   <select aria-label="状态筛选" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">全部状态</option><option value="published">已发布</option><option value="draft">草稿</option><option value="archived">已归档</option></select>
   <select aria-label="业务域筛选" value={domain} onChange={e=>setDomain(e.target.value)}><option value="all">全部业务域</option>{['财务','采购','人力资源','IT服务','法务'].map(x=><option key={x}>{x}</option>)}</select>
   <select aria-label="来源筛选" data-testid="origin-filter" value={origin+':'+originId} onChange={e=>{if(e.target.value==='all'){setOrigin('all');setOriginId('all')}else if(e.target.value==='derived'){setOrigin('derived');setOriginId('all')}else if(e.target.value==='original'){setOrigin('original');setOriginId('all')}else{setOrigin('derived');setOriginId(e.target.value)}}}>
    <option value="all">全部来源</option><option value="original">原始模板</option><option value="derived">全部派生副本</option>
    {sources.length>0&&<optgroup label="按来源模板筛选">{sources.map(w=><option key={w.id} value={w.id}>来自：{w.name}</option>)}</optgroup>}
   </select>
   <span className="spacer"/><SlidersHorizontal/>
   <select aria-label="排序" value={sort} onChange={e=>setSort(e.target.value)}><option value="updated">最近更新</option><option value="name">名称排序</option></select>
  </div>
  <section className="panel workflow-table">{rows.length?<table><thead><tr><th>流程名称</th><th>业务域</th><th>状态</th><th>版本</th><th>派生次数</th><th>来源</th><th>最近编辑人</th><th>更新时间</th><th>异常实例</th><th></th></tr></thead><tbody>{rows.map(w=>{const src=w.derivedFrom?ws.find(x=>x.id===w.derivedFrom!.sourceWorkflowId):null;return <tr key={w.id} data-testid="workflow-row"><td onClick={()=>openFlow(w.id)}><div className="name-cell"><span>⌘</span><b>{w.name}</b></div></td><td>{w.domain}</td><td><Status value={w.status}/></td><td>v{w.version}</td><td data-testid="derive-count"><span className={'count-badge '+(countOf(w.id)?'active':'')}>{countOf(w.id)}</span></td><td>{w.derivedFrom?<button className="origin-link" data-testid="origin-cell" title={'源版本 v'+w.derivedFrom.sourceVersion} onClick={()=>src&&openFlow(src.id)}>{w.derivedFrom.sourceWorkflowName}{src?.status==='archived'&&<em>（源已归档）</em>}</button>:<span className="origin-self">—</span>}</td><td>{w.editor}</td><td>{w.updatedAt}</td><td className={w.abnormalCount?'danger-text':''}>{w.abnormalCount}</td><td><button title="派生" className="icon-btn" data-testid="derive-row" onClick={()=>openDerive(w.id)}><CopyPlus/></button><button title="归档" className="icon-btn" onClick={()=>archive(w.id)}><Archive/></button></td></tr>})}</tbody></table>:<Empty title="没有找到流程" text="试试调整来源或状态筛选，或从模板派生台新建副本。"/>}</section>
  {(stationOpen||deriveSource!==null)&&<DeriveStation stationMode={stationOpen} sourceId={stationOpen?null:deriveSource} onClose={()=>{setStationOpen(false);setDeriveSource(null)}}/>}
 </div>}
