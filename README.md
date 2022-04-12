# React-from-scratch

## Attempt to recreate and understand React

## Features

- None at all
- Just one hook
- You can make your own component(s)?
- Support for functional and class-ish components
- Poorly documented yay!

## Usage

1. Basically just as React
2. Babel **required**
3. Babel will transpile JSX will our custom function

```javascript
  const Didact = {
    createElement,
    render,
    useState
  }
```

### Component sample
#### Class based

```javascript
const element = (
  <div>
    <h1>Hello World</h1>
  </div>
);
const container = document.getElementById("root");
Didact.render(element, container);
```

#### Functional

```javascript
function App(){
  return (
    <div>
      <h1>Hello World</h1>
    </div>
  )
}

const element = <App />
const container = document.getElementById("root");
Didact.render(element, container);
```
## Recommendations

1. Just use React or CRA

## Source

[Rodrigo Pombo's **Build your own React**](https://pomb.us/build-your-own-react/)
