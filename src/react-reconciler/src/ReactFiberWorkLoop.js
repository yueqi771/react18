import { 
  scheduleCallback, 
  NormalPriority as NormalSchedulerPriority,
  shouldYield,
  ImmediatePriority as ImmediateSchedulerPriority,
  UserBlockingPriority as UserBlockingSchedulerPriority,
  IdlePriority as IdleSchedulerPriority,
 } from "./Scheduler"
import { createWorkInProgress } from './ReactFiber'
import { beginWork } from './ReactFiberBeginWork'
import { completeWork } from './ReactFiberCompleteWork'
import { ChildDeletion, MutationMask, NoFlags, Passive, Placement, Update } from "./ReactFiberFlags";
import { commitMutationEffectsOnFiber, commitPassiveMountEffects, commitPassiveUnmountEffects, commitLayoutEffects } from './ReactFiberCommitWork'
import { FunctionComponent, HostComponent, HostRoot, HostText } from "./ReactWorkTags";
import { finishQueueingConcurrentUpdates } from "./ReactFiberConcurrentUpdates";
import { NoLanes, markRootUpdated, getNextLanes, getHighestPriorityLane, SyncLane, includesBlockingLane } from './ReactFiberLane'
import { ContinousEventPriority, lanesToEventPriority, DefaultEventPriority, DiscreteEventPriority, getCurrentUpdatePriority, IdleEventPriority, setCurrentUpdatePriority } from './ReactEventPriorities'
import { getCurrentEventPriority } from 'react-dom-bindings/src/client/ReactDOMHostConfig'
import { scheduleSyncCallback, flushSyncCallbacks } from './ReactFiberSyncTaskQueue'
let workInProgress = null;
let workInProgressRoot = null; // 正在构建中的根节点
let rootDoesHavePassiveEffect = false; // 此根节点上有没有useEffect类似的副作用
let rootWithPendingPassiveEffects = null; // 具有useEffect副作用的根节点
let workInProgressRootRenderLanes = NoLanes; // 当前的渲染优先级

// 构建fiber树正在进行中
const RootInProgress = 0;
// 构建fiber树已经完成
const RootCpmpleted = 5;

// 当渲染工作结束的时候，当前的fiber树处于什么状态，默认是进行中
let workInProgressRootExitStatus = RootInProgress;

/**
 * 计划更新root， 此处有一个调度任务的功能
 * @param {*} root 
 */
export function scheduleUpdateOnFiber(root, fiber, lane) {
  markRootUpdated(root, lane)

  // 这里需要打断电调试一下，是怎么实现批量更新的
  // 确保调度执行root上的更新
  ensureRootIsScheduled(root)
}



function ensureRootIsScheduled(root) {
  // 获取当前优先级最高的赛道
  const nextLanes = getNextLanes(root, NoLanes); // 16
  // 没有任务要执行，直接结束
  if(nextLanes === NoLanes) { 
    return;
  }
  
  // 获取新的调度优先级
  let newCallbackPriority = getHighestPriorityLane(nextLanes); 

  // 新的毁掉任务
  let newCallbackNode;

  // 如果新的优先级是同步的话
  if(newCallbackPriority === SyncLane) {

    console.log('sync mode')
    // 先把performSyncWorkObroot添加d到同步队列中
    scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root));
    // 再把flushSyncCallbacks放入微任务
    queueMicrotask(flushSyncCallbacks);

    // 如果是同步执行额话，
    newCallbackNode = null
  }else {
    console.log('concurrent mode')

    // 如果不是同步，就需要调度一个新的任务
    let schedulerPriorityLevel;
    switch(lanesToEventPriority(nextLanes)) {
       case DiscreteEventPriority:
         schedulerPriorityLevel = ImmediateSchedulerPriority;
         break;
       case ContinousEventPriority:
         schedulerPriorityLevel = UserBlockingSchedulerPriority;
         break;
       case DefaultEventPriority:
         schedulerPriorityLevel = NormalSchedulerPriority;
         break;
       case IdleEventPriority:
         schedulerPriorityLevel = IdleSchedulerPriority;
        default: 
          schedulerPriorityLevel = NormalSchedulerPriority
    }

    newCallbackNode = scheduleCallback(schedulerPriorityLevel, performConcurrentWorkOnRoot.bind(null, root))

  }

  // 在根节点执行的任务是newCallbackNode
  root.callbackNode = newCallbackNode;

  // if(workInProgressRoot) return
  // workInProgressRoot = root;
  // // 告诉浏览器要更新performConcurrentWorkOnRoot
  // scheduleCallback(NormalSchedulerPriority, performConcurrentWorkOnRoot.bind(null, root))
}

