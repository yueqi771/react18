import ReactSharedInternals from "shared/ReactSharedInternals";
import { reconcileChildFibers } from "./ReactChildFiber";
import { scheduleUpdateOnFiber, requestUpdateLane } from "./ReactFiberWorkLoop";
import { enqueueConcurrentHookUpdate } from "./ReactFiberConcurrentUpdates";
import { Passive as PassiveEffect,  Update as UpdateEffect } from './ReactFiberFlags'
import { HasEffect as HookHasEffect, Passive as HookPassive, Layout as HookLayout } from './ReactHookEffectTags'

import { useLayoutEffect, useReducer } from "react";
import { useEffect } from "react";
import { NoLanes } from "./ReactFiberLane";

const { ReactCurrentDispatcher } = ReactSharedInternals

// 当前正在使用中的hook
let workInProgressHook = null
// 当前正在渲染的fiber
let currentlyRenderingFiber = null
// 当前hook对应的老hook；
let currentHook = null

const HooksDispatcherOnMount = {
  useReducer: mountReducer,
  useState: mountState,
  useEffect: mountEffect,
  useLayoutEffect: mountLayoutEffect,

};

const HooksDispatcherOnUpdate = {
  useReducer: updateReducer,
  useState: updateState,
  useEffect: updateEffect,
  useLayoutEffect: updateLayoutEffect,
}

function mountEffect(create, deps) {
  return mountEffectImpl(PassiveEffect, HookPassive, create, deps);
}

function updateEffect(create, deps) {
  return updateEffectImpl(PassiveEffect, HookPassive, create, deps);
}

function mountEffectImpl(fiberFlags, hookFlags, create, deps) {
  const hook = mountWorkInProgressHook();

  const nextDeps = deps === undefined ? null : deps;

  // 给当前函数组件的fiber添加flags
  currentlyRenderingFiber.flags |= fiberFlags;

  hook.memoizedState = pushEffect(HookHasEffect | hookFlags, create, undefined, nextDeps)
}

function mountLayoutEffect(create, deps) {
  return mountEffectImpl(UpdateEffect, HookLayout, create, deps)
}

function updateLayoutEffect(create, deps) {
  return updateEffectImpl(UpdateEffect, HookLayout, create, deps);
}


function updateEffectImpl(fiberFlags, hookFlags, create, deps) {
  const hook = updateWorkInProgressHook();

  const nextDeps = deps === undefined ? null : deps;

  let destroy;

  // 上一个老hook
  if(currentHook !== null) {
    // 获取此useEffect这个hook上老的effect对象， create, deps, destroy
    const prevEffect = currentHook.memoizedState;

    destroy = prevEffect.destroy;

    if(nextDeps !== null) {
      const prevDeps = prevEffect.deps;
      // 用新的依赖数据和老的数组进行对比，如果一样，则不需要更新
      if(areHookInputsEqual(nextDeps, prevDeps)) {
        // 不管用不用充心执行，都需要把新的effect组成完整的循环链表放到fiber.updateQueue中
          hook.memoizedState = pushEffect(hookFlags, create, destroy, nextDeps);

          return;
      } 
    }
  }

  // 如果要执行的话，需要修改fiber的flags
  currentlyRenderingFiber.flags |= fiberFlags;

  // 如果要执行的话，添加HookHaseffect这个flags  
  // 为什么有了passive还需要添加HookHasEffect? 因为Passive不一定会执行
  hook.memoizedState = pushEffect(HookHasEffect | hookFlags, create, destroy, nextDeps);
}

function areHookInputsEqual(newDeps, prevDeps) {
  if(prevDeps === null) { return null };

  for(let i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
    if(Object.is(newDeps[i], prevDeps[i])) {
      continue;
    }

    return false;
  }
  return true;
}


/**
 * 添加effect链表
 * @param {*} tag effect标签
 * @param {*} create 创建方法
 * @param {*} destroy 销毁方法
 * @param {*} deps 依赖数组
 */
function pushEffect(tag, create, destroy, deps) {
  const effect = {
    tag, 
    create,
    destroy,
    deps,
    next: null
  };
  let componentUpdateQueue = currentlyRenderingFiber.updateQueue;

  if(componentUpdateQueue === null) {
    componentUpdateQueue = createFunctionComponentUpdateQueue();
    currentlyRenderingFiber.updateQueue = componentUpdateQueue;

    componentUpdateQueue.lastEffect = effect.next = effect
  }else {
    const lastEffect = componentUpdateQueue.lastEffect;
    if(lastEffect === null) {
      componentUpdateQueue.lastEffect =  effect.next = effect
    }else {
      const firstEffect = lastEffect.next;
      // 老的最后一个的next指向新的
      lastEffect.next = effect;
      // 新的next指向第一个，构成循环链表
      effect.next = firstEffect;
      componentUpdateQueue.lastEffect = effect
    }
  }

  return effect
}

function createFunctionComponentUpdateQueue(){
  return {
    lastEffect: null
  }
}

function updateReducer(reducer, initialArg) {
  // 获取新的hook
  const hook = updateWorkInProgressHook();
  // 获取新的hook的更新队列
  const queue = hook.queue;
  // 获取老hook
  const current = currentHook;
  // 获取将要生效的更新队列
  const pendingQueue = queue.pending;
  // 初始化一个新的状态，取值为当前的状态
  let newState = current.memoizedState;

  if(pendingQueue !== null) {
    queue.pending = null;

    const firstUpdate = pendingQueue.next;

    let update = firstUpdate;
    do {
      if(update.hasEagerState) {
        newState = update.eagerState
      } else {
        const action = update.action;
  
        newState = reducer(newState, action);
      }
  
      update = update.next;
    }while(update !== null && update !== firstUpdate) 
  }

  hook.memoizedState = newState;

  return [hook.memoizedState, queue.dispatch]
}

