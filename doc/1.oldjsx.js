const babel = require('@babel/core')

let sourceCode = (
  <div>
    hello <span style={{ color: 'red' }}>world</span>
  </div>
)


const result = babel.transform(sourceCode, {
  plugins: [
    ['@babel/plugin-transform-react-jsx',
    { runtime: 'classic' }] // 'classsic' 或者 ‘automatic’
  ]
})
