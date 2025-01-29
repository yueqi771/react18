import { appendChild, insertBefore, commitUpdate, removeChild } from "react-dom-bindings/src/client/ReactDOMHostConfig";
import { MutationMask, Passive, Placement, Update, LayoutMask } from "./ReactFiberFlags";
import { FunctionComponent, HostComponent, HostRoot, HostText } from "./ReactWorkTags";
import { HasEffect as HookHasEffect, Passive as HookPassive, Layout as HookLayout } from './ReactHookEffectTags'

 let hostParent = null;
/**
 * 遍历fiber树，执行fiber上的副作用
 * @param {*} finishedWork 
 * @param {*} root 
 */
export function commitMutationEffectsOnFiber(finishedWork, root) {
  const current = finishedWork.alternate;
  const flags = finishedWork.flags;
  switch(finishedWork.tag) {
    case FunctionComponent: {
        // 先遍历它们的子节点，处理它们的子节点上副作用
        recursivelyTraverseMutationEffects(root, finishedWork);
        // 再处理自己身上的副作用
        commitReconciliationEffects(finishedWork);

        if(flags  & Update) {
          commitHookEffectListUnMount(HookHasEffect | HookLayout, finishedWork)
        }
        break;
    }
    case HostRoot:
    case HostText: {
       // 先遍历它们的子节点，处理它们的子节点上副作用
       recursivelyTraverseMutationEffects(root, finishedWork);
       // 再处理自己身上的副作用
       commitReconciliationEffects(finishedWork);
       break;
    }
    case HostComponent: {
      // 先遍历它们的子节点，处理它们的子节点上副作用
      recursivelyTraverseMutationEffects(root, finishedWork);
      // 再处理自己身上的副作用
      commitReconciliationEffects(finishedWork);
      // 处理DOM更新逻辑
      if(flags & Update) {
        // 获取真实DOM
        const instance = finishedWork.stateNode;
        // 更新真实DOM
        if(instance !== null) {
          const newProps = finishedWork.memoizedProps;
          const oldProps = current !== null ? current.memoizedProps : newProps;
          const type = finishedWork.type;
          const updatePayload = finishedWork.updateQueue;
          finishedWork.updateQueue = null
          if(updatePayload) {
            commitUpdate(instance, updatePayload, type, oldProps, newProps, finishedWork)
          }
        }
      }
    }
    default:
      break;
  }
}

export function commitPassiveMountEffects(root, finishedWork) {
  commitPassiveMountOnFiber(root, finishedWork)
}

export function commitPassiveUnmountEffects(finishedWork) {
  commitPassiveUnmountOnFiber(finishedWork)
}

export function commitLayoutEffects(finishedWork, root) {
  // 老的根fiber
  const current = finishedWork.alternate;

  commitLayoutEffectOnFiber(root, current, finishedWork)
}

function commitPassiveMountOnFiber(finishedRoot, finishedWork) {
  const flags = finishedWork.flags;

  switch(finishedWork.tag) {
    case HostRoot:
      recursivelyTraversePassiveMountEffects(finishedRoot, finishedWork);
      break;
    case FunctionComponent: {
      recursivelyTraversePassiveMountEffects(finishedRoot, finishedWork);
      // 说明该函数组件有effects
      if(flags & Passive) {
        commitHookPassiveMountEffects(finishedWork, HookPassive | HookHasEffect);
      }
      break;
    } 
  }
}

function commitPassiveUnmountOnFiber(finishedWork) {
  const flags = finishedWork.flags;

  switch(finishedWork.tag) {
    case HostRoot:
      recursivelyTraversePassiveUnmountEffects(finishedWork);
      break;
    case FunctionComponent: {
      recursivelyTraversePassiveUnmountEffects(finishedWork);
      // 说明该函数组件有effects
      if(flags & Passive) {
        commitHookPassiveUnmountEffects(finishedWork, HookPassive | HookHasEffect);
      }
      break;
    } 
  }
}

