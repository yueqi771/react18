import assign from "shared/assign";
import { enqueueConcurrentClassUpdate } from "./ReactFiberConcurrentUpdates";
import { NoLanes, NoLane, mergeLanes, isSubsetOfLanes } from "./ReactFiberLane";
// 更新状态
export const UpdateState = 0;

export function initialUpdateQueue(fiber) {
  // pending其实是一个循环链表
  const queue = {
    baseState: fiber.memoizedState, // 本次更新前当前fiber的状态， 更新会给予它进行计算状态
    firstBaseUpdate: null, // 本次更新前该fiber上保存的上次跳过的更新链表表头
    lastBaseUpdate: null, // 本次跟新前该fiber上保存的上次跳过的更新链表的尾部
    shared: {
      pending: null
    }
  }

  fiber.updateQueue = queue;
}

export function createUpdate(lane) {
  const update = { tag: UpdateState, lane, next: null };

  return update;

}

export function enqueueUpdate(fiber, update, lane) {
  // 获取更新队列
  const updateQueue = fiber.updateQueue;
  // 获取共享队列
  const sharedQueue = updateQueue.shared;
  
  return enqueueConcurrentClassUpdate(fiber, sharedQueue, update, lane);


  /**
  const updateQueue = fiber.updateQueue;
  const pending = updateQueue.shared.pending;

  if(pending === null) {
    update.next = update
  }else {
    update.next = pending.next
    pending.next = update
  }

  // pending指向最后一个更新，最有一个更新的next指向第一个更细。
  // 单向循环链表
  updateQueue.shared.pending = update

   // 从当前fiber向上找到根fiber
   return enqueueConcurrentClassUpdate(fiber) 
    */
}


/**
 * 根据老状态和更新队列中的更新计算最新的状态
 * @param {*} workInProgress 要计算的fiber
 */
export function processUpdateQueue(workInProgress, nextProps, renderLanes) {
  
  const queue = workInProgress.updateQueue;
  let firstBaseUpdate = queue.firstBaseUpdate; // 老的链表头
  let lastBaseUpdate = queue.lastBaseUpdate;  // 老的链表尾
  const pendingQueue = queue.shared.pending; // 新的链表尾
  console.log('pendingQueue-----',  queue, queue.shared, pendingQueue)

  // 合并新老两个链表
  if(pendingQueue !== null) {
    queue.shared.pending = null;
    const lastPendingUpdate = pendingQueue;
    // 新链表尾部
    const firstPendingUpdate = lastPendingUpdate.next;
    // 把老链表剪断，变为一个单链表;
    lastPendingUpdate.next = null;

    // 如果没有老链表
    if(lastBaseUpdate === null) {
      // 把新链表只想新的链表头
      firstBaseUpdate = firstPendingUpdate;
    } else {
      lastBaseUpdate.next = firstPendingUpdate;
    }
    lastBaseUpdate = lastPendingUpdate;

  }

  // 如果链表不为空
  if(firstBaseUpdate !== null) {
    // 上次跳过的更新前的状态
    let newState = queue.baseState;
    // 尚未执行的更新的lane
    let newLanes = NoLane;
    let newBaseState = null;
    let newFirstBaseUpdate = null; 
    let newLastBaseUpdate = null;

    let update = firstBaseUpdate; // updateA

    do {
      // 获取
      const updateLane = update.lane; // 2
      // 如果说updateLane不是renderLanes的子集的话，说明本次渲染不需要处理此更新，而是需要跳过该更新
      if(!isSubsetOfLanes(renderLanes, updateLane)) {
        // 把此更新克隆一份，保存下来
        const clone = {
          id: update.id,
          lane: updateLane,
          payload: update.payload
        }

        // 说明新的跳过的base链表为空，说明当前的更新是第一个跳过的更新
        if(newLastBaseUpdate === null) {
          // 让新的跳过的链表头和链表尾都只想这个第一次跳过的更新
          newFirstBaseUpdate = newLastBaseUpdate = clone;
          // 计算保存在新的baseState为次跳过更新时的state
          newBaseState = newState // ""
        }else {
          newLastBaseUpdate = newLastBaseUpdate.next = clone
        }

        newLanes = mergeLanes(newLanes, updateLane)
      }else {
        // 说明已经有跳过的更新了
        if(newLastBaseUpdate !== null) {
          const clone = {
            id: update.id,
            lane: NoLane,
            payload: update.payload
          }

          newLastBaseUpdate = newLastBaseUpdate.next = clone

        } 

        newState = getStateFromUpdate(update, newState)
      }

      update = update.next
    }while(update);

    // 如果没有跳过的更新的话
    if(!newLastBaseUpdate) {
      newBaseState = newState
    }
    queue.baseState = newBaseState;
    queue.firstBaseUpdate = newFirstBaseUpdate;
    queue.lastBaseUpdate = newLastBaseUpdate;
    workInProgress.lanes = newLanes;
    debugger
    workInProgress.memoizedState = newState;

  } 
}

/**
 * 根据老状态和更新计算新的状态
 * @param {*} update 更新的对象其实有很多类型
 * @param {*} prevState 老状态
 */
function getStateFromUpdate(update, prevState, nextProps) {
  switch(update.tag) {
    case UpdateState: 
      const { payload } = update;

      let partialStatel

      if(typeof payload === 'function') {
        partialStatel = payload.call(null, prevState, nextProps)
      }else {
        partialStatel = payload
      }

      return assign({}, prevState, partialStatel)
  }
}

export function cloneUpdateQueue(current, workInProgress) {
  // 新的更新队列
  const workInProgressQueue = workInProgress.updateQueue;
  // 老的更新队列
  const currentQueue = current.updateQueue;

  if(currentQueue === workInProgressQueue) {
    const clone = {
      baseState: currentQueue.baseState,
      firstBaseUpdate: currentQueue.firstBaseUpdate,
      lastBaseUpdate: currentQueue.lastBaseUpdate,
      shared: currentQueue.shared,
    }

    workInProgressQueue.updateQueue = clone;
  }
}