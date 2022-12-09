import React, { useEffect, useState } from 'react';
import RPS from './contracts/RPS.json';
import Hasher from './contracts/Hasher.json';
import { getWeb3 } from './utils.js';

const states = ['IDLE', 'CREATED', 'JOINED', 'COMMITED', 'REVEALED'];

const moves = ['Null', 'Rock', 'Paper', 'Scissors', 'Spock', 'Lizard'];
//const gameState = ['Null', 'Created', 'Joined'];
const gameStateENUM = {
  INIT: 0,
  CREATED: 1,
  JOINED: 2
}
///  {(new Date(parseInt(ballot.end) * 1000)).toLocaleString()}

function App() {
  const [web3, setWeb3] = useState(undefined);
  const [accounts, setAccounts] = useState(undefined);
  const [contract, setContract] = useState(undefined);
  const [game, setGame] = useState({state: '0'});
  const [move, setMove] = useState();

  const [gameState, setGameState] = useState(gameStateENUM.INIT);

  const [hasherContract, setHasherContract] = useState(undefined);
  const [rpsContract, setRpsContract] = useState(undefined);
  const [c2, setC2] = useState(0);
  const [lastAction, setLastAction] = useState(0);
  const [stake, setStake] = useState(0);
  const [timeout, setTimeout] = useState(0);
  const [j1, setJ1] = useState(undefined);
  const [j2, setJ2] = useState(undefined);

  const [gameAddress, setGameAddress] = useState(undefined);
  const [timeleft, setTimeleft] = useState(undefined);

  const intervalRef = React.useRef();

  useEffect(() => {
    const init = async () => {
      const web3 = await getWeb3();
      const accounts = await web3.eth.getAccounts();

      var hash = web3.utils.soliditySha3(
        { type: 'bytes32', value: 'ola' });
      
      
      

      const networkId = await web3.eth.net.getId();
      var deployedNetwork = Hasher.networks[networkId];
      const hasherContract = new web3.eth.Contract(
        Hasher.abi,
        deployedNetwork && deployedNetwork.address,
      );

      var deployedNetwork = localStorage.getItem('rps_gameaddress');
      const rpsContract = new web3.eth.Contract(
        RPS.abi,
        deployedNetwork,
      );

      setGameAddress(deployedNetwork);


      setWeb3(web3);
      setAccounts(accounts);

      setHasherContract(hasherContract);
      setRpsContract(rpsContract);
    }
    init();
    window.ethereum.on('accountsChanged', accounts => {
      setAccounts(accounts);
    });
  }, []);

  const isReady = () => {
    return (
      typeof hasherContract !== 'undefined' 
      && typeof web3 !== 'undefined'
      && typeof accounts !== 'undefined'
    );
  };

  const isRPSReady = () => {
    return (
      (typeof rpsContract !== 'undefined' && rpsContract.options.address != null)
      && typeof web3 !== 'undefined'
      && typeof accounts !== 'undefined'
    );
  }

  useEffect(() => {
    if(isReady()) {
      //updateGame();
    }
  }, [accounts, hasherContract, web3]);

  useEffect(() => {
    if(isRPSReady()) {
      updateGame();
    }
  }, [accounts, rpsContract, web3]);

  useEffect( () => {
    function updateTimeleft() {
      
      var start = (new Date(lastAction * 1000));
      var now = new Date();
      var difference = now.getTime() - start.getTime();
      var timeleft = timeout - (difference/1000);
      setTimeleft(timeleft);
      
      updateGame();
    }
    var timer = setInterval(updateTimeleft, 1000);

    return function stopTimer() {
      clearInterval(timer);
    }
      
  }, [c2, lastAction, j1, j2])

  // useEffect(() => {
  //   if(isReady()) {
  //     updateGame();
  //   }
  // }, [c2, lastAction]);

  function getRandomInteger(min, max) {
    return Math.floor(Math.random() * (max - min) ) + min;
  }

  async function createGameTransaction(move, salt, player2, stake) {
    var hash = await hasherContract.methods.hash(move, salt).call();
    var rpsContract = await new web3.eth.Contract(RPS.abi)
      .deploy({ 
          data: RPS.bytecode, 
          arguments: [hash, player2] // Writing you arguments in the array
      })
      .send({ from: accounts[0], value: stake });

    setRpsContract(rpsContract);
    setGameAddress(rpsContract.options.address);
    localStorage.setItem('rps_gameaddress', rpsContract.options.address);
  }

  async function createGame(e) {
    e.preventDefault();

    const participant = e.target.elements[0].value;
    const stake = e.target.elements[1].value;
    const moveId = e.target.elements[2].value;
    //const salt = getRandomInteger(10, 10000000000);
    const salt = e.target.elements[3].value;

    localStorage.setItem('rps_moveId', moveId);
    localStorage.setItem('rps_salt', salt);

    await createGameTransaction(moveId, salt, participant, stake);
    await updateGame();
  }

  async function updateGame() {
    if (!isRPSReady()) return;
    
    var c2 = await rpsContract.methods.c2().call();
    var stake = await rpsContract.methods.stake().call();
    var lastAction = await rpsContract.methods.lastAction().call();
    var timeout = await rpsContract.methods.TIMEOUT().call();
    var j1 = await rpsContract.methods.j1().call();
    var j2 = await rpsContract.methods.j2().call();
    
    //initTimeleft(parseInt(lastAction), parseInt(timeout));
debugger;
    setC2(c2);
    setStake(stake);
    setLastAction(lastAction);
    setTimeout(timeout);
    setJ1(j1);
    setJ2(j2);

    setGameState(gameStateENUM.JOINED);
    
  }

  async function play(e) {
    e.preventDefault();

    const moveId = e.target.elements[0].value;
    //const stake = e.target.elements[1].value;
    
    await rpsContract.methods.play(moveId).send({ from: accounts[0], value: stake });
    await updateGame();
  }

  async function solve(e) {
    //e.preventDefault();

    var moveId = localStorage.getItem('rps_moveId');
    var salt = localStorage.getItem('rps_salt');

    await rpsContract.methods.solve(moveId, salt).send({ from: accounts[0] });
    await updateGame();
  }

  function getGameState() {
    if (c2 == 0 && lastAction == 0)
      return 0;
    if (c2 == 0 && lastAction > 0 && stake > 0)
      return 1;
    if (c2 > 0 && lastAction > 0 && stake > 0)
      return 2;
    if (c2 > 0 && lastAction > 0 && stake == 0)
      return 3;
    if (stake == 0)
      return 4;
  }

  function createGameState() {
    setGameState(gameStateENUM.CREATED);
  }

  function joinGameState(e) {
    e.preventDefault();
    setGameState(gameStateENUM.JOINED);

    const address = e.target.elements[0].value;

    const rpsContract = new web3.eth.Contract(
      RPS.abi,
      address
    );

    setRpsContract(rpsContract);

    localStorage.setItem('rps_gameaddress', address);
    setGameAddress(address);
  }

  function reset() {
    localStorage.removeItem("rps_gameaddress");
    localStorage.removeItem("rps_moveId");
    localStorage.removeItem("rps_salt");
    setGameState(gameStateENUM.INIT);
    setRpsContract(undefined);
    setC2(0);
    setLastAction(0);
    setStake(0);
    setTimeout(0);
    setJ1(undefined);
    setJ2(undefined);
    setGameAddress(undefined);
    setTimeleft(undefined);
  }

  async function jTimeout() {
    debugger;
    if (accounts[0] == j1 && c2 == 0) {
      await rpsContract.methods.j2Timeout().send({ from: accounts[0] });
    } else if (accounts[0] == j2 && c2 > 0) {
      await rpsContract.methods.j1Timeout().send({ from: accounts[0] });
    }   
    await updateGame(); 
  }

  function initTimeleft(lastAction, timeout) {
    if (!intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setTimeleft(0);

    intervalRef.current = setInterval(async () => {
      var start = (new Date(lastAction * 1000));
      var now = new Date();
      var difference = now.getTime() - start.getTime();
      var timeleft = timeout - (difference/1000);
      //var timeleft = new Date(myEndDateTime - durationInMinutes * MS_PER_MINUTE)
      setTimeleft(timeleft);

      //if (timeleft < 0) {
        //await jTimeout();
      //}
    }, 1000)
    
  }

  if(typeof game.state === 'undefined') {
    return <div>Loading...</div>;
  }

  return (
    <div className="container">
      <h1 className="text-center">Rock Paper Scissors</h1>

      {gameState == gameStateENUM.INIT && <>
        <div className="row">
        <div className="col-sm-12">
          <h2>Create Game</h2>
            <button 
              onClick={e => createGameState()}
              type="submit" 
              className="btn btn-primary"
            >
              Submit
            </button>
        </div>
        </div>
        <br />
        <div className="row">
          <div className="col-sm-12">
            <h2>Join Game</h2>
            <form onSubmit={e => joinGameState(e)}>
              <div className="form-group">
                <label htmlFor="participant">Game Address</label>
                <input type="text" className="form-control" id="participant" />
              </div>
              <button type="submit" className="btn btn-primary">Submit</button>
            </form>
          </div>
        </div>
      </>}

      {gameState == gameStateENUM.CREATED && <>
      
        <p>
          Game Address: {gameAddress == undefined ? 'Not created' : gameAddress}
          <div>Please give the above address to player 2 so they can join the game</div>
        </p>
        
        <p><span>State: </span> 
          {getGameState() == 0 && 'Create Game'}
          {getGameState() == 1 && 'Waiting for player 2 to play'}
          {getGameState() == 2 && 'Waiting for player 1 to solve'}
          {getGameState() == 3 && 'Game over'}
        </p>
        <p>Stake: {stake} wei</p>

        {getGameState() == 0 && <>
          <form onSubmit={e => createGame(e)}>
            <div className="form-group">
              <label>Participant</label>
              <input type="text" className="form-control" id="participant" />
            </div>
            <div className="form-group">
              <label>Bet/Stake</label>
              <input type="number" className="form-control" id="bet" />
            </div>
            <div className="form-group">
              <label>Move ID</label>
              <select className="form-control" id="move">
                {moves.map((move, index) => {
                  return <option value={index}>{move}</option>
                })}
                
              </select>
            </div>
            <div className="form-group">
              <label>Salt</label>
              <input type="number" className="form-control" id="salt" />
            </div>
            <button type="submit" className="btn btn-primary">Submit</button>
          </form>
        </>}

      </>}

      {gameState == gameStateENUM.JOINED && <>
        <p>Game Address: {gameAddress}</p>
        <p>J1: {j1}</p>
        <p>J2: {j2}</p>
        <p>Stake: {stake} wei</p>
        <p>lastAction: {(new Date(parseInt(lastAction) * 1000)).toLocaleString()}</p>
        <p>Time left: {timeleft} seconds</p>

        <p><span>State: </span> 
          {getGameState() == 1 && 'Waiting for player 2 to play'}
          {getGameState() == 2 && 'Waiting for player 1 to solve'}
          {getGameState() == 3 && 'Game over - by play'}
          {getGameState() == 4 && 'Game over - by timeout'}
        </p>

        {(getGameState() == 1 || getGameState() == 2) && <>
          {timeleft < 0 && <>
            {accounts[0] == j1 && c2 == 0 && <>
              <div className="row">
                <div className="col-sm-12">
                  <h2>Timeout - take back the funds from j2</h2>
                    <button 
                      onClick={e => jTimeout()}
                      type="submit" 
                      className="btn btn-primary"
                    >
                      Submit
                    </button>
                </div>
              </div>
            </>}
            {accounts[0] == j2 && c2 > 0 && <>
              <div className="row">
                <div className="col-sm-12">
                  <h2>Timeout - take back the funds from j1</h2>
                    <button 
                      onClick={e => jTimeout()}
                      type="submit" 
                      className="btn btn-primary"
                    >
                      Submit
                    </button>
                </div>
              </div>
            </>}
            
          </>}
        </>}

        {j1 == accounts[0] && <>
          {getGameState() == 2 && <>
            <div className="row">
              <div className="col-sm-12">
                <h2>Solve Game</h2>
                  <button 
                    onClick={e => solve()}
                    type="submit" 
                    className="btn btn-primary"
                  >
                    Submit
                  </button>
              </div>
            </div>

          </>}
        </>}
        
        {j2 == accounts[0] && <>
          {getGameState() == 1 && <>
            <div className="row">
              <div className="col-sm-12">
                <h2>Play</h2>
                <form onSubmit={e => play(e)}>
                  <div className="form-group">
                    <label>Move ID</label>
                    <select className="form-control" id="move">
                      {moves.map((move, index) => {
                        return <option value={index}>{move}</option>
                      })}
                      
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary">Submit</button>
                </form>
              </div>
            </div>
          </>}
          
        </>}

        {(getGameState() == 3 || getGameState() == 4) && <>
          <div className="row">
              <div className="col-sm-12">
                <h2>Reset Game</h2>
                  <button 
                    onClick={e => reset()}
                    type="submit" 
                    className="btn btn-primary"
                  >
                    Submit
                  </button>
              </div>
            </div>
        </>}
        
        
      </>}
      

    </div>
  );
}

export default App;
