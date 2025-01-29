import logger, { indent } from "shared/logger";
import { createTextInstance, createInstance, finalizeInitialChildren, appendInitialChild, prepareUpdate } from 'react-dom-bindings/src/client/ReactDOMHostConfig'
import { HostComponent, HostRoot, HostText, FunctionComponent } from "./ReactWorkTags";
import { NoFlags, Update } from "./ReactFiberFlags";

/**
 * 完成一个fiber节点
 * @param {*} current 老fiber
 * @param {*} workInProgress 新构建的fiber
 */
export function completeWork(current, workInProgress) {
  indent.number -= 2
  // logger(" ".repeat(indent.number) + 'completeWork', workInProgress)

  const newProps = workInProgress.pendingProps;
  switch(workInProgress.tag) {
    case HostRoot:
      // 向上冒泡属性
      bubbleProperties(workInProgress)
    // 如果完成的事原生的节点的话
    break;
    
    case HostComponent:
      // 创建真实的DOM节点
      const { type } = workInProgress;

      // 如果老fiber存在，并且老fiber上展示DOM节点，要走节点的更新逻辑
      if(current !== null && workInProgress.stateNode !== null ) {
        updateHostComponent(current, workInProgress, type, newProps);
      }else {
        const instance = createInstance(type, newProps, workInProgress);
        // 把自己所有的儿子都添加到自己身上(初次挂载);
        appendAllChild(instance, workInProgress)
        workInProgress.stateNode = instance;

        finalizeInitialChildren(instance, type, newProps)
      }

      // 向上冒泡属性
      bubbleProperties(workInProgress)

      break;
    
    case FunctionComponent: 
      bubbleProperties(workInProgress);
      break;
      
    case HostText:
      // 如果完成的fiber是文本节点，那就创建真实的文本节点
      const newText = newProps;
      // 创建真实的DOM节点并且传入stateNode
      workInProgress.stateNode = createTextInstance(newText);
      // 向上冒泡属性
      bubbleProperties(workInProgress)
      break;
  }
}

function bubbleProperties(completedWork) {
  let subtreeFlags = NoFlags;
  // 便利当前fiber的所有子节点，把所有的子节点的副作用，笔记子节点的子节点的副作用全部合并
  let child = completedWork.child;
  while(child !== null) {
    // flags自己的副作用，subtreeFlags是儿子的副作用
    subtreeFlags |= child.subtreeFlags;
    subtreeFlags |= child.flags;

    child = child.sibling
  }
  completedWork.subtreeFlags = subtreeFlags
}

/**
 * 把当前完成的fiber所有的子节点对应的真实DOM都挂载到自己父parent真实DOM节点上
 * @param {*} parent 
 * @param {*} workInProgress 
 */
function appendAllChild(parent, workInProgress) {
  let node = workInProgress.child;

  while(node) {
    // 如果子节点是一个原声节点或者文本节点
    if(node.tag === HostComponent || node.tag === HostText) {
      appendInitialChild(parent, node.stateNode);
    }else if(node.child !== null){
      // 如果第一个儿子不是一个原生节点，说明他可能是一个函数组件
      node = node.child;
      continue;
    }

    if(node === workInProgress) return 

    // 如果当前节点没有弟弟
    while(node.sibling === null) {
      if(node.return === workInProgress || node.repeat == null) return
      // 回到父节点
      node = node.return;
    }
    node = node.sibling;
    
  }
}

/**
 * 从fiber的完成节点准备更新DOM
 * @param {*} current 老fiber
 * @param {*} workInProgress 新fiber
 * @param {*} type 类型
 * @param {*} newProps 新属性
 */
function updateHostComponent(current, workInProgress, type, newProps) {
  const oldProps = current.memoizedProps; // 老的属性

  const instance = workInProgress.stateNode; // 老的DOM节点

  // 比较新老属性，收集属性的差异
  const updatePayload = prepareUpdate(instance, type, oldProps, newProps);

  // updatePayload的输出结构类似于["id": "btn2", "children", "2"]
  // const updatePayload = ["children", "6"]
  // 让原生组件的新fiber更新队列等于[]
  workInProgress.updateQueue = updatePayload;

  if(updatePayload) {
    markUpdate(workInProgress)
  }

}

function markUpdate(workInProgress) {
  // 给当前的fiber添加更新的副作用
  workInProgress.flags |= Update;
}