import { NoFlags } from "./ReactFiberFlags";
import { NoLanes } from "./ReactFiberLane";
import { HostComponent, HostRoot, HostText, IndeterminateComponent } from "./ReactWorkTags";

export function createHostRootFiber() {
  return createFiber(HostRoot, null, null)
}


function createFiber(tag, pendingProps, key) {
  return new FiberNode(tag, pendingProps, key);
}


/**
 * tag: Fiber的类型、 函数组件、类组件、原生组件、 根元素
 * pendingProps： 新属性，等待处理或者说生效的属性
 * key: 唯一标示
*/

export function FiberNode(tag, pendingProps, key) {
  this.tag = tag;
  this.key = key;
  this.type = null; // fiber的类型，来自于虚拟DOM节点的type,
  this.stateNode = null; // 此fiber对应的真实DOM节点。
  this.return = null; // 父节点指针
  this.child = null; // 指向第一个字节点
  this.sibling = null; // 指向弟弟

  // fiber哪来的？ 通过虚拟Dom节点创建，虚拟DOM会提供pendingProps, 用来创建Fiber节点的属性，
  this.pendingProps = pendingProps; // 等待生效的属性;
  this.memoizeProps = null ; // 已经生效的属性

  // 每个Fiber还会有自己的状态， 每个fiber状态存的类型是不一样的。
  // 类组件对应的fiber 存的就是类的实例的状态， HostRoot存的就是要渲染的元素
  this.memoizedState = null;

  // 每个fiber身上可能还有更新队列
  this.updateQueue = null

  // 副作用表示，表示要针对fiber节点进行何种操作
  this.flags = NoFlags;

  // 子节点对应的副作用标示
  this.subtreeFlags = NoFlags;

  // 替身、轮替。
  this.alternate = null;

  this.index = 0

  this.deletions = null;
  this.lanes = NoLanes;
}


/**
 * 基于老的fiber和新的属性创建新的fiber
 * 1. current和workInprogress不是一个对象
 * 2. workInprogress有两种情况，一种时没有，创建一个新的，通过alternate指向。 另一种时存在alternate，那么直接服用alternate
 * 复用有两层含义，一种是复用老的fiber，另一种时复用老的dom
 * @param {*} current  老fiber
 * @param {*} pendingProps 新属性
 */
export function createWorkInProgress(current, pendingProps) {
  // 获取老fiber的轮替
  let workInProgress = current.alternate;

  // 第一次是null
  if(workInProgress === null) {
    workInProgress = createFiber(current.tag, pendingProps, current.key);
    workInProgress.type = current.type
    workInProgress.stateNode = current.stateNode
    // 这里会不会有引用的问题
    workInProgress.alternate = current;
    current.alternate = workInProgress
  }else {
    workInProgress.pendingProps = pendingProps
    workInProgress.type = current.type
    workInProgress.flags = NoFlags;
    workInProgress.subtreeFlags = NoFlags;
  }

  workInProgress.child = current.child;
  workInProgress.memoizeProps = current.memoizeProps;
  workInProgress.memoizedState = current.memoizedState;
  workInProgress.updateQueue = current.updateQueue;
  workInProgress.sibling = current.sibling;
  workInProgress.index = current.index;

  return workInProgress;
}

/**
 * 根据虚拟DOM节点创建fiber节点
 * @param {*} element 
 */
export function createFiberFromElement(element) {
  const { type, key,  } = element;

  const pendingProps = element.props

  return createFiberFromTypeAndProps(type, key, pendingProps)
}

function createFiberFromTypeAndProps(type, key, pendingProps) {
  let tag = IndeterminateComponent;

  // 如果type为字符串，说明是此fiber类型是原生组件 span div
  if(typeof type === 'string') {
    tag = HostComponent
  }
  const fiber = createFiber(tag, pendingProps, key);

  fiber.type = type;

  return fiber;
}

// 根据文本创建fiber节点
export function createFiberFromText(content) {
  const fiber = createFiber(HostText, content, null);

  return fiber
}