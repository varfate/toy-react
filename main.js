import { createElement, Component, render } from './toy-react.js';

class ChildComponent extends Component {
  render() {
    return (
      <div>
        <h1>Child Component</h1>
      </div>
    );
  }
}

class MyComponent extends Component {
  render() {
    return (
      <div>
        <h1>My Component</h1>
        {this.children}
        <ChildComponent />
      </div>
    );
  }
}

render(
  <MyComponent class='box'>
    <div class='div1'>div1</div>
    <div class="div2">
      <span>div2</span>
      <div>div2 inner</div>
    </div>
  </MyComponent>,
  document.body
);
