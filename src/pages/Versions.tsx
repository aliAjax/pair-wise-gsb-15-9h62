import {useMemo,useState} from 'react';import {useNavigate,useParams} from 'react-router-dom';import {ArrowLeft,CopyPlus,GitCompare,GitFork,History,RotateCcw} from 'lucide-react';import {PageTitle,Status} from '../components/common';import {useAppStore} from '../store/useAppStore';import {derivationCount} from '../lib/derivation';
export function Versions(){
 const {id}=useParams(),nav=useNavigate(),store=useAppStore();
 const w=store.workflows.find(x=>x.id===id)||store.workflows[0];
 const all=[...w.versions].sort((a,b)=>b.version-a.version);
 const [left,setLeft]=useState(all.at(-1)?.version||0),[right,setRight]=useState(all[0]?.version||w.version),[showMap,setShowMap]=useState(false);
 const source=w.derivedFrom?store.workflows.find(x=>x.id===w.derivedFrom!.sourceWorkflowId):null;
 const copies=store.workflows.filter(x=>x.derivedFrom?.sourceWorkflowId===w.id);
 const a=all.find(v=>v.version===left),b=all.find(v=>v.version===right);
 const diff=useMemo(()=>{if(!a||!b)return {added:[],removed:[],changed:[]};return {added:b.nodes.filter(n=>!a.nodes.some(x=>x.id===n.id)),removed:a.nodes.filter(n=>!b.nodes.some(x=>x.id===n.id)),changed:b.nodes.filter(n=>{const old=a.nodes.find(x=>x.id===n.id);return old&&JSON.stringify(old.data.config)!==JSON.stringify(n.data.config)})}},[a,b]);
 const restore=()=>{store.setCurrent(w.id);store.restore(left);nav(`/workflows/${w.id}`)};
 const mapRows=()=>{const t=w.derivedFrom;if(!t||!source)return [];return Object.entries(t.nodeMap).map(([newId,oldId])=>({newId,oldId,label:source.nodes.find(n=>n.id===oldId)?.data.label||oldId}))};
 return <div className="page versions-page">
  <button className="back-link" onClick={()=>nav(`/workflows/${id}`)}><ArrowLeft/>返回编辑器</button>
  <PageTitle eyebrow="流程版本" title="Version History" desc={`${w.name} · 查看发布记录、比较结构差异或恢复历史版本。`}/>

  {w.derivedFrom&&<section className="panel provenance" data-testid="derivation-provenance">
   <div className="provenance-head"><GitFork/><h3>派生溯源</h3><Status value={w.status}/></div>
   <div className="provenance-body">
    <article><small>派生来源</small><button className="origin-link" onClick={()=>source&&nav(`/workflows/${source.id}/versions`)}>{w.derivedFrom.sourceWorkflowName}</button>{source&&<em><Status value={source.status}/></em>}</article>
    <article><small>原始版本</small><b data-testid="source-version">v{w.derivedFrom.sourceVersion}</b></article>
    <article><small>派生时间</small><b>{w.derivedFrom.derivedAt}</b></article>
    <article><small>当前副本版本</small><b>v{w.version}{w.version===0&&'（草稿，尚未发布）'}</b></article>
   </div>
   <div className="provenance-map">
    <button className="text" data-testid="toggle-node-map" onClick={()=>setShowMap(v=>!v)}>{showMap?'收起编号映射':'查看节点编号映射'}（{Object.keys(w.derivedFrom.nodeMap).length} 个节点 / {Object.keys(w.derivedFrom.edgeMap).length} 条连线）</button>
    {showMap&&<table className="map-table"><thead><tr><th>副本节点编号</th><th>源节点编号</th><th>节点名称</th></tr></thead><tbody>{mapRows().map(r=><tr key={r.newId}><td>{r.newId}</td><td>{r.oldId}</td><td>{r.label}</td></tr>)}</tbody></table>}
    <p className="map-note">源流程{source?.status==='archived'?'即使已归档，':'，'}映射记录仍随副本保留；副本发布走独立校验，不继承源版本历史。</p>
   </div>
  </section>}

  {copies.length>0&&<section className="panel derivations" data-testid="derivation-list">
   <div className="provenance-head"><CopyPlus/><h3>由该模板派生的副本 · {derivationCount(store.workflows,w.id)}</h3></div>
   <div className="derivation-grid">{copies.map(c=><button key={c.id} className="derivation-card" onClick={()=>nav(`/workflows/${c.id}/versions`)}>
    <b>{c.name}</b><Status value={c.status}/><small>派生于 {c.derivedFrom?.derivedAt} · 源版本 v{c.derivedFrom?.sourceVersion} · 当前 v{c.version}</small>
   </button>)}</div>
  </section>}

  {all.length===0?<section className="panel compare"><div className="empty"><History/><b>暂无发布版本</b><p>该副本从草稿 v0 开始，未复制模板的版本历史。首次发布后将在这里形成版本记录。</p></div></section>:
  <div className="version-layout"><aside className="panel version-list"><h3><History/>版本记录</h3>{all.map((v,i)=><button key={v.version} className={v.version===right?'active':''} onClick={()=>setRight(v.version)}><span><b>v{v.version}</b>{i===0&&<em>当前</em>}</span><small>{v.createdAt}</small><p>{v.note}</p></button>)}</aside><section className="panel compare" data-testid="version-compare"><div className="compare-head"><div><GitCompare/><h2>版本对比</h2></div><button className="secondary" data-testid="restore-version" onClick={restore}><RotateCcw/>恢复 v{left} 为草稿</button></div><div className="compare-select"><label>基准版本<select value={left} onChange={e=>setLeft(Number(e.target.value))}>{all.map(v=><option key={v.version} value={v.version}>v{v.version} · {v.createdAt}</option>)}</select></label><span>→</span><label>比较版本<select value={right} onChange={e=>setRight(Number(e.target.value))}>{all.map(v=><option key={v.version} value={v.version}>v{v.version} · {v.createdAt}</option>)}</select></label></div><div className="diff-summary"><article><small>新增节点</small><b>{diff.added.length}</b></article><article><small>删除节点</small><b>{diff.removed.length}</b></article><article><small>配置变化</small><b>{diff.changed.length}</b></article><article><small>连线变化</small><b>{Math.abs((b?.edges.length||0)-(a?.edges.length||0))}</b></article></div><div className="diff-list"><h3>变更明细</h3>{diff.added.map(n=><div key={n.id} className="diff added"><span>＋ 新增</span><b>{n.data.label}</b><small>{n.type} 节点</small></div>)}{diff.removed.map(n=><div key={n.id} className="diff removed"><span>− 删除</span><b>{n.data.label}</b><small>{n.type} 节点</small></div>)}{diff.changed.map(n=><div key={n.id} className="diff changed"><span>~ 配置</span><b>{n.data.label}</b><small>节点配置已更新</small></div>)}{!diff.added.length&&!diff.removed.length&&!diff.changed.length&&<div className="empty-diff">这两个版本的节点结构一致</div>}<div className="release-note"><small>发布说明</small><p>{b?.note}</p></div></div></section></div>}
 </div>}