function mountReducer(reducer, initialArg) {
  const hook = mountWorkInProgressHook();
  
  hook.memoizedState = initialArg;

  const queue = {
    pending: null,
    dispatch: null,
    lastRenderedReducer: reducer,
    lastRendererdState: initialArg
  }

  hook.queue = queue;

  const dispatch = (queue.dispatch = dispatchRuducerAction.bind(null, currentlyRenderingFiber, queue))

  return [hook.memoizedState, dispatch]
}


function mountState(initialState) {
  const hook = mountWorkInProgressHook();
  hook.memoizedState = initialState;
  const queue = {
    pending: null,
    dispatch: null,
    lastRenderedReducer: baseStateReducer, // 上一个reducer
    lastRendererdState: initialState, // 上一个state
  }

  hook.queue = queue;

  const dispatch = (queue.dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue))

  return [hook.memoizedState, dispatch]
}

function baseStateReducer(state, action) {
  return typeof action === 'function' ? action(state) : action
}

function updateState() {
  return updateReducer(baseStateReducer);

}

function dispatchSetState(fiber, queue, action) {
  
  // 获取当前的更新赛道
  const lane = requestUpdateLane();
  const update = {
    lane, // 本次更新的优先级就是1
    action,
    hasEagerState: false, // 是否有急切的更新
    eagerState: null, // 急切的更新状态
    next: null
  };

  const alternate = fiber.alternate;
  
  // if(fiber.lanes === NoLanes && (alternate === null || (alternate.lanes & lane) === NoLanes)) {
  //   // 先获取队列上的老的状态和老的reducer
  //   const { lastRenderedReducer, lastRendererdState } = queue
  //   // 当触发动作后，我立刻用上一次的状态和上一次的reducer计算新的状态.
  //   const eagerState = lastRenderedReducer(lastRendererdState, action)
  //   update.hasEagerState = true;
  //   update.eagerState = eagerState;

  //   if(Object.is(eagerState, lastRendererdState)) {return}
  // }

  // 下面时真正的锐队更新，并调度更新逻辑
  const root = enqueueConcurrentHookUpdate(fiber, queue, update, lane);
  scheduleUpdateOnFiber(root, fiber, lane);
}

/**
 * 构建新的hook
 */
function updateWorkInProgressHook() {
  // 说明是第一个hook, 获取将要构建的新hook的老hook
  if(currentHook === null) {
    const current = currentlyRenderingFiber.alternate;

    currentHook = current.memoizedState;
  }else {
    currentHook = currentHook.next;
  }

  // 根据老hook创建新hook
  const newHook = {
    memoizedState: currentHook.memoizedState,
    queue: currentHook.queue,
    next: null 
  }

  // 第一个hook，
  if(workInProgressHook  === null) {
    currentlyRenderingFiber.memoizedState = workInProgressHook = newHook;
  }else {
    workInProgressHook = workInProgressHook.next = newHook
  }

  return workInProgressHook;
}

/**
 * 执行派发动作的方法，他需要更新状态，并且让界面重新更新
 * @param {*} fiber function对应的fiber
 * @param {*} queue hook对应的更新队列
 * @param {*} action 派发的动作
 */
function dispatchRuducerAction(fiber, queue, action) {
  // 每个hooks会存放一个更新队列，更新队列事一个更新对象的循环链表. update1.next = update2, update2.next = update1
  const update = {
    action, // {type: 'add', payload: 1}
    next: null
  }
  // 把当前最新的更新添加到更新队列中，并且返回当前的根fiber
  const root = enqueueConcurrentHookUpdate(fiber, queue, update);

  scheduleUpdateOnFiber(root)
  console.log(fiber, queue, action)
}

 
/**
 * 挂载构建中的hook
 */
function mountWorkInProgressHook() {
  const hook = {
    memoizedState: null, // hook的状态
    queue: null, // 存放hook的更新队列， queue.pending = update的循环链表
    next: null // 指向下一个hook，一个函数里可能会有多个hook。第一个的实例指向第二个，他们构成了一个单向链表 
  }

  // 第一次执行
  if(workInProgressHook === null) {
    // 当前函数对应的fiber的状态等于第一个hook
    currentlyRenderingFiber.memoizedState = workInProgressHook = hook;
  }else {
    // 新的hook赋值给上一个hook的next
    workInProgressHook.next = hook;
    // workInprogresshook永远指向最后一个hook
    workInProgressHook = hook;
   }

  return workInProgressHook
}

/**
 * 渲染函数组件 
 * @param {*} current 老fiber
 * @param {*} workInProgress 新fiber
 * @param {*} Component 组件定义
 * @param {*} props 组件属性
 * @returns 
 */
export function renderWithHooks(current, workInProgress, Component, props) {
  currentlyRenderingFiber = workInProgress; // 函数组件对应的fiber
  workInProgress.updateQueue = null;
  // 如果存在老fiber，并且有老的hooks链表，说明是更新的流程
  if(current !== null && current.memoizedState !== null) {
    ReactCurrentDispatcher.current = HooksDispatcherOnUpdate;
  }else {
    // 初次挂载逻辑
    // hooks就是一个函数，他会返回一个稳定的状态
    ReactCurrentDispatcher.current = HooksDispatcherOnMount;
  }
  
  // 函数组件里面需要用的hooks， 所以需要在函数组件执行前给ReactCurrentDispatcher.current 赋值
  const children = Component(props);
  currentlyRenderingFiber = null;
  workInProgressHook = null;
  currentHook = null;

  return children;
}