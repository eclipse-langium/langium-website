
function Hello() {
  const [count, setCount] = React.useState(0);

  return (
    <div className="placeholder-wrapper">
     <div className='placeholder'>
      Preview coming soon
     </div>
    </div>
  );
}

ReactDOM.render(React.createElement(Hello), document.getElementById('preview'));