function performSyncWorkOnRoot(root) {
  // 获得最高优先级的赛道
  const lane = getNextLanes(root);

  // 渲染新的fiber树
  renderRootSync(root, lane);

  const finishedWork = root.current.alternate;
    
  root.finishedWork = finishedWork;

  commitRoot(root);

  return null;
}

// 开启fiber的工作循环, 构建fiber树, 创建真实的DOM节点. 
// 把真实的DOM节点插入容器
function performConcurrentWorkOnRoot(root, timeout) {
  console.log('performConcurrentWorkOnRoot-----', )
  // 先获取当前根节点上的任务
  const orginalCallbackNode = root.callbackNode;

  // 获取当前优先级最高的赛道
  const lanes = getNextLanes(root, NoLanes); // 16

  if(lanes === NoLanes) {
    return null;
  }

  // 如果不包含阻塞的车大袄，并且没有超时，就可以并行渲染，就是启动时间分片
  // 所以默认更新车道是同步的，默认车道是不启动时间分片
  const shouldTimeSlice = !includesBlockingLane(root, lanes) && (!timeout);

  console.log('shouldTimeSlice----', shouldTimeSlice);

  // // 执行渲染，得到退出的状态s
  const exitStatus = shouldTimeSlice ? renderRootConcurrent(root, lanes) : renderRootSync(root, lanes);
  // // 如果不是渲染中的话，说明已经渲染完了
  if(exitStatus !== RootInProgress) {
    const finishedWork = root.current.alternate;
    root.finishedWork = finishedWork;
    commitRoot(root);
  }

  // // 说明任务没有完成
  if(root.callbackNode === orginalCallbackNode) {
    // 把此函数返回，接着干
    return performConcurrentWorkOnRoot.bind(null, root);
  }

  return null;

  // return performConcurrentWorkOnRoot
}

function renderRootConcurrent(root, lanes) {
  // 因为在构建fiber树的过程中，此方法会反复进入，会进入多次
  // 只有在第一次进来的时候，会创建新的fiber树 
  // 根不一样，并且赛道不一样
  if(workInProgress !== root || workInProgressRootRenderLanes !== lanes) {
    prepareFreshStack(root, lanes)
  }

  // 会在当前分配的时间片（5ms）内执行fiber树的构建或者说渲染
  workLoopConcurrent();

  // 如果不为null，说明fiber树的构建还没完成
  if(workInProgress !== null) {
    return RootInProgress;
  }

  // 如果为null， 说明渲染工作结束了，那么提交
  return workInProgressRootExitStatus;

}

function commitRoot(root) {
  const previousUpdatePriority = getCurrentUpdatePriority();

   try {
      // 把当前的更新优先级设置为1，提交阶段是不能暂停的
      setCurrentUpdatePriority(DiscreteEventPriority);
      commitRootImpl(root)
    }finally {
      setCurrentUpdatePriority(previousUpdatePriority);
    }
}

function commitRootImpl(root) {
  // 新构建的fiber树的根节点
  const { finishedWork } = root;
  workInProgressRoot = null;
  workInProgressRootRenderLanes = null;
  root.callbackNode = null;
  if(
    (finishedWork.subtreeFlags & Passive) !== NoFlags
    ||
    (finishedWork.flags & Passive) !== NoFlags
  ) {
    if(!rootDoesHavePassiveEffect) {
      rootDoesHavePassiveEffect = true;

      scheduleCallback(NormalSchedulerPriority, flushPassiveEffect) 
    }
  }
  // printFinishWork(finishedWork)
  // console.log('~~~~~~~~~~~~~~~~')
  // 判断子树有没有副作用，有就提交
  const subtreeHasEffects = (finishedWork.subtreeFlags & MutationMask) !== NoFlags;
  // 判断当前节点是否有副作用，有的话再提交
  const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags;
  if(subtreeHasEffects || rootHasEffect) {
    // 当DOM变更之后执行
    commitMutationEffectsOnFiber(finishedWork, root);
    // 执行了layout effect
    commitLayoutEffects(finishedWork, root)
    if(rootDoesHavePassiveEffect) {
      // 提交之后，重制
      rootDoesHavePassiveEffect = false;

      rootWithPendingPassiveEffects = root;
    }
  }

  // dom变更后，就可以让root的current指向新的fiber树
  root.current = finishedWork
}


function flushPassiveEffect() {
  if(rootWithPendingPassiveEffects) {
    const root = rootWithPendingPassiveEffects;

    // 执行卸载副作用，destroy
    commitPassiveUnmountEffects(root.current);

    // 执行挂载副作用
    commitPassiveMountEffects(root, root.current)
  }
}


