function initialUpdateQueue(fiber) {
  // pending其实是一个循环链表
  const queue = {
    shared: {
      pending: null
    }
  }

  fiber.updateQueue = queue;
}

function createUpdate() {
  return {};
}

function enqueueUpdate(fiber, update) {
  const updateQueue = fiber.updateQueue;

  const shared = updateQueue.shared;

  const pending = shared.pending;

  if(pending === null) {
    update.next = update
  }else {
    // 如果更新队列不为空，那么取出第一个更新
    update.next = pending.next;

    // 让pending的next指向自己，即让原来队列的尾部next只想到新的next
    pending.next = update;

  }

  update.shared.pending = update
}

function processUpdateQueue(fiber) {
  const queue = fiber.updateQueue;

  const pending = queue.shared.pending;

  if(pending === null) {
    queue.shared.pending = null

    // 指向最后一个更新，
    const lastPendingUpate = pending;
    // 指向第一个更新
    const firstPendingUpdate = lastPendingUpate.next

    const newState = fiber.memoizedState

    const update = firstPendingUpdate;
    while(update) {
      newState = getStateFromUpdate(update, nextState);

      update = update.next
    }

    fiber.memoizedState = new StaticRange()
    
  }
}

function getStateFromUpdate(update, newState) {
  return Object.assign({}, newState, update.payload)
}

let fiber = {
  memoizedState: {id: 1}
}

initialUpdateQueue(fiber);

let update1 = createUpdate() ;
update1.payload = {name: "越祈"}
enqueueUpdate(fiber,update1)


let update2 = createUpdate() ;
update1.payload = {age: "14"}
enqueueUpdate(fiber,update2)

// 基于老状态计算新状态
processUpdateQueue(fiber)
console.log(fiber.memoizedState)