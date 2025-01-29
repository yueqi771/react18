import { 
  scheduleCallback, 
  NormalPriority as NormalSchedulerPriority,
  shouldYield
 } from "scheduler"
import { createWorkInProgress } from './ReactFiber'
import { beginWork } from './ReactFiberBeginWork'
import { completeWork } from './ReactFiberCompleteWork'
import { ChildDeletion, MutationMask, NoFlags, Passive, Placement, Update } from "./ReactFiberFlags";
import { commitMutationEffectsOnFiber, commitPassiveMountEffects, commitPassiveUnmountEffects, commitLayoutEffects } from './ReactFiberCommitWork'
import { FunctionComponent, HostComponent, HostRoot, HostText } from "./ReactWorkTags";
import { finishQueueingConcurrentUpdates } from "./ReactFiberConcurrentUpdates";
let workInProgress = null;
let workInProgressRoot = null;
let rootDoesHavePassiveEffect = false; // 此根节点上有没有useEffect类似的副作用
let rootWithPendingPassiveEffects = null; // 具有useEffect副作用的根节点

/**
 * 计划更新root， 此处有一个调度任务的功能
 * @param {*} root 
 */
export function scheduleUpdateOnFiber(root) {
  // 这里需要打断电调试一下，是怎么实现批量更新的
  // 确保调度执行root上的更新
  ensureRootIsScheduled(root)
}

function ensureRootIsScheduled(root) {
  if(workInProgressRoot) return
  workInProgressRoot = root;
  // 告诉浏览器要更新performConcurrentWorkOnRoot
  scheduleCallback(NormalSchedulerPriority, performConcurrentWorkOnRoot.bind(null, root))
}

// 开启fiber的工作循环, 构建fiber树, 创建真实的DOM节点. 
// 把真实的DOM节点插入容器
function performConcurrentWorkOnRoot(root) {
  console.log('performConcurrentWorkOnroot')
  // 以同步的方式渲染根节点，初次渲染的时候，都是同步的。
  renderRootSync(root)
  // 开始进入提交阶段，就是执行副作用，修改真实DOM
  const finishedWork = root.current.alternate;
  root.finishedWork = finishedWork;

  commitRoot(root);

  workInProgressRoot = null;

  // return performConcurrentWorkOnRoot
}

function commitRoot(root) {
  // 新构建的fiber树的根节点
  const { finishedWork } = root;
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


function renderRootSync(root) {
  // 开始构建Fiber树
  prepareFreshStack(root)

  workLoopSync()
}

// 准备一个新鲜的栈
function prepareFreshStack(root) {
  workInProgress = createWorkInProgress(root.current, null);

  // 完成队列的并发更新
  finishQueueingConcurrentUpdates()
}

function workLoopCocurrent() {
  // 如果有下一个要构建的fiber并且时间片没有过期
  while(workInProgress !== null && !shouldYield()) {
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
  const next = beginWork(current, unitOfWork);

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