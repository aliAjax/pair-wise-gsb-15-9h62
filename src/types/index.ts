export type WorkflowStatus='draft'|'published'|'archived';
export type NodeKind='start'|'form'|'approval'|'condition'|'automation'|'notify'|'end';
export type NodeState='unconfigured'|'configuring'|'valid'|'invalid';
export interface FormField {id:string;label:string;type:'text'|'number'|'amount'|'date'|'select'|'attachment';required:boolean;options?:string[]}
export interface FlowNode {id:string;type:NodeKind;position:{x:number;y:number};data:{label:string;state:NodeState;config:Record<string,any>}}
export interface FlowEdge {id:string;source:string;target:string;label?:string}
export interface Version {version:number;createdAt:string;note:string;nodes:FlowNode[];edges:FlowEdge[]}
export interface Workflow {id:string;name:string;domain:string;status:WorkflowStatus;version:number;editor:string;updatedAt:string;publishedAt?:string;abnormalCount:number;nodes:FlowNode[];edges:FlowEdge[];versions:Version[]}
export interface Instance {id:string;workflowId:string;applicant:string;domain:string;currentNode:string;status:'abnormal'|'timeout'|'running'|'completed';submittedAt:string;duration:string;risk:'high'|'medium'|'low';timeline:{title:string;time:string;status:string}[]}
export interface ValidationIssue {nodeId:string;level:'error'|'warning';message:string}
/** 派生节点映射：源节点 -> 副本节点（标签冗余存储，源被归档/节点被改时仍可追溯） */
export interface DerivedNodeMapping {sourceNodeId:string;newNodeId:string;label:string;type:NodeKind}
/** 派生连线映射：源连线 -> 副本连线 */
export interface DerivedEdgeMapping {sourceEdgeId:string;newEdgeId:string;sourceNodeId:string;targetNodeId:string;label?:string}
/** 派生溯源信息：仅在由模板派生的副本上存在 */
export interface DerivedFrom {
  /** 直接来源（父模板）流程 id */
  workflowId:string;
  workflowName:string;
  /** 派生时所依据的源流程版本号 */
  version:number;
  /** 该版本在源流程 versions 中的发布时间（找不到对应快照时回退使用） */
  versionCreatedAt?:string;
  derivedAt:string;
  nodeMap:DerivedNodeMapping[];
  edgeMap:DerivedEdgeMapping[];
}
export interface Workflow {id:string;name:string;domain:string;status:WorkflowStatus;version:number;editor:string;updatedAt:string;publishedAt?:string;abnormalCount:number;nodes:FlowNode[];edges:FlowEdge[];versions:Version[];derivedFrom?:DerivedFrom}
