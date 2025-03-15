import { createHostRootFiber  } from './ReactFiber'
import { initialUpdateQueue } from './ReactFiberClassUpdateQueue';
import { NoLanes } from './ReactFiberLane';

function FiberRootNode(containerInfo) {
  this.containerInfo = containerInfo;
  // 表示此根上有哪些赛道等待被处理
  this.pendingLanes = NoLanes;
}

// fiber树有两个，一个是当前操作的，为current。另一个是在工作区当中的，为workInProgress
export function createFiberRoot(containerInfo) {
  const root = new FiberRootNode(containerInfo);

  // 从根节点开始创建fiber树, 即根节点的fiber树
  const uninitializedFiber = createHostRootFiber();

  // 建立两个指针，一个current指向根fiber， 一个stateNode指向真实节点（root根）
  // 根fiber的真实Dom节点指向FiberRootNode
  uninitializedFiber.stateNode = root;
  // crrent指的是当前的根fiber。
  root.current = uninitializedFiber 

  // 初始化更新队列
  initialUpdateQueue(uninitializedFiber)

  return root
}