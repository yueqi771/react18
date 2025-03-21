import { HostRoot } from "./ReactWorkTags";

const concurrentQueues = [];
let concurrentQueuesIndex = 0;

export function finishQueueingConcurrentUpdates() {
  const endIndex = concurrentQueuesIndex;
  concurrentQueuesIndex = 0;

  let i = 0;

  while(i < endIndex) {
    const fiber = concurrentQueues[i++];
    const queue = concurrentQueues[i++];
    const update = concurrentQueues[i++];
    const lane = concurrentQueues[i++];

    if(queue !== null && update !== null) {
      const pending = queue.pending;

      if(pending === null) {
        // 构成一个循环链表
        update.next = update
      }else {
        // 当前更新的next指向第一个更新，形成循环链表
        update.next = pending.next;
        // 上一个更新的next节点指向当前的update
        pending.next = update;
      }

      // pending指向最后一个更新
      queue.pending = update
    }

    /**
     * queue中的pending始终指向当前最后一个更新。pending.next始终指向第一个更新（循环链表的最后一个始终指向第一个）
     * 每次新的更新进来，
     * 让新的更新的next指向之前的第一个， 其次将上次的最后一个更新的next指向当前的update。
     * 最后让pending指向当前的更新
     */

  }
}

/**
 * 把更新对象添加到更新队列中
 * @param {*} fiber 函数组件对应的fiber
 * @param {*} queue b药更新的hook对应的更新队列
 * @param {*} update 更新对象
 */
export function enqueueConcurrentHookUpdate(fiber, queue, update, lane) {
  enqueueUpdate(fiber, queue, update, lane);
  // 从根节点开始更新
  return getRootForUpdatedFiber(fiber)
}


/**
 * 把更新入队
 * @param {*} fiber 入队的fiber 根fiber
 * @param {*} queue 待生效的队列
 * @param {*} update 更新
 * @param {*} lane 此更新的赛道
 */
export function enqueueConcurrentClassUpdate(fiber, queue, update, lane) {
  enqueueUpdate(fiber, queue, update, lane);

  return getRootForUpdatedFiber(fiber)
}

/**
 * 把更新先缓存到数组中，  
 * @param {*} fiber 
 * @param {*} queue 
 * @param {*} update 
 */
function enqueueUpdate(fiber, queue, update, lane) {
  concurrentQueues[concurrentQueuesIndex++] = fiber; // 函数组件对应的fiber
  concurrentQueues[concurrentQueuesIndex++] = queue; // 要更新的hook对应的更新队列
  concurrentQueues[concurrentQueuesIndex++] = update;  // 更新对象
  concurrentQueues[concurrentQueuesIndex++] = lane;  // 更新对应的赛道

}


function getRootForUpdatedFiber(sourceFiber) {
  let node = sourceFiber;
  let parent = node.return;

  while(parent !== null) {
    node = parent;
    parent= node.return;
  }

  return node.tag === HostRoot ? node.stateNode : null;
}

// 本来此方法要处理更新优先级的问题，目前只实现向上找到根节点
export  function markUpdateLaneFromFiberToRoot(sourceFiber) {
  let node = sourceFiber;

  let parent = sourceFiber.return;

  while(parent !== null) {
    node = parent;

    parent = parent.return
  }

  // 一直找到parent为null;
  if(node.tag === HostRoot) {
    return node.stateNode;
  }

  return null
}
