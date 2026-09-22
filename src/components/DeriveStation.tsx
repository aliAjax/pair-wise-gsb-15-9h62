import {useMemo,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {ArrowRight,CheckCircle2,CopyPlus,Layers,Search,X} from 'lucide-react';
import {Status} from './common';
import {useAppStore} from '../store/useAppStore';
import {defaultDerivedName,derivationCount} from '../lib/derivation';
import type {Workflow} from '../types';

/**
 * 模板派生台：
 * - 不传 sourceId 时为“派生台”模式，可在全部模板中选择来源；
 * - 传入 sourceId 时为行内派生，预选来源流程；
 * - 派生动作走 store.derive（内部调用纯函数派生规则），完成后可直接进入副本配置。
 */
export function DeriveStation({sourceId,stationMode,onClose}:{sourceId?:string|null;stationMode:boolean;onClose:()=>void}){
 const nav=useNavigate();
 const workflows=useAppStore(s=>s.workflows);
 const derive=useAppStore(s=>s.derive);
 const [query,setQuery]=useState('');
 const initialSource=stationMode?null:(sourceId||null);
 const [pickedId,setPickedId]=useState<string|null>(initialSource);
 const initialPicked=workflows.find(w=>w.id===initialSource);
 const [name,setName]=useState(initialPicked?defaultDerivedName(initialPicked.name,derivationCount(workflows,initialPicked.id)):'');
 const [newId,setNewId]=useState<string|null>(null);

 const templates=useMemo(()=>workflows
  .filter(w=>!w.derivedFrom)
  .filter(w=>w.name.toLowerCase().includes(query.toLowerCase()))
  .sort((a,b)=>derivationCount(workflows,b.id)-derivationCount(workflows,a.id)||b.updatedAt.localeCompare(a.updatedAt)),
 [workflows,query]);

 const picked=workflows.find(w=>w.id===(pickedId||''));
 const done=workflows.find(w=>w.id===newId)||null;
 const counts=(w:Workflow)=>derivationCount(workflows,w.id);

 const reset=()=>{setPickedId(sourceId||null);setName('');setNewId(null);setQuery('')};
 const close=()=>{reset();onClose()};
 const pick=(w:Workflow)=>{setPickedId(w.id);setName(defaultDerivedName(w.name,counts(w)))};
 const confirm=()=>{if(!picked)return;const id=derive(picked.id,name.trim()||undefined);setNewId(id)};
 const goConfigure=()=>{if(!done)return;useAppStore.getState().setCurrent(done.id);nav('/workflows/'+done.id);close()};

 return <div className="modal-backdrop" onClick={close} data-testid="derive-station">
  <div className="modal derive-modal" onClick={e=>e.stopPropagation()}>
   <div className="modal-head">
    <div><Layers/><h2>模板派生台</h2></div>
    <button className="icon-btn" data-testid="derive-close" onClick={close}><X/></button>
   </div>

   {done?<>
    <div className="derive-done">
     <CheckCircle2/><h3>派生完成</h3>
     <p>副本 <b>{done.name}</b> 已创建，从草稿 v0 开始，未携带模板的版本历史。</p>
    </div>
    <div className="panel derive-provenance">
     <small>派生来源</small>
     <b>{done.derivedFrom?.sourceWorkflowName}</b>
     <span>原始版本 v{done.derivedFrom?.sourceVersion} · 派生于 {done.derivedFrom?.derivedAt}</span>
    </div>
    <div className="derive-rule-summary">
     <span>{done.nodes.length} 个节点重排为 n1–n{done.nodes.length}</span>
     <span>{done.edges.length} 条连线重排为 e1–e{done.edges.length}</span>
     <span>节点映射 {Object.keys(done.derivedFrom?.nodeMap||{}).length} 条已记录</span>
    </div>
    <div className="modal-actions">
     <button className="secondary" onClick={()=>{if(done.derivedFrom){const src=workflows.find(w=>w.id===done.derivedFrom!.sourceWorkflowId);if(src)setName(defaultDerivedName(src.name,counts(src)))}setNewId(null)}}><CopyPlus/>再派生一份</button>
     <span className="spacer"/>
     <button data-testid="derive-go-configure" onClick={goConfigure}>进入副本配置 <ArrowRight/></button>
    </div>
   </>:<>
    {stationMode&&!picked?<>
     <div className="search derive-search"><Search/><input aria-label="搜索模板" value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索可作为模板的流程"/></div>
     <div className="derive-list" data-testid="derive-template-list">
      {templates.map(w=><button key={w.id} className="derive-template" onClick={()=>pick(w)}>
        <span className="flow-icon">⌘</span>
        <span className="grow"><b>{w.name}</b><small>{w.domain} · v{w.version} · 更新于 {w.updatedAt}</small></span>
        <Status value={w.status}/>
        <em className="derive-count">{counts(w)} 次派生</em>
        <ArrowRight/>
       </button>)}
      {!templates.length&&<div className="empty"><b>没有可派生的模板</b><p>换个关键词试试</p></div>}
     </div>
    </>:<>
     {picked&&<>
      <div className="derive-source panel">
       <small>派生来源模板</small>
       <div><b>{picked.name}</b><Status value={picked.status}/></div>
       <span>{picked.domain} · 当前 v{picked.version} · 已被派生 {counts(picked)} 次</span>
       {stationMode&&<button className="text" onClick={()=>setPickedId(null)}>重新选择模板</button>}
      </div>
      <label className="derive-name-field">副本名称
       <input aria-label="副本名称" value={name} onChange={e=>setName(e.target.value)} placeholder={defaultDerivedName(picked.name,counts(picked))}/>
      </label>
      <ul className="derive-rules">
       <li>节点、连线将整体复制并重新编号（n1、e1 起始），源节点映射完整保留</li>
       <li>副本状态为草稿、版本从 v0 开始，不复制模板的历史版本</li>
       <li>同一模板可派生多份副本，后续配置互不影响</li>
       <li>模板日后归档不会破坏副本的溯源映射，副本发布仍走现有校验</li>
      </ul>
      <div className="modal-actions">
       <button className="secondary" onClick={close}>取消</button>
       <span className="spacer"/>
       <button data-testid="derive-confirm" onClick={confirm}><CopyPlus/>确认派生</button>
      </div>
     </>}
    </>}
   </>}
  </div>
 </div>;
}