function commitLayoutEffectOnFiber(finishedRoot, current, finishedWork) {
  const flags = finishedWork.flags;

  switch(finishedWork.tag) {
    case HostRoot:
      recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
      break;
    case FunctionComponent: {
      recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
      // 说明该函数组件有effects
      if(flags & LayoutMask) {
        commitHookLayoutEffects(finishedWork, HookHasEffect | HookLayout);
      }
      break;
    } 
  }
}


function recursivelyTraversePassiveMountEffects(root, parentFiber) {
  if(parentFiber.subtreeFlags & Passive) {
    let child = parentFiber.child;

    while(child !== null) {
      commitPassiveMountOnFiber(root, child);

      child = child.sibling;
    }
  }
}

function recursivelyTraversePassiveUnmountEffects(parentFiber) {
  if(parentFiber.subtreeFlags & Passive) {
    let child = parentFiber.child;

    while(child !== null) {
      commitPassiveUnmountOnFiber(child);

      child = child.sibling;
    }
  }
}

function recursivelyTraverseLayoutEffects(root, parentFiber) {
  if(parentFiber.subtreeFlags & LayoutMask) {
    let child = parentFiber.child;

    while(child !== null) {
      const current = child.alternate;
      commitLayoutEffectOnFiber(root, current, child);

      child = child.sibling;
    }
  }
}


function commitHookPassiveMountEffects(finishedWork, hookFlags) {
  commitHookEffectListMount(hookFlags, finishedWork); 
}


function commitHookPassiveUnmountEffects(finishedWork, hookFlags) {
  commitHookEffectListUnMount(hookFlags, finishedWork);
}

function commitHookLayoutEffects(finishedWork, hookFlags) {
  commitHookEffectListMount(hookFlags, finishedWork)
}

function commitHookEffectListMount(flags, finishedWork) {
  const updateQueue = finishedWork.updateQueue;

  const lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;

  if(lastEffect !== null) {
    const firstEffect = lastEffect.next;

    let effect = firstEffect;

    do{
      // 如果此 effect的类型和传入的相同，都是9， HookHasEffect | PassiveEffect
      if((effect.tag & flags) === flags) {
        const create = effect.create;
        effect.destroy = create()
      }

      effect = effect.next;
    }while(effect !== firstEffect) 
  }
}

function commitHookEffectListUnMount(flags, finishedWork) {
  const updateQueue = finishedWork.updateQueue;

  const lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;

  if(lastEffect !==  null) {
    const firstEffect = lastEffect.next;

    let effect = firstEffect;

    do{
      // 如果此 effect的类型和传入的相同，都是9， HookHasEffect | PassiveEffect
      if((effect.tag & flags) === flags) {
        const destroy = effect.destroy;

        if(destroy !== undefined) {
          destroy()
        }
      }

      effect = effect.next;
    }while(effect !== firstEffect) 
  }
}

// xv//.,mnbg
function commitReconciliationEffects(finishedWork) {
  const { flags } = finishedWork;
  // 说明是插入操作,
  if(flags & Placement) {
    // 进行插入操作，也就是把此fiber对应的真实DOM节点添加到父真实DOM节点上.
    commitPlacement(finishedWork);
    // 把flags里的Placement删除
    finishedWork.flags & ~Placement;
  }
}

/**
 * 提交删除的副作用
 * @param {*} root 
 * @param {*} returnFiber 
 * @param {*} deletedFiber 
 */
function commitDeletionEffects(root, returnFiber, deletedFiber) {
  let parent = returnFiber;

  // 一直向上查找，找到真实的DOM节点为止
  findParent: while(parent !== null) {
    switch(parent.tag) {
      case HostComponent: {
        hostParent = parent.stateNode;
        break findParent
      }

      case HostRoot: {
        hostParent = parent.stateNode.containerInfo;
        break findParent;
      }
    }
    parent = parent.return;
  }


  commitDeletionEffectsOnFiber(root, returnFiber, deletedFiber);

  hostParent = null
}

