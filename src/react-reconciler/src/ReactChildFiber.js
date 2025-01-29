import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols'
import { createFiberFromElement, createFiberFromText, createWorkInProgress } from './ReactFiber'
import { ChildDeletion, Placement } from './ReactFiberFlags';
import isArray from 'shared/isArray';
import { HostText } from './ReactWorkTags';


// 有老fiber更新的时候用这个
export const reconcileChildFibers = createChildReconciler(true);
// 没有老父fiber的时候用这个
export const mountChildFibers = createChildReconciler(false)

/**
 * 
 * @param {*} shouldTrackSideEffects 是否跟踪副作用
 */
function createChildReconciler(shouldTrackSideEffects) {
  /**
   * 
   * @param {*} returnFiber div#root 对应的fiber
   * @param {*} currentFirstChild 老的functionComponent对应的fiber
   * @param {*} element 新的虚拟DOM对象
   * @returns 返回新的第一个子fiber 
   */
  function reconcileSingleElement(returnFiber, currentFirstChild, element) {
    // 新的虚拟DOMkey，可就是唯一标准
    const key = element.key; // 没有就是null

    let child = currentFirstChild; // 老的FunctionComponent对应的fiber
    
    while(child !== null) {
      // 判断此老fiber对应的key和新的虚拟DOM对应的key是否一样？ null === null 
      if(child.key === key) {
        // 判断老fiber对应的类型和新虚拟DOM元素对应的类型是否一样
        if(child.type === element.type) {
          deleteRemainingChildren(returnFiber, child.sibling)

          // 如果key一样，类型也一样，则认为此节点可以复用
          const existing = useFiber(child, element.props);

          existing.return = returnFiber;

          return existing
        }else {
          deleteRemainingChildren(returnFiber, child)
        }
      }else {
        // 如果找到了key一样的老fiber，但是类型不一样，说明不能服用，那么就把剩下的都删除
        deleteChild(returnFiber, child)
      }

      child = child.sibling
    }
    // 根据虚拟DOM创建fiber;
    // 因为我们实现的初次挂在，老节点currentFirstChild肯定是没有的，所以可以直接根据虚拟DOM创建新的Fiber节点。
    const created = createFiberFromElement(element)
    created.return = returnFiber;

    return created;
  }

  // 删除从currentFirstChild之后所有的fiber
  function deleteRemainingChildren(returnFiber, currentFirstChild) {
    if(!shouldTrackSideEffects) return;

    let childToDelete = currentFirstChild;

    while(childToDelete !== null) {
      deleteChild(returnFiber, childToDelete);

      childToDelete = childToDelete.sibling;
    }
  }

  function deleteChild(returnFiber, childToDelete) {
    if(!shouldTrackSideEffects) return;

    const deletions = returnFiber.deletions;

    if(deletions === null) {
      returnFiber.deletions = [childToDelete];
      returnFiber.flags |= ChildDeletion
    }else {
      returnFiber.deletions.push(childToDelete)
    }
  }

  function useFiber(fiber, pendingProps) {
    
    const clone = createWorkInProgress(fiber, pendingProps);

    clone.index = 0;

    clone.sibling = null;

    return clone;
  }
  /**
   * 比较（协调）子fibers，就是老的子fiber链表和新的虚拟DOM进行比较的过程
   * @param {*} returnFiber 新的父fiber 
   * @param {*} currentFirstChild 老fiber的第一个儿子（第一个子fiber），current即为老fiber
   * @param {*} newChild 新的子虚拟DOM (h1)
   */
  function reconcileChildFibers(returnFiber, currentFirstChild, newChild) {
    // 现在只考虑新的节点只有一个的情况
    if(typeof newChild === 'object' && newChild !== null) {
      switch(newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          
          return placeSingleChild(reconcileSingleElement(returnFiber, currentFirstChild, newChild));

        default: 
          break;
      }
    }

    if(isArray(newChild)) {
      return reconcileChildrenArray(returnFiber, currentFirstChild, newChild);
    }

    return null;

    // newChild [hello 文本节点， span虚拟DOM元素]
  }

  function placeSingleChild(newFiber) {
    // 说明要添加副作用
    if(shouldTrackSideEffects && newFiber.alternate === null) {
      // 说明要插入
      newFiber.flags |= Placement
    }

    return newFiber
  }

  function placeChild(newFiber, lastPlacedIndex, newIndex) {
    // 指定新的fiber在新的挂载索引
    newFiber.index = newIndex;

    // 如果不需要跟踪副作用
    if(!shouldTrackSideEffects) return lastPlacedIndex;

    // 如果有，说明这是一个更新的节点，有老的真实DOM
    const current = newFiber.alternate;

    if(current !== null) {
      const oldIndex = current.index;
      // 如果找到的老fiber的索引比lastPlacedIndex要小，则老fiber对应的DOM节点需要移动
      if(oldIndex < lastPlacedIndex) {
        newFiber.flags |= Placement;
        return lastPlacedIndex;
      } else {
        return oldIndex
      }
    } else {
      // 如果没有，说明是一个新的节点，需要插入
      newFiber.flags |= Placement;
      return lastPlacedIndex;
    }
    
  }

  function reconcileChildrenArray(returnFiber, currentFirstChild, newChildren) {
    // 返回的第一个新儿子
    let resultingFirstChild = null;
    // 上一个新fiber
    let previousNewFiber = null;

    let newIndex = 0; // 用来遍历新的虚拟DOM的索引

    let oldFiber = currentFirstChild; // 第一个老fiber
    let nextOldFiber = null // 下一个的fiber
    // 上一个不需要移动的老节点的索引
    let lastPlacedIndex = 0;
    // 开启第一轮循环, 如果老fiber有值，新的虚拟DOM也有值
    for(; oldFiber !== null && newIndex < newChildren.length; newIndex++) {
      nextOldFiber = oldFiber.sibling; // 先暂存下一个老fiber
      // 试图复用老的fiber
      const newFiber = updateSlot(returnFiber, oldFiber, newChildren[newIndex]);

      // 如果没有新的, 则中断循环
      if(newFiber === null) {
        break;
      }

      if(shouldTrackSideEffects) {
        // 没有复用老fier而是创建了一个新的fiber，这个时候需要删除老的fiber，再提交阶段会删除真实DOM
        if(oldFiber && newFiber.alternate === null) {
            deleteChild(returnFiber, oldFiber)
        }
      }

      // 指定新fiber的位置
      lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIndex);

      if(previousNewFiber === null) {
        resultingFirstChild = newFiber
      }else {
        previousNewFiber.sibling = newFiber
      }

      previousNewFiber = newFiber;

      oldFiber = nextOldFiber

    }

    // 新的虚拟DOM已经循环完毕
    if(newIndex === newChildren.length) {
      // 删除剩下的老fiber
      deleteRemainingChildren(returnFiber, oldFiber);

      return resultingFirstChild;
    }

    // 
    if(oldFiber === null) {
      // 如果老的fiber已经没有了，新的虚拟DOM还有，将新的虚拟DOM标记为插入， 进入插入的逻辑
      for(;newIndex < newChildren.length; newIndex++) {
        const newFiber = createChild(returnFiber, newChildren[newIndex])

        if(newFiber === null) continue

        lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIndex)

        if(previousNewFiber === null) {
          // 如果这个值为null， 说明是第一个fiber。
          resultingFirstChild = newFiber; // 那这个就是大儿子
        }else {
          // 否则说明不是大儿子，就把这个newFiber添加到上一个子节点后面
          previousNewFiber.sibling = newFiber;
        }
        
        // 让newFiber成为最后一个或者上一个子fiber
        previousNewFiber = newFiber
      }
    }

    // 开始处理移动的情况;
    const existingChildren = mapRemainingChildren(returnFiber, oldFiber);
    // 开始便利剩下的虚拟DOM子节点;
    for(; newIndex < newChildren.length; newIndex++) {
      const newFiber = updateFromMap(existingChildren, returnFiber, newIndex, newChildren[newIndex]);

      if(newFiber !== null) {
        if(shouldTrackSideEffects) {
          // 如果要跟踪副作用，并且有老fiber
          if(newFiber.alternate !== null) {
            existingChildren.delete(newFiber.key === null ? newIndex : newFiber.key)
          }
        }
         // 指定新fiber的存放位置，并且给lastPlacedIndex赋值
         lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIndex);

         if(previousNewFiber === null) {
           resultingFirstChild = newFiber
         }else {
           previousNewFiber.sibling = newFiber
         }
   
         previousNewFiber = newFiber; 
      }
    }

    if(shouldTrackSideEffects) {
      // 等全部处理完成之后，删除map中剩下的老fiber
      existingChildren.forEach(child => deleteChild(returnFiber, child))
    }

    return resultingFirstChild;
  }

  // 从map中查找可以复用的节点
  function updateFromMap(existingChildren, returnFiber, newIdx, newChild) {
      if((typeof newChild === 'string' && newChild !== '') || typeof newChild === 'number') {
        const matchedFiber = existingChildren.get(newIdx) || null;

        return updateTextNode(returnFiber, matchedFiber, "" + newChild);
      }

      if(typeof newChild === 'object' && newChild !== null) {
        switch(newChild.$$typeof) {
          case REACT_ELEMENT_TYPE: 
            const matchedFiber = existingChildren.get(newChild.key === null ? newIdx : newChild.key) || null;

            return updateElement(returnFiber, matchedFiber, newChild)
        }
      }
  }

  function updateTextNode(returnFiber, current, textContent) {
    if(current === null || current.tag !== HostText) {
      const created = createFiberFromText(textContent);

      created.return = returnFiber;

      return created;
    }else {
      const existing = useFiber(current, textContent);
      existing.return = returnFiber;

      return existing;
    }
  }

  function mapRemainingChildren(returnFiber, oldFiber) {
    const existingChildren = new Map();
    let existingChild = oldFiber;

    while(existingChild != null) {
      if(existingChild.key !== null) {
        existingChildren.set(existingChild.key, existingChild);
      }else {
        existingChildren.set(existingChild.index, existingChild)
      }

      existingChild = existingChild.sibling;
    }

    return existingChildren;
  }

  // 父fiber， 老fiber， 新元素
  function updateElement(returnFiber, current, element) {
    const elementType = element.type;

    // 如果老fiber存在
    if(current !== null) {
      // 判断类型是否一样，则表示key和type都相同，则可以复用老的fiber和真实DOM
      if(current.type === elementType) {
          // 用新属性更新老的fiber
          const existing = useFiber(current, element.props);

          existing.return = returnFiber;

          return existing
      }
    }

    const created = createFiberFromElement(element);

    created.return = returnFiber;

    return created
  }


  function updateSlot(returnFiber, oldFiber, newChild) {
    const key = oldFiber !== null ? oldFiber.key : null;
    if(newChild !== null && typeof newChild === 'object') {
      switch(newChild.$$typeof) {
        case REACT_ELEMENT_TYPE: {
          // 如果key一样，则进入更新元素的逻辑
          if(newChild.key === key) {
            return updateElement(returnFiber, oldFiber, newChild)
          }
        }
        default:
          return null
      }
    }
  }

  function createChild(returnFiber, newChild) {
    if((typeof newChild === 'number') || typeof newChild === 'string' && newChild !== '') {
      const created = createFiberFromText(`${newChild}`);

      created.return = returnFiber

      return created
    }

    if(typeof newChild === 'object' && newChild !== null) {
      switch(newChild.$$typeof) {
        case REACT_ELEMENT_TYPE: {
          const created = createFiberFromElement(newChild);
          created.return = returnFiber;

          return created;
        }
      }
    }

    return null
  }

  return reconcileChildFibers
}