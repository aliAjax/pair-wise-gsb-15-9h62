import type {DerivedEdgeMapping, DerivedFrom, DerivedNodeMapping, FlowEdge, FlowNode, Workflow} from '../types';

const clone=<T,>(x:T):T=>JSON.parse(JSON.stringify(x));

/** 是否为派生副本 */
export const isDerived=(w:Workflow):boolean=>Boolean(w.derivedFrom);

/** 取一个流程的全部派生副本（按派生时间倒序） */
export const derivationsOf=(workflows:Workflow[], sourceId:string):Workflow[]=>
  workflows.filter(w=>w.derivedFrom?.workflowId===sourceId)
    .sort((a,b)=>b.derivedFrom!.derivedAt.localeCompare(a.derivedFrom!.derivedAt));

/** 模板被派生次数（源流程归档不影响计数） */
export const derivationCount=(workflows:Workflow[], sourceId:string):number=>
  workflows.reduce((n,w)=>n+(w.derivedFrom?.workflowId===sourceId?1:0),0);

/**
 * 第 n 次派生的副本命名：首次“（副本）”，其后“（副本 2）”……
 * 同名不影响功能，仅为了在列表中区分同一模板的多份派生。
 */
export const copyName=(sourceName:string, occurrence:number):string=>
  sourceName+'（副本'+(occurrence>1?' '+occurrence:'')+'）';

let seq=0;
const uid=(prefix:string):string=>`${prefix}-${Date.now().toString(36)}-${(seq++).toString(36)}${Math.random().toString(36).slice(2,6)}`;

/** 重新编排节点编号：源节点 id -> 副本节点 id（node-1, node-2 …） */
function renumberNodes(nodes:FlowNode[], salt:string):{nodes:FlowNode[];nodeMap:DerivedNodeMapping[];idBySource:Map<string,string>}{
  const idBySource=new Map<string,string>();
  const nodeMap:DerivedNodeMapping[]=[];
  const out=nodes.map((n,i)=>{
    const newId=`node-${salt}-${i+1}`;
    idBySource.set(n.id,newId);
    nodeMap.push({sourceNodeId:n.id,newNodeId:newId,label:n.data.label,type:n.type});
    return {...clone(n),id:newId,data:clone(n.data)};
  });
  return {nodes:out,nodeMap,idBySource};
}

/** 重新编排连线编号并按节点映射重写端点 */
function renumberEdges(edges:FlowEdge[], salt:string, idBySource:Map<string,string>):{edges:FlowEdge[];edgeMap:DerivedEdgeMapping[]}{
  const edgeMap:DerivedEdgeMapping[]=[];
  const out=edges.map((e,i)=>{
    const newId=`edge-${salt}-${i+1}`;
    edgeMap.push({sourceEdgeId:e.id,newEdgeId:newId,sourceNodeId:e.source,targetNodeId:e.target,label:e.label});
    return {...clone(e),id:newId,source:idBySource.get(e.source)||e.source,target:idBySource.get(e.target)||e.target};
  });
  return {edges:out,edgeMap};
}

export interface DeriveOptions{
  id?:string;
  name?:string;
  editor?:string;
  derivedAt?:string;
}

/**
 * 由模板派生一份全新副本（核心复制规则）：
 * - 重排流程 / 节点 / 连线编号，深拷贝配置，副本与源彻底解耦；
 * - 记录源流程、源版本、派生时间与节点 / 连线映射；
 * - 副本从草稿 v0 开始，不复制源版本历史；
 * - 不触碰源流程，同一模板可反复派生，副本之间互不影响。
 */
export function deriveWorkflow(source:Workflow, occurrence:number, opts:DeriveOptions={}):Workflow{
  const salt=(opts.id||uid('wf')).replace(/[^a-z0-9]/gi,'').slice(-8)||String(seq);
  const {nodes,nodeMap,idBySource}=renumberNodes(source.nodes,salt);
  const {edges,edgeMap}=renumberEdges(source.edges,salt,idBySource);
  const derivedAt=opts.derivedAt||new Date().toISOString().replace('T',' ').slice(0,16);
  const sourceVersionSnapshot=source.versions.find(v=>v.version===source.version);
  const derivedFrom:DerivedFrom={
    workflowId:source.id,
    workflowName:source.name,
    version:source.version,
    versionCreatedAt:sourceVersionSnapshot?.createdAt,
    derivedAt,
    nodeMap,
    edgeMap,
  };
  return {
    id:opts.id||uid('wf'),
    name:opts.name||copyName(source.name,occurrence),
    domain:source.domain,
    status:'draft',
    version:0,
    editor:opts.editor||'林秋',
    updatedAt:derivedAt,
    abnormalCount:0,
    nodes,
    edges,
    versions:[],
    derivedFrom,
  };
}
