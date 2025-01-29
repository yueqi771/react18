import { IdlePriority, ImmediatePriority, LowPriority, NormalPriority, UserBlockingPriority } from "./SchedulerPriorities";
import { push } from './SchedulerMinHeap'
const maxSinged31BitInt = 1073741823; // Time out immediately;
const IMMEDIATE_PRIORITY_TIMEOUT = -1; // Eventually time out
// yonghu 阻塞操作优先级250ms
const USER_BLOCKING_PRIORITY_TIMEOUT = 250;
// 正常任务的过期时间 5s
const NORMAL_PRIORITY_TIMEOUT = 5000;
// 低优先级任务过期时间；10s  Never times out  
const LOW_PRIORITY_TIMEOUT = 10000;
// Tasks are stored on a min heap
const IDLE_PRIORITY_TIMEOUT = maxSinged31BitInt;

// 任务ID计数器
let taskIdCounter = 1;
// 任务的 最小堆
const taskQueue = [];
let scheduleHostCallback = null;
// 开始执行任务的时间
let startTime = null;
// 当前的任务
let currentTask = null;
// React每一帧向浏览器申请5ms用于自己的任务执行
// 如果5ms内没有完成，react也会放弃控制权，将控制交还给浏览器
const frameInterval = 5;


const channel = new MessageChannel();
var port1 = channel.port1;
var port2 = channel.port2;

port1.onmessage = performWorkUntilDeadline;


/**
 * 按优先级执行任务
 * @param {*} priorityLevel 
 * @param {*} callback 
 */
export function scheduleCallback(priorityLevel, callback) {
  // 获取当前的时间
  const currentTime = getCurrentTime();
  // 此任务的开始时间
  const startTime = currentTime;

  // 超时时间  ， 超时时间之内，高优先级可以打断低优先级任务，超时时间异一过，则低优先级任务不允许被打断
  let timeout;

  switch(priorityLevel) {
    case ImmediatePriority:
      timeout = IMMEDIATE_PRIORITY_TIMEOUT; // -1
      break;

    case UserBlockingPriority:
      timeout = USER_BLOCKING_PRIORITY_TIMEOUT; // 250ms
      break;
    
    case IdlePriority:
      timeout = IDLE_PRIORITY_TIMEOUT; // 103848383很大
      break;

    case LowPriority:
      timeout = LOW_PRIORITY_TIMEOUT; // 10s
      break;
    
    case NormalPriority:
    default:
      timeout = NORMAL_PRIORITY_TIMEOUT; // 5s
      break;
  };

  // 计算此任务的过期时间
  const expirationTime = startTime + timeout;

  const newTask = {
    id: taskIdCounter++,
    callback, // 回调函数，
    priorityLevel, // 优先级别
    startTime, // 任务的开始时间
    expirationTime, // 任务的过期时间
    sortIndex: expirationTime // 排序依赖
  }

  // 想任务最小堆里面添加任务，排序的依据是过期时间
  push(taskQueue, newTask);
  // flushWork 执行工作，刷新工作，执行任务，类似司机接人
  requestHostCallback(workLoop);

  return newTask;
}

function requestHostCallback(flushWork) {
  // 缓存回调函数
  scheduleHostCallback = flushWork;
  // 执行工作知道截止时间
  // schedulePerformWorkUntilDeadline()
}

function schedulePerformWorkUntilDeadline() {
  port2.postMessage(null);
}
/**
 * 开始执行任务队列中的任务
 * @param {*} startTime 
 */
function workLoop(startTime) {
  let currentTime = startTime;
  // 取出最小堆中优先级最高的任务
  currentTask = peek(taskQueue);

  while(currentTask !== null) {
    // 如果此任务的过期时间小雨当前时间，也就是说没有过期，并且需要放弃执行，那么break
    if(currentTask.expirationTime > currentTime && shouldYieldToHost()) {
      break;
    }

    // 取出当前任务中的回调函数
    const callback = currentTask.callback;

    if(typeof callback === 'function') {
      currentTask.callback = null;
      const continuationCallback = callback();

      // 执行工作，如果返回心得函数，则表示当前的工作没有完成
      if(typeof continuationCallback === 'function') {
        currentTask.callback = continuationCallback;
        return true; // 还有任务要执行
      }

      // 如果任务已经往完成，则不需要再继续执行了，可以把此任务弹出
      if(currentTask === peek(taskQueue)) {
        pop(taskQueue);
      }
    }else {
      pop(taskQueue);
    }

    // 如果当前任务执行完了，或者当前任务不合法，取出下一个任务执行
    currentTask = peek(taskQueue);
  }

  // 如果循环结束还有未完成的任务，那就表示hasMoreWork为true
  if(currentTask !== null) {
    return true;
  }

  return false;
}

function shouldYieldToHost() {
  // 用当前时间减去开始的时间, 就是已经过去的时间
  const timeElapsed = getCurrentTime() - startTime;

  // 如果说流逝的时间，或者经过的时间小于5ms， 那就不需要放弃执行
  if(timeElapsed < frameInterval) {
    return false
  }

  // 否则表示5ms用光了

  return true
}

function performWorkUntilDeadline() {
  if(scheduleHostCallback) {
    // 先获取开始执行任务的时间,表示时间片的开始
    startTime = getCurrentTime();
    // 是否有更多的工作要做
    let hasMoreWork = true;

    try {
      // 执行 flushWork， 并判断有没有返回值
      hasMoreWork = scheduleHostCallback(startTime);

    }catch(e) {

    }finally {
      // 如果执行完为true的话， 说明还有更多工作要做
      if(hasMoreWork) {
        // 继续执行
        // schedulePerformWorkUntilDeadline();
      }else {
        scheduleHostCallback = null;
      }
    }
  }
}

// 从启动到现在的毫秒数
function getCurrentTime() {
  return performance.now();
}

export {
  shouldYieldToHost as shouldYield,
  IdlePriority, ImmediatePriority, LowPriority, NormalPriority, UserBlockingPriority
}