function renderRootSync(root, renderLanes) {
  // 如果新的根和老的根不一样，或者新的渲染优先级和老的渲染优先级不一样
  if(root !== workInProgressRoot || workInProgressRootRenderLanes !== renderLanes) {
    // 开始构建Fiber树
    prepareFreshStack(root, renderLanes)
  }
  
  workLoopSync()
}

// 准备一个新鲜的栈
function prepareFreshStack(root, renderLanes) {
  
  workInProgress = createWorkInProgress(root.current, null);
  workInProgressRootRenderLanes = renderLanes;
  workInProgressRoot = root;
  // 完成队列的并发更新
  finishQueueingConcurrentUpdates()
}

function workLoopConcurrent() {
  // 如果有下一个要构建的fiber并且时间片没有过期
  while(workInProgress !== null && !shouldYield()) {
    // sleep(1200);

    performUnitOfWork(workInProgress)
  }
}

function workLoopSync() {
  while(workInProgress !== null) {
    performUnitOfWork(workInProgress)
  }
}

/**
 * 执行一个工作单元
 * @param {*} unitOfWork 
 */
function performUnitOfWork(unitOfWork) {
  // 获取新的fiber, 对应的老fiber
  const current = unitOfWork.alternate;
  // 完成当前fiber的子fiber链表构建够
  const next = beginWork(current, unitOfWork, workInProgressRootRenderLanes);


  // 等待生效的变成已经生效的
  unitOfWork.memoizedProps = unitOfWork.pendingProps;

  // 没有子节点， 表示当前fiber已经完成了
  if(next === null) {
    // workInProgress = null;
    completetUnitOfWork(unitOfWork)
  }else {
    // 如果有子节点，那么让子节点成为下一个工作单元
    workInProgress = next
  }
}

function completetUnitOfWork(unitOfWork) {
  let completedWork = unitOfWork;

  do{
    const current = completedWork.alternate;
    const returnFiber = completedWork.return;
    // 执行此fiber的完成工作，如果是原生组件的话，就是创建真实的dom节点
    completeWork(current, completedWork);

    const siblingFiber = completedWork.sibling;
    // 如果有弟弟，就嘎偶见弟弟对应的fiber链表
    if(siblingFiber !== null) {
      workInProgress = siblingFiber;

      return
    }
    // 如果没有弟弟，说明就是当前完成的就是父fiber的最后一个节点，也就是收缩父fiber的所有子fiber都完成了
    completedWork = returnFiber;

    workInProgress = completedWork
  }while (completedWork !== null)
  
  // 如果进入到这里，说明整个fiber树全部构建完毕
  if(workInProgressRootExitStatus === RootInProgress) {
    // 把构建状态设置为完成
    workInProgressRootExitStatus = RootCpmpleted;
  }
}

function printFinishWork(fiber) {
  let { flags, deletions } = fiber

  if((flags & ChildDeletion) !== NoFlags) {
    flags &= (~ChildDeletion )
    console.log( '子节点有要删除的操作' + (deletions.map(fiber => `${fiber.type}#${fiber.memoizedProps.id}`).join(',')))
  }

  let child = fiber.child;

  while(child) {
    printFinishWork(child)
    child = child.sibling
  }

  if(fiber.flags !== NoFlags) {
    console.log(getFlags(fiber), getTag(fiber.tag), typeof fiber.type === 'function' ? fiber.type.name : fiber.type, fiber.memoizedProps)
  }
}

function getTag(tag) {
  switch(tag) {
    case HostRoot:
      return 'HostRoot';
    case FunctionComponent:
      return 'FunctionComponent'
    case HostComponent:
      return 'HostComponent';
    case HostText:
      return 'HostText';

    default:
      return tag
      break
  }
}

function getFlags(fiber) {
  const { flags, deletions } = fiber

  if(flags === (Placement | Update)) {
    return '移动'
  }
  
  if(flags === Placement) {
    return '插入'
  }

  if(flags === Update) {
    return '更新'
  }

  return flags
}

export function requestUpdateLane() {
  // 获取当前更新的优先级
  const updateLane  = getCurrentUpdatePriority();
  if(updateLane !== NoLanes) {
    return updateLane;
  }

  const eventLane = getCurrentEventPriority();
  return eventLane;
}


function sleep(duration) {
  const timeStep = new Date().getTime();

  const endTime = timeStep + duration;

  while(true) {
    if(new Date().getTime() > endTime) {
      return 
    }
  }
}