/** 把此fiber的真实DOM插入到父DOM里面 */
function commitPlacement(finishedWork) {
  console.log('commitPlacement', finishedWork) 
  // 找到一个具有真实DOM节点的父亲
  let parentFiber = getHostParentFiber(finishedWork)

  switch(parentFiber.tag) {
    case HostRoot: {
      const parent = parentFiber.stateNode.containerInfo;
      // 获取最近的弟弟真实DOM节点
      const before = getHostSibling(finishedWork);
      // insertNode(finishedWork, parent);
      insertOrAppendPlacementNode(finishedWork, before, parent)
      break;
    }
      
    case HostComponent: {
      const parent = parentFiber.stateNode;
      const before = getHostSibling(finishedWork);

      insertOrAppendPlacementNode(finishedWork, before, parent);
      break
    }

    default:
      break
  }
  
} 

function getHostSibling(finishedWork) {
  let node = finishedWork;

  siblings: while(true) {
    while(node.sibling === null) {
      if(node.return === null || isHostParent(node.return)) {
        return null
      }
      node = node.return
    }

    node = node.sibling;

    // 如果弟弟不是原生节点也不是文本节点
    while(node.tag !== HostComponent && node.tag !== HostText) {
      // 如果此节点时一个要插入的节点，那么找他们的弟弟
      if(node.flags& Placement) {
        continue siblings
      }
    }

    if(!(node.flags & Placement)) {
      return node.stateNode
    }
  }
}

function commitDeletionEffectsOnFiber(finishedRoot, nearestMountedAncestor, deletedFiber) {
  switch(deletedFiber.tag) {
    case HostComponent:
    case HostText: {  
      // 如果需要删除一个节点的时候，要先删除它的子节点，再删除自己
      recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, deletedFiber)
      // 把自己删除
      if(hostParent !== null) {
        removeChild(hostParent, deletedFiber.stateNode);
      }
      break;
    }

    default: 
      break;  
  }
}

function recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, parent) {
  let child = parent.child;
  while(child !== null) {
    commitDeletionEffectsOnFiber(finishedRoot, nearestMountedAncestor, child);
    child = child.sibling;
  }
}

function insertOrAppendPlacementNode(node, before, parent) {
  const { tag } = node;

  const isHost = tag === HostComponent || tag === HostText

  if(isHost) {
    const { stateNode } = node;
    
    if(before) {
      insertBefore(parent, stateNode, before)
    } else {
      appendChild(parent, stateNode)

    }
  }else {
    // 不是原生节点，类似于函数组件
    const { child } = node;

    if(child !== null) {
      // 把大儿子插入到父节点里面去
      insertOrAppendPlacementNode(child, null, parent);
      // 大儿子的兄弟节点依次添加到父节点里面去.
      let { sibling } = child

      while(sibling !== null) {
        insertOrAppendPlacementNode(sibling, parent)

        sibling = sibling.sibling 
      }
    }
  }
}


function getHostParentFiber(fiber) {
  let parent = fiber.return;

  while(parent !== null) {
    if(isHostParent(parent)) {
      return parent
    }

    parent = parent.return
  }

  return null
}

function isHostParent(fiber) {
  return fiber.tag === HostComponent || fiber.tag === HostRoot;
}

function recursivelyTraverseMutationEffects(root, parentFiber) {
  // 先把父fiber上该删除的删掉
  const deletions = parentFiber.deletions;
  if(deletions !== null) {
    for(let i = 0; i < deletions.length; i++) {
      const childToDelete = deletions[i];

      commitDeletionEffects(root, parentFiber, childToDelete)
    }
  }
  if(parentFiber.subtreeFlags & MutationMask) {
    let { child } = parentFiber;

    while(child !== null) {
      commitMutationEffectsOnFiber(child, root);

      child = child.sibling;
    }
  }
}