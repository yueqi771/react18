// 有effect
export const HasEffect = 0b0001;

// 有useEffect，Passive消极执行，所以执行的时候比较晚, 类似宏任务
export const Passive = 0b1000;

export const Layout = 0b0100 // 4 积极的， 会在UI绘制前执行，类似微任务
