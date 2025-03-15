import { DefaultLane, getHighestPriorityLane, IdleLane, InputContinuousHydrationLane, NoLane, includesNonIdleWork, SyncLane } from "./ReactFiberLane";


// 离散事件优先级 click onchange
export const DiscreteEventPriority = SyncLane; // 1
// 连续事件优先级，例如mousemove
export const ContinousEventPriority = InputContinuousHydrationLane; // 4
// 默认事件优先级
export const DefaultEventPriority = DefaultLane; // 16
// 空闲事件优先级
export const IdleEventPriority = IdleLane;

let currentUpdatePriority = NoLane;
export function getCurrentUpdatePriority() {
  return currentUpdatePriority;
}

export function setCurrentUpdatePriority(priority) {
  currentUpdatePriority = priority;
}

/**
 * 判断事件优先级是不是比lane要小，小意味着优先级更高
 * @param {*} a 
 * @param {*} b 
 * @returns 
 */
export function isHigherEventPriority(eventPriority, lane) {
  return (eventPriority !== 0) && eventPriority < lane
}

/**
 * 把lane转成事件优先级, 事件优先级有4个，调度优先级有5个，更新优先级(lane)有31个
 * @param {*} lanes 
 * @returns 
 */
export function lanesToEventPriority(lanes) {
  // 获取最高优先级的lane
  let lane = getHighestPriorityLane(lanes);

  // 看
  if(!isHigherEventPriority(DiscreteEventPriority, lane)) {
    return DiscreteEventPriority;
  }
  if(!isHigherEventPriority(ContinousEventPriority, lane)) {
    return ContinousEventPriority;
  }
  if(includesNonIdleWork(lane)) {
    return DefaultEventPriority;
  }

  return IdleEventPriority;
}
