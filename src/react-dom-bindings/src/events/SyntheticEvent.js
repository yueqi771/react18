import assign from "shared/assign";

const MouseEventInterface = {
  clientX: 0,
  clientY: 0
}

function createSyntheticEvent(eventInterface) {
  /**
   * 合成事件的基类
   * @param {*} reactName react属性名， onClick
   * @param {*} reactEventType click
   * @param {*} targetInst 事件源对应的fiber实例
   * @param {*} nativeEvent 原生事件对象
   * @param {*} nativeEventTarget 原生事件源，span，事件源对应的真实DOM
   */
  function SyntheticBaseEvent(reactName, reactEventType, targetInst, nativeEvent, nativeEventTarget) {
    this._reactName = reactName;
    this._targetInst = targetInst;
    this.reactEventType = reactEventType;
    this.nativeEvent = nativeEvent;
    this.target = nativeEventTarget;

    for(const propName in eventInterface) {
      if(!eventInterface.hasOwnProperty(propName)) {
        continue
      }

      // 把此接口上对应的属性从原生事件上拷贝到合成事件的实例上
      this[propName] = nativeEvent[propName]
    }

    this.isDefaultPrevented = functionThatReturnFalse
    ;
    this.isPropagationStopped = functionThatReturnFalse;
    return this

  }

  assign(SyntheticBaseEvent.prototype, {
    preventDefault() {
      const event = this.nativeEvent;
      if(event.preventDefault) {
        event.preventDefault()
      }else {
        event.returnValue = false;
      }

      this.isDefaultPrevented = functionThatReturnsTrue;
    },
    stopPropagation() {
      const event = this.nativeEvent;
      if(event.stopPropagation) {
        event.stopPropagation()
      }else {
        event.cancelBubble = false;
      }

      this.isPropagationStopped = functionThatReturnsTrue;
    }
  })

  return SyntheticBaseEvent
}

function functionThatReturnsTrue() {
  return true
}

function functionThatReturnFalse() {
  return false
}


export const SyntheticMouseEvent = createSyntheticEvent(MouseEventInterface);