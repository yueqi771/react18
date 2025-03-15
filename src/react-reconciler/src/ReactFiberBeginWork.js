import logger, { indent } from "shared/logger";
import { FunctionComponent, HostComponent, HostRoot, HostText, IndeterminateComponent } from "./ReactWorkTags";
import { processUpdateQueue, cloneUpdateQueue } from './ReactFiberClassUpdateQueue'
import { mountChildFibers, reconcileChildFibers } from './ReactChildFiber'
import { shouldSetTextContent } from 'react-dom-bindings/src/client/ReactDOMHostConfig'
import { renderWithHooks } from 'react-reconciler/src/ReactFiberHooks'
// import { reconcileChildren } 

/**
 * 根据新的虚拟DOM生成生成新的Fiber链表
 * @param {*} current 老的父fiber
 * @param {*} workInProgress 新的fiber
 * @param {*} nextChildren 新的子虚拟DOM
 */
function reconcileChildren(current, workInProgress, nextChildren) {
  // 如果此新fiber没有老fiber，说明此新fiber是新创建的
  // 如果此fiber没有对应的老fiber，说明此fiber是新创建的，如果这个父fiber是新创建的，它的儿子们肯定也是新创建的
  if(current === null) {
    workInProgress.child = mountChildFibers(workInProgress, null, nextChildren)
  }else {
    // 如果有老fiber的话，做DOM-DIff, 拿老的子fiber链表和新的子虚拟DOM做比较，进行最小化的更新 
    workInProgress.child = reconcileChildFibers(workInProgress, current.child, nextChildren);
  }
}
/**
 * 根据虚拟DOM构建新的fiber链表
 * @param {*} current 老fiber
 * @param {*} workInProgress 当前工作的fiber
 */
export function beginWork(current, workInProgress, renderLanes) {
  indent.number += 2

  // logger(" ".repeat(indent.number) + 'beginWork', workInProgress)

  switch(workInProgress.tag) {
    // 函数组件或者类组件，本质都是函数
    case IndeterminateComponent:  
      return mounteIndeterminateComponent(current, workInProgress, workInProgress.type, renderLanes)
    case HostRoot: 
      console.log('parse HostRoot')
      return updateHostRoot(current, workInProgress, renderLanes)
    // 函数组件
    case FunctionComponent: {
      const Component = workInProgress.type;
      const newProps = workInProgress.pendingProps;
      console.log('parse FunctionComponent', Component, newProps)

      return updateFunctionComponent(current, workInProgress, Component, newProps, renderLanes);
    }

    
    // 原生组件
    case HostComponent:
      return updateHostComponent(current, workInProgress, renderLanes);
    

    case HostText:
      return null;

    default: 
      return null
  }

  return null
}

/**
 * 挂在函数组件
 * @param {*} current 老fiber
 * @param {*} workInProgress 新的fiber
 * @param {*} Component 组件类型，也就是函数组件的定义
 */
export function mounteIndeterminateComponent(current, workInProgress, Component) {
  const props = workInProgress.pendingProps;

  // 执行函数，拿到返回值 jsx
  const value = renderWithHooks(current, workInProgress, Component, props)

  workInProgress.tag = FunctionComponent;

  reconcileChildren(current, workInProgress, value)

  return workInProgress.child
}


export function updateFunctionComponent(current, workInProgress, Component, nextProps) {
  // 执行函数，拿到返回值 jsx
  const nextChildren = renderWithHooks(current, workInProgress, Component, nextProps)

  reconcileChildren(current, workInProgress, nextChildren)

  return workInProgress.child
}

function updateHostRoot(current, workInProgress, renderLanes) {
  const nextProps = workInProgress.pendingProps;
  debugger

  cloneUpdateQueue(current, workInProgress)
  // 需要知道它的子虚拟DOM信息;
  processUpdateQueue(workInProgress, nextProps, renderLanes); // workInProgress.memoizedState = { element }
  const nextState = workInProgress.memoizedState;
  // nextChildren就是新的子虚拟DOM
  const nextChildren = nextState.element;
  
  // 协调子节点 DOM DIFF -- 根据新的虚拟DOM生成Fiber链表
  reconcileChildren(current, workInProgress, nextChildren);

  return workInProgress.child;  // { tag: 5, element: 'h1' }
}

/**
 * 构建原生组件的子fiber链表
 * @param {*} current 
 * @param {*} workInProgress 
 */
function updateHostComponent(current, workInProgress) {
  const { type } = workInProgress;
  const nextProps = workInProgress.pendingProps;
  let nextChildren = nextProps.children;

  // 优化，如果是文本节点，不创建子fiber
  // 是否设置文本内容，判断当前虚拟DOM它的儿子是不是一个文本独生子
  const isDirectTextChild = shouldSetTextContent(type, nextProps)

  if(isDirectTextChild) {
    nextChildren = null;
  }

  reconcileChildren(current, workInProgress, nextChildren);

  return workInProgress.child
}