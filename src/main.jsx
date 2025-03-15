import { createRoot } from 'react-dom/client'
import * as React from './react'


// let element = 
{/* <h1>
      hello1 <span style={{ color: 'red' }}>world1</span>
    </h1>
    <h2>
      hello2 <span style={{ color: 'green' }}>world2</span>
    </h2> */}
function reducer(state, action) {
  if(action.type === 'add') return state + 1;

  return state;
}

function HooksComponent() {
  // const [number, setNumber] = React.useReducer(reducer, 0) 
  const [number, setNumber] = React.useState(0);


  return (<button  onClick={() =>  {
    setNumber(number + 1)
  }}>{ number }</button>)
}
 
/**
 * 测试渲染
 * @returns 
 */
function FunctionComponent() {
  return (
    <h1 id="h1_contaner" 
      onClick={(event) => console.log('parent chick bubble', event.currentTarget)}
      onClickCapture = { (event) => console.log('parent click capture', event.currentTarget) }
    >
      hello
      <span 
        style={{ color: 'red' }}
        onClick={(event) => console.log('child chick bubble', event.currentTarget)}
        onClickCapture = { (event) => console.log('child click capture', event.currentTarget) }
      >text</span>
    </h1>
  ) 
}
  

function DiffSingleComponent() {
  const [number, setNumber] = React.useState(0);

  return number === 0 ? 
  (
    <div onClick={() => setNumber(number + 1)} key="title1" id="title">
      title
    </div>
  ) 
  : 
  (
    <p onClick={() => setNumber(number + 1)} key="title1" id="title2">
      title2
    </p>
  )

}

function DiffSingle2Component() {
  const [number, setNumber] = React.useState(0);

  return number === 0 ? (
    <ul key="container" onClick={() => setNumber(number + 1)}>
      <li key="A" id="A">A</li>
      <li key="B" id="B">B</li>
      <li key="C" id="C">C</li>
    </ul>
  ) :
  (
    <ul key="container" onClick={() => setNumber(number + 1)}>
      <li key="B" id="B2">B2</li>
    </ul>
  )
}

function DiffMuliteComponent() {
  const [number, setNumber] = React.useState(0);

  return number === 0 ? (
    <ul key="container" onClick={() => setNumber(number + 1)}>
      <li key="A" id="A">A</li>
      <li key="B" id="B">B</li>
      <li key="C" id="C">C</li>
    </ul>
  ) :
  (
    <ul key="container" onClick={() => setNumber(number + 1)}>
      <li key="A" id="A2">A2</li>

      <p key="B" id="B2">B2</p>

      {/* <li key="C" id="C2">C2</li> */}
      {/* <li key="D" id="D">D</li> */}


    </ul>
  )
}

function DiffAndMoveMuliteComponent() {
  const [number, setNumber] = React.useState(0);

  return number === 0 ? (
    <ul key="container" onClick={() => setNumber(number + 1)}>
      <li key="A" id="A">A</li>
      <li key="B" id="B">B</li>
      <li key="C" id="C">C</li>
      <li key="D" id="D">D</li>
      <li key="E" id="E">E</li>
      <li key="F" id="F">F</li>
    </ul>
  ) :
  (
    <ul key="container" onClick={() => setNumber(number + 1)}>
      <li key="A" id="A2">A2</li>
      <li key="C" id="C2">C2</li>
      <li key="E" id="E2">E2</li>
      <li key="B" id="B2">B2</li>
      <li key="G" id="G2">G</li>
      <li key="D" id="D2">D2</li>


      {/* <li key="C" id="C2">C2</li> */}
      {/* <li key="D" id="D">D</li> */}


    </ul>
  )
}


function EffectComponent() {
  const [number, setNumber] = React.useState(0);

  React.useEffect(() => {
    console.log('【effect1】: number', 'setup timer', number);

    // let timer = setInterval(() => setNumber(number => number + 1), 1000)

    return () => {
      // clearInterval(timer)
      console.log('【effect1 destoary】: number', number)
    }
  }, [])

  React.useLayoutEffect(() => {
    console.log('【layout effect layout2】: number', number)

    return () => {
      console.log('【layout effect 2 destoary】: number', number)
    }
  })

  React.useEffect(() => {
    console.log('【effect3 】: number', number)

    return () => {
      // console.log('【effect3  destoary】: destroy timer', number)
    }
  })

  return (
    <button onClick={() => setNumber(number + 1)}>{ number }</button>
  )
}

// 更新优先级
// function 

// let element = <h1>这里是标题 </h1>

function FunctionComponent1() {
  console.log('FUnctionComponent')
  const [number, setNumber] = React.useState(0);

  React.useEffect(() => {
    setNumber(number => number + 1)
  }, [])

  return (
    <button onClick={() => setNumber(number => number + 1)}>{number}</button>
  )
}

/**
 * 高优更新打断低优更新
 */
function FunctionComponent2() {
  const [numbers, setNumbers] = React.useState(new Array(10).fill('A'));

  React.useEffect(() => {
    setTimeout(() => {

    }, 10)

    setNumbers(numbers => numbers.map(number => number + 'B'))
  }, [])

  return (
    <button onClick={numbers => numbers.map(number => number + 'C')}>
      {
        numbers.map((number, index) => <span key={index}>{number}</span>)
      }
    </button>
  )
}


let element = <FunctionComponent2 />

// 创建一个根节点
const root = createRoot(document.getElementById('root'))
// 把element元素渲染到容器中
root.render(element)