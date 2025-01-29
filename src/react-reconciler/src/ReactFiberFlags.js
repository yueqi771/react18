
export const NoFlags = /*                      */ 0b0000000000000000000000000000;
export const PerformedWork = /*                */ 0b0000000000000000000000000001;
export const Placement = /*                    */ 0b0000000000000000000000000010;
export const DidCapture = /*                   */ 0b0000000000000000000010000000;
export const Hydrating = /*                    */ 0b0000000000000001000000000000;

// You can change the rest (and add more).
export const Update = /*                       */ 0b0000000000000000000000000100;
export const ChildDeletion = /*                */ 0b0000000000000000000000001000;
export const MutationMask = Placement | Update;

// 如果函数组件里面使用了useEffect, 那么此函数组件对应的fiber上会有一个flags， 表示需要执行副作用
export const Passive = /*                     */  0b000000000000000010000000000;

export const LayoutMask = Update;

