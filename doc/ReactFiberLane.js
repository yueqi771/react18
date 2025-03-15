// 有两个赛道
const NoLanes = 0b00;
const NoLane = 0b00;
const SyncLane = 0b01; // 1
const InputContinuousHydrationLane = 0b10; // 2

function isSubsetOfLanes(set, subset) {
  // set 00110
  // subset 00010
  return (set & subset) === subset;
}

function mergeLanes(a, b) {
  return a | b;
}

function initializeUpdateQueue(fiber) {
  const queue = {
    baseState: fiber.memoizedState, // 本次更新前当前fiber的状态， 更新会给予它进行计算状态
    firstBaseUpdate: null, // 本次更新前该fiber上保存的上次跳过的更新链表表头
    lastBaseUpdate: null, // 本次跟新前该fiber上保存的上次跳过的更新链表的尾部
    shared: {
      pending: null,
    }
  }

  fiber.updateQueue = queue;
}

function enqueueUpdate(fiber, update) {
  let updateQueue = fiber.updateQueue;
  const sharedQueue = updateQueue.shared;

  const pending = sharedQueue.pending;

  if(pending === null) {
    update.next = update;
  }else {
    update.next = pending.next;
    pending.next = update;
  }

  sharedQueue.pending = update;
}

function processUpdateQueue(fiber, renderLanes) {
  const queue = fiber.updateQueue;
  let firstBaseUpdate = queue.firstBaseUpdate; // 老的链表头
  let lastBaseUpdate = queue.lastBaseUpdate;  // 老的链表尾
  const pendingQueue = queue.shared.pending; // 新的链表尾
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
    fiber.lanes = newLanes;
    fiber.memoizedState = newState;

  } 
}

function getStateFromUpdate(update, prevState) {
  return update.payload(prevState);
  
}

// 新建一个fiber
// 演示如何给fiber添加不同优先级的更新
// 在执行渲染的时候总是优先取最高优先级的更新， 跳过优先级低的更新
let fiber = {
  memoizedState: {
    msg: 'hello',
  },
}

initializeUpdateQueue(fiber)

let updateA = {
  id: "A",
  payload: (state) => ({msg: state.msg + 'A'}),
  lane: SyncLane
}

enqueueUpdate(fiber, updateA)

let updateB = {
  id: "B",
  payload: (state) => ({msg: state.msg + 'B'}),
  lane: InputContinuousHydrationLane

}

enqueueUpdate(fiber, updateB)

let updateC = {
  id: "C",
  payload: (state) => ({msg: state.msg + 'C'}),
  lane: SyncLane

}

enqueueUpdate(fiber, updateC)

let updateD = {
  id: "D",
  payload: (state) => ({msg: state.msg + 'D'}), 
  lane: InputContinuousHydrationLane
}

enqueueUpdate(fiber, updateD)

// 处理更新队列
processUpdateQueue(fiber, SyncLane)

console.log(fiber.memoizedState)
console.log('updateQueue', printUpdateQueue(fiber.updateQueue))

processUpdateQueue(fiber, InputContinuousHydrationLane)


// let updateE = {
//   id: "E",
//   payload: (state) => ({msg: state.msg + 'E'}),
//   lane: InputContinuousHydrationLane
// }

// enqueueUpdate(fiber, updateE)

// let updateF = {
//   id: "F",
//   payload: (state) => ({msg: state.msg + 'F'}),
//   lane: SyncLane
// }

// enqueueUpdate(fiber, updateF)

// 处理的时候需要制定一个渲染优先级
// processUpdateQueue(fiber, InputContinuousHydrationLane)

console.log(fiber.memoizedState)

function printUpdateQueue(updateQueue) {
  const { baseState, firstBaseUpdate } = updateQueue;
  let desc = baseState + '#';
  let update = firstBaseUpdate;
  
  while(update) {
    desc += update.id + '=>';
    update = update.next;
  }

  desc += 'null';
  console.log(desc);
}