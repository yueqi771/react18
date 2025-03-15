import { allowConcurrentByDefault } from "shared/ReactFeatureFlags";

export const TotalLanes = 31
export const NoLane = /*                         */ 0b0000000000000000000000000000000;
export const NoLanes = /*                        */ 0b0000000000000000000000000000000;
export const SyncLane = /*                       */ 0b0000000000000000000000000000001;
export const InputContinuousHydrationLane = /*   */ 0b0000000000000000000000000000010;
export const InputContinuousLane = /*            */ 0b0000000000000000000000000000100;
export const DefaultHydrationLane = /*           */ 0b0000000000000000000000000001000;
export const DefaultLane = /*                    */ 0b0000000000000000000000000010000;
export const TransitionHydrationLane = /*        */ 0b0000000000000000000000000100000;
export const TransitionLanes = /*                */ 0b0000000001111111111111111110000;
export const RetryLanes = /*                     */ 0b0000011110000000000000000000000;
export const RetryLane1 = /*                     */ 0b0000000010000000000000000000000;
export const SomeRetryLane = RetryLane1
export const SelectiveHydrationLane = /*         */ 0b000100000000000000000000000000;
export const IdleHydrationLane = /*              */ 0b0010000000000000000000000000000;
export const IdleLane = /*                       */ 0b0100000000000000000000000000000;
export const OffscreenLane = /*                  */ 0b1000000000000000000000000000000;
export const NonIdleLanes = /*                   */ 0b0001111111111111111111111111111;


export function markRootUpdated (root, updateLane) {
  // pendingLanes指的是此根上等待生效的lane
  root.pendingLanes |= updateLane
}

export function getNextLanes(root) {
  // 获取所有有更新的赛道
  const pendingLanes = root.pendingLanes;
  if(pendingLanes === NoLanes) {
    return NoLanes;
  }

  const nextLanes = getHighestPriorityLanes(pendingLanes);

  return nextLanes;
}


function getHighestPriorityLanes(lanes) {
  const lane = getHighestPriorityLane(lanes);
  return lane;
}

// 找到最右边的一个1, 只能返回一个赛道
export function getHighestPriorityLane(lanes) {
  return lanes & -lanes;
}


export function includesNonIdleWork(lanes) {
  // 说明有工作要做
  return (lanes & NonIdleLanes) !== NoLanes;
}

export function isSubsetOfLanes(set, subset) {
  // set 00110
  // subset 00010
  return (set & subset) === subset;
}


export function mergeLanes(a, b) {
  return a | b;
}

export function includesBlockingLane(root, lanes) {
  // 如果允许默认并发渲染
  if(allowConcurrentByDefault) {
    return false;
  }
  
  const SyncDefaultLanes = InputContinuousLane | DefaultLane;

  return (lanes & SyncDefaultLanes) !== NoLanes;
}

/**
 * 源码此处的逻辑有大的改动
 * pengdingLanes           =      001100
 * 返回的nextLanes 为 找到最右边的1， 000111
 * 现在的源码
 * pendingLanes           =      001100
 * 找到最右边的1， 000100
 * 
 * function getLoestPriorityLane
 */