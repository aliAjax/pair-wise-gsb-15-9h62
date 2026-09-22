import type {DerivationTrace,FlowEdge,FlowNode,Workflow} from '../types';

export interface DeriveOptions {
  /** 新流程 id，缺省自动生成 */
  newId?:string;
  /** 副本名称，缺省按派生次数生成 */
  name?:string;
  /** 该源模板已有的派生次数（用于默认命名） */
  existingCount?:number;
  now?:Date;
  editor?:string;
}

const pad=(n:number)=>String(n).padStart(2,'0');
export const formatStamp=(d:Date)=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** 副本默认命名：第一次“（派生副本）”，之后带序号 */
export const defaultDerivedName=(sourceName:string,existingCount=0)=>
  existingCount>0?`${sourceName}（派生副本 ${existingCount+1}）`:`${sourceName}（派生副本）`;

let seq=0;
const genId=()=>`wf-${Date.now()}-${++seq}`;

/**
 * 模板派生核心规则（纯函数）：
 * 1. 深拷贝结构，副本节点统一重排为 n1..nk、连线重排为 e1..em；
 * 2. 按源节点出现顺序建立新旧编号映射，连线随节点映射重写端点；
 * 3. 记录源流程 id/名称/版本、节点与连线映射（DerivationTrace）；
 * 4. 副本从草稿 v0 开始，不复制源版本历史（versions 为空）。
 */
export function deriveWorkflow(source:Workflow,opts:DeriveOptions={}):Workflow {
  const now=opts.now||new Date();
  const stamp=formatStamp(now);

  const nodeMap:Record<string,string>={};
  const nodes:FlowNode[]=source.nodes.map((node,i)=>{
    const newId=`n${i+1}`;
    nodeMap[newId]=node.id;
    return {
      ...JSON.parse(JSON.stringify(node)),
      id:newId,
    };
  });

  const edgeMap:Record<string,string>={};
  const edges:FlowEdge[]=source.edges.map((edge,i)=>{
    const newId=`e${i+1}`;
    edgeMap[newId]=edge.id;
    const fromEntry=Object.entries(nodeMap).find(([,old])=>old===edge.source);
    const toEntry=Object.entries(nodeMap).find(([,old])=>old===edge.target);
    return {
      ...JSON.parse(JSON.stringify(edge)),
      id:newId,
      source:fromEntry?fromEntry[0]:edge.source,
      target:toEntry?toEntry[0]:edge.target,
    };
  });

  const trace:DerivationTrace={
    sourceWorkflowId:source.id,
    sourceWorkflowName:source.name,
    sourceVersion:source.version,
    derivedAt:stamp,
    nodeMap,
    edgeMap,
  };

  return {
    id:opts.newId||genId(),
    name:opts.name||defaultDerivedName(source.name,opts.existingCount||0),
    domain:source.domain,
    status:'draft',
    version:0,
    editor:opts.editor||'林秋',
    updatedAt:stamp,
    abnormalCount:0,
    nodes,
    edges,
    versions:[],
    derivedFrom:trace,
  };
}

/** 某流程被直接派生的次数（用于流程列表“派生次数”列） */
export const derivationCount=(workflows:Workflow[],sourceId:string)=>
  workflows.filter(w=>w.derivedFrom?.sourceWorkflowId===sourceId).length;

/** 是否为模板派生副本 */
export const isDerived=(w:Workflow)=>!!w.derivedFrom;
