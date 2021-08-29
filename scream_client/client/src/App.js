import './App.css';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom'

//components
import NavBar from './components/NavBar'

// pages
import home from './pages/home'
import login from './pages/login'
import signup from './pages/signup'

function App() {
  return (
    <div className="App"> 
      <Router>
        <NavBar />
          <div className="container">
          <Switch>
            <Route exact path='/' component={home} />
            <Route exact path='/login' component={login} />
            <Route exact path='/signup' component={signup} />
          </Switch>
          </div>
      </Router>
    </div>
  );
}

export default App;
