// 如何实现一个循环链表，并且带有头尾指针


let updateQueue  = {
  tail: null,
  queue: null
}

// 形成循环变量需要记录三个状态，一个是尾部，一个是头部，还有一个是上一个

function enqueueUpdate(update) {
  // 如果尾指针为null
  if(updateQueue.tail === null) {
    updateQueue.queue = update
    updateQueue.queue.next = update
  }else {
    update.next = updateQueue.tail.next;
    updateQueue.tail.next = update
  }

  // 记录上一个，也就是尾部。
  updateQueue.tail = update
}

const update1 = { name: "A" }

const update2 = { name: "B" }
enqueueUpdate(update1)
enqueueUpdate(update2)

printUpdateQueue(updateQueue)

function printUpdateQueue(updateQueue) {
  let { queue } = updateQueue;
  let desc = queue.name + '#';
  
  let current;
  while(current !== updateQueue.queue) {
    current = current || queue
    desc += current.name + '=>';
    current = current.next;
  }

  desc += 'null';
  console.log(desc);
}