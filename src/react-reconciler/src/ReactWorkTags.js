
// 组件分为类组件，函数组件，因为一开始无法确定是一个类组件或函数组件，所以一开始给一个默认值。
export const FunctionComponent = 0; // 函数组件 
export const ClassComponent = 1; // 类组件
export const IndeterminateComponent = 2;
export const HostRoot = 3; // Root of Host tree 根Fiber的Tag类型 每种虚拟DOm都会对应自己的fiber tag类型

export const HostComponent = 5 // 原生节点。 span, div
export const HostText = 6 // 纯文本节点