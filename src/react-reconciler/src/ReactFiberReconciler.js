import { createUpdate, enqueueUpdate } from './ReactFiberClassUpdateQueue';
import { markUpdateLaneFromFiberToRoot } from './ReactFiberConcurrentUpdates';
import { createFiberRoot } from './ReactFiberRoot'
import { scheduleUpdateOnFiber, requestUpdateLane } from './ReactFiberWorkLoop';

export function createContainer(containerInfo) {
  // fiberRoot表示fiber根，对应的是真实dom节点，rootfiber表示fiber的根节点，两个不一样
  return createFiberRoot(containerInfo)
}

/**
 * 把虚拟DOM转化为真实DOM
 * @param {} element 
 * @param {*} root 
 */
export function updateContainer(element, container) {
  // 获取当前的根Fiber
  const current = container.current;
  // 请求一个更新赛道 // 16
  const lane = requestUpdateLane();
  
  // 创建更新
  const update = createUpdate(lane);

  // 需要更新的虚拟DOM, 
  update.payload = { element };

  // 把此更新对象添加到current这个根Fiber的更新队列上
  const root = enqueueUpdate(current, update, lane)

  // 在fiber上调度更新
  // scheduleUpdateOnFiber(root); todo 之前没有这个参数好像
  scheduleUpdateOnFiber(root, current, lane)

  return root
}